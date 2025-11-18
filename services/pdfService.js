const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const qrService = require('./qrService');
const { getFileUrl } = require('../config/multerConfig');

/**
 * Convert image URL to buffer
 */
async function fetchImageAsBuffer(imageUrl) {
  try {
    if (!imageUrl) return null;
    
    // If it's a data URL, convert directly
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }
    
    // Fetch from URL
    // No timeout - allow slow networks to fetch images (important for PDF generation)
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 0 // No timeout - allow slow networks
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('[PDF Service] Error fetching image:', imageUrl, error.message);
    return null;
  }
}

/**
 * Generate QR code data URL for PDF
 */
async function generateQRCodeForPDF(registration) {
  try {
    const qrDataURL = await qrService.generateQrDataURL(registration);
    if (!qrDataURL) return null;
    
    // Convert data URL to buffer
    if (qrDataURL.startsWith('data:')) {
      const base64Data = qrDataURL.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }
    
    // If it's a URL, fetch it
    return await fetchImageAsBuffer(qrDataURL);
  } catch (error) {
    console.error('[PDF Service] Error generating QR code:', error.message);
    return null;
  }
}

/**
 * Format date/time for display
 */
function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Resolve profile image URL
 */
function resolveProfileImageUrl(registration, member, baseUrl) {
  if (!registration && !member) return null;
  
  const candidates = [
    registration?.rawPhotoData,
    member?.profileImageURL,
    member?.profileImage,
    registration?.profileImageURL,
    registration?.profileImage,
    registration?.photoUrl,
    registration?.photo,
    member?.photoUrl,
    member?.photo
  ];
  
  for (const candidate of candidates) {
    if (!candidate) continue;
    
    if (typeof candidate === 'string') {
      if (candidate.startsWith('data:') || candidate.startsWith('http://') || candidate.startsWith('https://')) {
        return candidate;
      }
      // Try to resolve using getFileUrl
      return getFileUrl(candidate, baseUrl, 'profile-images');
    }
  }
  
  return null;
}

