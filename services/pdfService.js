const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const qrService = require('./qrService');
const { getFileUrl } = require('../config/multerConfig');

// Font paths for Devanagari (Marathi, Hindi) support
// Using Mukta fonts - more stable with pdfkit/fontkit than Noto Sans Devanagari
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const DEVANAGARI_REGULAR = path.join(FONTS_DIR, 'Mukta-Regular.ttf');
const DEVANAGARI_BOLD = path.join(FONTS_DIR, 'Mukta-Bold.ttf');

/**
 * Check if text contains Devanagari characters (used for Marathi, Hindi, etc.)
 */
function containsDevanagari(text) {
  if (!text) return false;
  // Devanagari Unicode range: U+0900 to U+097F
  return /[\u0900-\u097F]/.test(text);
}

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
 * Crop image to square (center crop) - matches frontend cropImageToSquare logic
 */
async function cropImageToSquare(imageBuffer, size = 132) {
  try {
    if (!imageBuffer) return null;
    
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    const width = metadata.width;
    const height = metadata.height;
    
    // Calculate square crop (center crop)
    const minDimension = Math.min(width, height);
    const left = Math.floor((width - minDimension) / 2);
    const top = Math.floor((height - minDimension) / 2);
    
    // Crop to square, then resize to target size
    const croppedBuffer = await image
      .extract({ left, top, width: minDimension, height: minDimension })
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();
    
    return croppedBuffer;
  } catch (error) {
    console.error('[PDF Service] Error cropping image to square:', error.message);
    // Return original buffer if cropping fails
    return imageBuffer;
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
 * Generate visitor pass PDF as a buffer (stream-based internally, no temp files)
 * @param {Object} registration - Registration object
 * @param {Object} event - Event object
 * @param {Object} member - Member object
 * @param {string} baseUrl - Base URL for image resolution
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateVisitorPassPDF(registration, event, member, baseUrl = '') {
  return new Promise(async (resolve, reject) => {
    try {
      // A4 size: 595.28 x 841.89 points (8.27 x 11.69 inches)
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0, // We'll handle margins manually for precise control
        autoFirstPage: true
      });
      
      // Register Devanagari fonts if they exist (for Marathi/Hindi support)
      const hasDevanagariRegular = fs.existsSync(DEVANAGARI_REGULAR);
      const hasDevanagariBold = fs.existsSync(DEVANAGARI_BOLD);
      
      if (hasDevanagariRegular) {
        doc.registerFont('Devanagari', DEVANAGARI_REGULAR);
        console.log('[PDF Service] Registered Devanagari regular font');
      }
      if (hasDevanagariBold) {
        doc.registerFont('Devanagari-Bold', DEVANAGARI_BOLD);
        console.log('[PDF Service] Registered Devanagari bold font');
      }
      
      // Helper function to select appropriate font based on text content
      const selectFont = (text, isBold = false) => {
        if (containsDevanagari(text)) {
          if (isBold && hasDevanagariBold) return 'Devanagari-Bold';
          if (hasDevanagariRegular) return 'Devanagari';
        }
        return isBold ? 'Helvetica-Bold' : 'Helvetica';
      };
      
      // Collect PDF data into buffer (stream-based internally, no temp files)
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const marginX = 60; // 60 points = ~21mm
      const topMargin = 72; // 72 points = ~25mm
      let cursorY = topMargin;
      
      // Logo - try multiple possible locations (MUST be at top)
      let logoAdded = false;
      try {
        const possibleLogoPaths = [
          path.join(__dirname, '..', '..', 'Mandap-Web-Frontend', 'public', 'mandapam-logo.png'),
          path.join(process.cwd(), 'public', 'mandapam-logo.png'),
          path.join(process.cwd(), 'mandapam-logo.png'),
          path.join(__dirname, '..', 'public', 'mandapam-logo.png'),
          path.join(process.cwd(), '..', 'Mandap-Web-Frontend', 'public', 'mandapam-logo.png')
        ];
        
        for (const logoPath of possibleLogoPaths) {
          if (fs.existsSync(logoPath)) {
            try {
              const logoWidth = 150;
              const logoHeight = 66;
              doc.image(logoPath, (pageWidth - logoWidth) / 2, cursorY, { width: logoWidth, height: logoHeight });
              cursorY += logoHeight + 28; // Space after logo
              logoAdded = true;
              console.log(`[PDF Service] Logo added successfully from: ${logoPath}`);
              break;
            } catch (imgError) {
              console.warn(`[PDF Service] Error loading logo from ${logoPath}:`, imgError.message);
              continue;
            }
          }
        }
        
        if (!logoAdded) {
          console.error('[PDF Service] Logo not found in any expected location. Checked paths:', possibleLogoPaths);
          // Don't skip - add spacing even if logo not found to maintain layout
          cursorY += 94; // Space for logo (66) + margin (28)
        }
      } catch (logoError) {
        console.error('[PDF Service] Error adding logo:', logoError.message);
        // Add spacing even if logo fails
        cursorY += 94;
      }
      
      // Mandapam Title (always show, not event title) - use Devanagari-compatible font
      const mandapamTitle = 'Mandapam';
      doc.fontSize(20)
         .font(selectFont(mandapamTitle, true))
         .fillColor('#111827')
         .text(mandapamTitle, marginX, cursorY, {
           width: pageWidth - marginX * 2,
           align: 'center'
         });
      cursorY += 30;
      
      // Visitor Pass Label
      doc.fontSize(16)
         .fillColor('#2563eb')
         .text('VISITOR PASS', marginX, cursorY, {
           width: pageWidth - marginX * 2,
           align: 'center'
         });
      cursorY += 36; // Increased from 24 to 36
      
      // Profile Image - crop to square like frontend
      const profileImageUrl = resolveProfileImageUrl(registration, member, baseUrl);
      if (profileImageUrl) {
        try {
          const profileBuffer = await fetchImageAsBuffer(profileImageUrl);
          if (profileBuffer) {
            const photoSize = 132;
            // Crop image to square (center crop) - matches frontend behavior
            const croppedBuffer = await cropImageToSquare(profileBuffer, photoSize);
            if (croppedBuffer) {
              const photoX = (pageWidth - photoSize) / 2;
              doc.image(croppedBuffer, photoX, cursorY, { width: photoSize, height: photoSize });
              cursorY += photoSize + 20; // Increased from 12 to 20 (space before name)
            } else {
              // Fallback to original if cropping fails
              const photoX = (pageWidth - photoSize) / 2;
              doc.image(profileBuffer, photoX, cursorY, { width: photoSize, height: photoSize, fit: [photoSize, photoSize] });
              cursorY += photoSize + 20; // Increased from 12 to 20 (space before name)
            }
          }
        } catch (imgError) {
          console.warn('[PDF Service] Failed to add profile image:', imgError.message);
          cursorY += 16;
        }
      } else {
        cursorY += 16;
      }
      
      // Member Name - use Devanagari font if name contains Marathi/Hindi characters
      const displayName = member?.name || registration?.memberName || registration?.name || 'Guest';
      const nameFont = selectFont(displayName, true);
      console.log(`[PDF Service] Rendering name "${displayName}" with font: ${nameFont}`);
      doc.fontSize(18)
         .font(nameFont)
         .fillColor('#111827')
         .text(displayName, marginX, cursorY, {
           width: pageWidth - marginX * 2,
           align: 'center'
         });
      cursorY += 42; // Increased from 32 to 42 (space after name)
      
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
      
      // Left column
      doc.text(`Registration ID: ${registrationId}`, marginX, cursorY);
      // Right column - use align: 'right' with x position
      const paymentStatusText = `Payment Status: ${paymentStatus}`;
      doc.text(paymentStatusText, pageWidth - marginX, cursorY, {
        align: 'right',
        width: pageWidth - marginX * 2
      });
      cursorY += 18;
      
      doc.text(`Amount Paid: Rs. ${amountValue}`, marginX, cursorY);
      const registeredOnText = `Registered On: ${registeredOn}`;
      doc.text(registeredOnText, pageWidth - marginX, cursorY, {
        align: 'right',
        width: pageWidth - marginX * 2
      });
      cursorY += 22;
      
      // QR Code
      const qrBuffer = await generateQRCodeForPDF(registration);
      if (qrBuffer) {
        try {
          const qrSize = 168;
          const qrX = (pageWidth - qrSize) / 2;
          doc.image(qrBuffer, qrX, cursorY, { width: qrSize, height: qrSize });
          cursorY += qrSize + 50; // Increased from 30 to 50
        } catch (qrError) {
          console.warn('[PDF Service] Failed to add QR code:', qrError.message);
        }
      }
      
      // Calculate remaining space to ensure everything fits on one page
      const bottomMargin = 60;
      const maxY = pageHeight - bottomMargin;
      // Estimate instructions height (title + 5 items, each potentially 1-2 lines)
      const estimatedInstructionsHeight = 18 + (5 * 18); // Conservative estimate
      const footerHeight = 22 + 18; // Divider + text
      const totalRemainingHeight = estimatedInstructionsHeight + footerHeight;
      
      // If content would overflow, reduce spacing before instructions
      if (cursorY + totalRemainingHeight > maxY) {
        const overflow = (cursorY + totalRemainingHeight) - maxY;
        cursorY = Math.max(cursorY - overflow - 10, cursorY - 30); // Reduce spacing but don't go too negative
      }
      
      // Important Instructions
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Important Instructions', marginX, cursorY, {
           width: pageWidth - marginX * 2,
           align: 'center'
         });
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
      
      // Instructions - match jsPDF's splitTextToSize behavior
      instructions.forEach((item) => {
        const text = `• ${item}`;
        const maxWidth = pageWidth - marginX * 2;
        
        // Split text to fit width (similar to jsPDF's splitTextToSize)
        // PDFKit doesn't have splitTextToSize, so we manually split
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = doc.widthOfString(testLine);
          
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
            }
            currentLine = word;
          }
        });
        
        if (currentLine) {
          lines.push(currentLine);
        }
        
        // Render each line
        lines.forEach((line) => {
          doc.text(line, marginX, cursorY, {
            width: maxWidth,
            align: 'left'
          });
          cursorY += 18;
        });
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
         .text('Thank you for registering with the Mandapam Event Team.', marginX, cursorY, {
           width: pageWidth - marginX * 2,
           align: 'center'
         });
      
      // End the document to finalize and trigger 'end' event
      // The buffer will be resolved in the 'end' event handler above
      doc.end();
    } catch (error) {
      console.error('[PDF Service] Error in generateVisitorPassPDF:', error);
      console.error('[PDF Service] Error stack:', error.stack);
      reject(error);
    }
  });
}

