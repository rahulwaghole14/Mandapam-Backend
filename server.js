const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import database configuration
const { sequelize, testConnection, syncDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bodRoutes = require('./routes/bodRoutes');
const memberRoutes = require('./routes/memberRoutes');
const associationRoutes = require('./routes/associationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const memberImportRoutes = require('./routes/memberImportRoutes');

// Import mobile routes
const mobileAuthRoutes = require('./routes/mobileAuthRoutes');
const mobileMemberRoutes = require('./routes/mobileMemberRoutes');
const mobileEventRoutes = require('./routes/mobileEventRoutes');
const mobileAssociationRoutes = require('./routes/mobileAssociationRoutes');
const mobileUploadRoutes = require('./routes/mobileUploadRoutes');
const mobileAppUpdateRoutes = require('./routes/mobileAppUpdateRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:3001', 
  'http://localhost:8080',
  'http://localhost:8081', 
  'http://localhost:8082',
  'http://localhost:5173', // Vite default
  'http://localhost:4200', // Angular default
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:5173',
  // Add your Render frontend URL here when deployed
  'https://mandap-web-frontend.onrender.com',
  // Common frontend hosting domains
  'https://mandap-ui-all-modals-web.vercel.app',
  'https://mandap-ui-all-modals-web.netlify.app',
  'https://mandap-ui-all-modals-web.onrender.com',
  // Production domain
  'https://mandapassociation.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Log all incoming origins for debugging
    console.log('CORS request from origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      // For development, be more permissive
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('⚠️ CORS allowing unknown origin in development:', origin);
        callback(null, true);
      } else {
        console.log('❌ CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads with CORS headers
const uploadsPath = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('Created uploads directory:', uploadsPath);
}

app.use('/uploads', (req, res, next) => {
  // CORS headers for static files
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}, express.static(uploadsPath, {
  // Add error handling for missing files
  fallthrough: false,
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  }
}));

// Debug route for uploads
app.get('/uploads/*', (req, res) => {
  const filePath = path.join(uploadsPath, req.params[0]);
  console.log('Requested file:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  console.log('Uploads directory exists:', fs.existsSync(uploadsPath));
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'File not found',
      message: `File ${req.params[0]} not found in uploads directory`,
      uploadsPath: uploadsPath,
      requestedPath: filePath
    });
  }
  
  res.sendFile(filePath);
});

// Debug route to list uploads directory contents
app.get('/debug/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsPath);
    res.json({
      uploadsPath: uploadsPath,
      files: files,
      count: files.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read uploads directory',
      message: error.message,
      uploadsPath: uploadsPath
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Mandap Association Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Mandap Association Platform API',
    version: '1.0.0',
    documentation: '/api',
    health: '/health',
          endpoints: {
        auth: '/api/auth',
        vendors: '/api/vendors',
        events: '/api/events',
        bod: '/api/bod',
        members: '/api/members',
        associations: '/api/associations',
        upload: '/api/upload',
        dashboard: '/api/dashboard',
        mobile: '/api/mobile'
      }
  });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    title: 'Mandap Association Platform API Documentation',
    version: '1.0.0',
    description: 'Complete API documentation for the Mandap Association Platform',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      authentication: {
        base: '/api/auth',
        routes: {
          'POST /login': 'User login',
          'POST /logout': 'User logout',
          'POST /init-admin': 'Create initial admin user (development only)',
          'GET /profile': 'Get user profile (protected)',
          'PUT /profile': 'Update user profile (protected)',
          'PUT /password': 'Change password (protected)',
          'GET /users': 'Get all users (admin only)',
          'POST /users': 'Create new user (admin only)',
          'GET /users/:id': 'Get user by ID (admin only)',
          'PUT /users/:id': 'Update user (admin only)',
          'DELETE /users/:id': 'Delete user (admin only)'
        }
      },
      vendors: {
        base: '/api/vendors',
        routes: {
          'GET /': 'Get all vendors with filtering and pagination',
          'GET /:id': 'Get vendor by ID',
          'POST /': 'Create new vendor (protected)',
          'PUT /:id': 'Update vendor (protected)',
          'DELETE /:id': 'Delete vendor (protected)',
          'GET /stats': 'Get vendor statistics (protected)',
          'POST /:id/verify': 'Verify vendor (admin only)'
        }
      },
      events: {
        base: '/api/events',
        routes: {
          'GET /': 'Get all events with filtering and pagination',
          'GET /:id': 'Get event by ID',
          'POST /': 'Create new event (protected)',
          'PUT /:id': 'Update event (protected)',
          'DELETE /:id': 'Delete event (protected)',
          'GET /upcoming': 'Get upcoming events',
          'GET /stats': 'Get event statistics (protected)',
          'PUT /:id/status': 'Update event status (protected)'
        }
      },
      members: {
        base: '/api/members',
        routes: {
          'GET /': 'Get all members with filtering and pagination',
          'GET /:id': 'Get member by ID',
          'POST /': 'Create new member (protected)',
          'PUT /:id': 'Update member (protected)',
          'DELETE /:id': 'Delete member (protected)',
          'GET /stats': 'Get member statistics (protected)'
        }
      },
      associations: {
        base: '/api/associations',
        routes: {
          'GET /': 'Get all associations with filtering and pagination',
          'GET /:id': 'Get association by ID',
          'POST /': 'Create new association (protected)',
          'PUT /:id': 'Update association (protected)',
          'DELETE /:id': 'Delete association (protected)',
          'GET /stats': 'Get association statistics (protected)'
        }
      },
      bod: {
        base: '/api/bod',
        routes: {
          'GET /': 'Get board of directors',
          'GET /:id': 'Get BOD member by ID',
          'POST /': 'Add BOD member (admin only)',
          'PUT /:id': 'Update BOD member (admin only)',
          'DELETE /:id': 'Remove BOD member (admin only)'
        }
      },
      upload: {
        base: '/api/upload',
        routes: {
          'POST /': 'Upload file (protected)',
          'DELETE /:filename': 'Delete file (protected)'
        }
      },
      mobile: {
        base: '/api/mobile',
        description: 'Mobile app specific APIs',
        routes: {
          authentication: {
            'POST /send-otp': 'Send OTP to mobile number',
            'POST /verify-otp': 'Verify OTP and login',
            'POST /register': 'Register new member',
            'POST /logout': 'Logout user',
            'GET /profile': 'Get user profile (protected)',
            'PUT /profile': 'Update user profile (protected)'
          },
          members: {
            'GET /members': 'Get all members with pagination',
            'GET /members/:id': 'Get specific member details',
            'GET /members/search': 'Search members',
            'GET /members/filter': 'Filter members by criteria'
          },
          events: {
            'GET /events': 'Get all events',
            'GET /events/:id': 'Get specific event details',
            'GET /events/upcoming': 'Get upcoming events',
            'GET /events/search': 'Search events',
            'GET /events/stats': 'Get event statistics'
          },
          associations: {
            'GET /associations': 'Get all associations',
            'GET /associations/:id': 'Get specific association details',
            'GET /associations/search': 'Search associations',
            'GET /associations/stats': 'Get association statistics'
          },
          bod: {
            'GET /bod': 'Get board of directors',
            'GET /bod/:id': 'Get specific BOD member details',
            'GET /bod/designation/:designation': 'Get BOD by designation'
          },
          upload: {
            'POST /upload/profile-image': 'Upload profile image',
            'POST /upload/images': 'Upload multiple images',
            'GET /upload/:filename': 'Get file info',
            'DELETE /upload/:filename': 'Delete uploaded file'
          }
        }
      }
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      note: 'Include token in Authorization header for protected routes'
    },
    rateLimiting: {
      window: '15 minutes',
      maxRequests: '100 requests per IP'
    }
  });
});

// API Routes (Web Frontend)
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bod', bodRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/members', memberImportRoutes);
app.use('/api/associations', associationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Mobile API Routes
app.use('/api/mobile', mobileAuthRoutes);
app.use('/api/mobile', mobileMemberRoutes);
app.use('/api/mobile', mobileEventRoutes);
app.use('/api/mobile', mobileAssociationRoutes);
app.use('/api/mobile', mobileUploadRoutes);
app.use('/api/mobile', mobileAppUpdateRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

// PostgreSQL connection
const connectDB = async () => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      // Sync database (create tables if they don't exist)
      await syncDatabase(false); // Set to true to force recreate tables
    } else {
      throw new Error('Failed to connect to PostgreSQL');
    }
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});

startServer();