/**
 * Generate visitor pass PDF
 * @param {Object} registration - Registration object
 * @param {Object} event - Event object
 * @param {Object} member - Member object
 * @param {string} baseUrl - Base URL for image resolution
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateVisitorPassPDF(registration, event, member, baseUrl = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 60
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      const pageWidth = 595.28; // A4 width in points
      const marginX = 60;
      let cursorY = 72;
      
      // Logo - try multiple possible locations
      try {
        const possibleLogoPaths = [
          path.join(process.cwd(), 'public', 'mandapam-logo.png'),
          path.join(process.cwd(), 'mandapam-logo.png'),
          path.join(__dirname, '..', 'public', 'mandapam-logo.png'),
          path.join(__dirname, '..', '..', 'Mandap-Web-Frontend', 'public', 'mandapam-logo.png')
        ];
        
        let logoAdded = false;
        for (const logoPath of possibleLogoPaths) {
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, (pageWidth - 150) / 2, cursorY, { width: 150, height: 66 });
            cursorY += 66 + 28;
            logoAdded = true;
            break;
          }
        }
        
        if (!logoAdded) {
          console.warn('[PDF Service] Logo not found in any expected location, skipping');
        }
      } catch (logoError) {
        console.warn('[PDF Service] Error adding logo, skipping:', logoError.message);
      }
      
      // Event Title
      const eventTitle = event?.title || event?.name || 'Mandapam Event';
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text(eventTitle, { align: 'center', y: cursorY });
      cursorY += 30;
      
      // Visitor Pass Label
      doc.fontSize(16)
         .fillColor('#2563eb')
         .text('VISITOR PASS', { align: 'center', y: cursorY });
      cursorY += 24;
      
      // Profile Image
      const profileImageUrl = resolveProfileImageUrl(registration, member, baseUrl);
      if (profileImageUrl) {
        try {
          const profileBuffer = await fetchImageAsBuffer(profileImageUrl);
          if (profileBuffer) {
            const photoSize = 132;
            const photoX = (pageWidth - photoSize) / 2;
            doc.image(profileBuffer, photoX, cursorY, { width: photoSize, height: photoSize, fit: [photoSize, photoSize] });
            cursorY += photoSize + 26;
          }
        } catch (imgError) {
          console.warn('[PDF Service] Failed to add profile image:', imgError.message);
          cursorY += 16;
        }
      } else {
        cursorY += 16;
      }
      
      // Member Name
      const displayName = member?.name || registration?.memberName || registration?.name || 'Guest';
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text(displayName, { align: 'center', y: cursorY });
      cursorY += 32;
      
      // Divider
      doc.moveTo(marginX, cursorY)
         .lineTo(pageWidth - marginX, cursorY)
         .strokeColor('#e5e7eb')
         .lineWidth(1)
         .stroke();
      cursorY += 22;
      
      // Registration Details
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#374151');
      
      const registrationId = registration?.id || registration?.registrationId || '—';
      const paymentStatus = (registration?.paymentStatus || 'Paid').toString();
      const amountPaid = parseFloat(registration?.amountPaid ?? 0);
      const amountValue = isFinite(amountPaid) ? amountPaid.toFixed(2) : '0.00';
      const registeredOn = formatDateTime(registration?.registeredAt);
      
      doc.text(`Registration ID: ${registrationId}`, marginX, cursorY);
      doc.text(`Payment Status: ${paymentStatus}`, { align: 'right', x: pageWidth - marginX, y: cursorY });
      cursorY += 18;
      
      doc.text(`Amount Paid: Rs. ${amountValue}`, marginX, cursorY);
      doc.text(`Registered On: ${registeredOn}`, { align: 'right', x: pageWidth - marginX, y: cursorY });
      cursorY += 22;
      
      // QR Code
      const qrBuffer = await generateQRCodeForPDF(registration);
      if (qrBuffer) {
        try {
          const qrSize = 168;
          const qrX = (pageWidth - qrSize) / 2;
          doc.image(qrBuffer, qrX, cursorY, { width: qrSize, height: qrSize });
          cursorY += qrSize + 30;
        } catch (qrError) {
          console.warn('[PDF Service] Failed to add QR code:', qrError.message);
        }
      }
      
      // Important Instructions
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Important Instructions', { align: 'center', y: cursorY });
      cursorY += 18;
      
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#4b5563');
      
      const instructions = [
        'Carry a valid photo ID along with this pass to the venue.',
        'Present this QR code at the entry gate for verification.',
        'Arrive at least 15 minutes before the event start time.',
        'Do not share this pass with others; it is non-transferable.',
        'For assistance, contact the Mandapam helpdesk at +91-98765-43210.'
      ];
      
      instructions.forEach((item) => {
        doc.text(`• ${item}`, marginX, cursorY, {
          width: pageWidth - marginX * 2,
          align: 'left'
        });
        cursorY += 18;
      });
      
      cursorY += 18;
      
      // Footer Divider
      doc.moveTo(marginX, cursorY)
         .lineTo(pageWidth - marginX, cursorY)
         .strokeColor('#e5e7eb')
         .lineWidth(1)
         .stroke();
      cursorY += 22;
      
      // Footer Text
      doc.fontSize(11)
         .fillColor('#6b7280')
         .text('Thank you for registering with the Mandapam Event Team.', {
           align: 'center',
           y: cursorY
         });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF and save to temporary file
 * @returns {Promise<{filePath: string, buffer: Buffer}>}
 */
async function generateAndSavePDF(registration, event, member, baseUrl) {
  const pdfBuffer = await generateVisitorPassPDF(registration, event, member, baseUrl);
  
  // Save to temporary file
  const pdfsDir = path.join(process.cwd(), 'uploads', 'pdfs');
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }
  
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const registrationId = registration?.id || registration?.registrationId || 'unknown';
  const fileName = `mandapam-visitor-pass-${registrationId}-${uniqueSuffix}.pdf`;
  const filePath = path.join(pdfsDir, fileName);
  
  fs.writeFileSync(filePath, pdfBuffer);
  
  return { filePath, buffer: pdfBuffer, fileName };
}

/**
 * Delete PDF file
 */
function deletePDFFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[PDF Service] PDF file deleted:', filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PDF Service] Error deleting PDF file:', error.message);
    return false;
  }
}

module.exports = {
  generateVisitorPassPDF,
  generateAndSavePDF,
  deletePDFFile
};