/**
 * Generate visitor pass PDF as a buffer (alias for generateVisitorPassPDF)
 * @param {Object} registration - Registration object
 * @param {Object} event - Event object
 * @param {Object} member - Member object
 * @param {string} baseUrl - Base URL for image resolution
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateVisitorPassPDFAsBuffer(registration, event, member, baseUrl = '') {
  // generateVisitorPassPDF already returns a buffer
  return await generateVisitorPassPDF(registration, event, member, baseUrl);
}

/**
 * Generate PDF as a buffer (preferred method - no temp files, stream-based internally)
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDFStream(registration, event, member, baseUrl) {
  // Alias for generateVisitorPassPDF - returns buffer (no temp files)
  return await generateVisitorPassPDF(registration, event, member, baseUrl);
}

/**
 * Generate PDF and save to temporary file (DEPRECATED - use generatePDFStream instead)
 * @returns {Promise<{filePath: string, buffer: Buffer}>}
 * @deprecated Use generatePDFStream for better performance and no temp files
 */
async function generateAndSavePDF(registration, event, member, baseUrl) {
  const pdfBuffer = await generateVisitorPassPDFAsBuffer(registration, event, member, baseUrl);
  
  // Save to temporary file (use temp-pdfs directory for consistency)
  const pdfsDir = path.join(process.cwd(), 'uploads', 'temp-pdfs');
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
  generateVisitorPassPDF, // Returns buffer (stream-based internally, no temp files)
  generateVisitorPassPDFAsBuffer, // Alias for generateVisitorPassPDF
  generatePDFStream, // Alias for generateVisitorPassPDF
  generateAndSavePDF, // DEPRECATED - saves to temp file (use generateVisitorPassPDF instead)
  deletePDFFile // Still needed for cleanup of any remaining temp files
};

