# 🏛️ Mandap Association Platform - Backend API

A comprehensive Node.js backend API for the Mandap Association Platform, built with Express.js, MongoDB, and JWT authentication.

## 🚀 Features

- **🔐 JWT Authentication** - Secure user authentication and authorization
- **👥 Role-Based Access Control** - Admin and Sub-admin roles with district-based permissions
- **📊 MongoDB Integration** - Scalable document database with Mongoose ODM
- **🛡️ Security Features** - Input validation, rate limiting, CORS, and Helmet
- **📁 File Upload Support** - Image and document uploads
- **📧 Email & WhatsApp Integration** - Notifications via SMTP and Twilio
- **🔍 Advanced Filtering** - Search, pagination, and sorting for all entities
- **📈 Statistics & Analytics** - Comprehensive data insights and reporting

## 🏗️ Architecture

```
mandap-backend/
├── config/          # Database and configuration
├── controllers/     # Business logic handlers
├── middleware/      # Authentication and validation
├── models/          # MongoDB schemas and models
├── routes/          # API route definitions
├── uploads/         # File storage directory
├── .env             # Environment variables
├── package.json     # Dependencies and scripts
├── server.js        # Main application entry point
└── README.md        # This file
```

## 🛠️ Tech Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: bcryptjs, helmet, cors
- **File Upload**: Multer
- **Notifications**: Nodemailer, Twilio
- **Development**: Nodemon

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd mandap-backend
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/mandapDB

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=24h

# Add other configurations as needed
```

### 3. Start the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Endpoints

### 🔐 Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `POST` | `/api/auth/login` | User login | Public |
| `POST` | `/api/auth/logout` | User logout | Private |
| `GET` | `/api/auth/me` | Get current user | Private |
| `PUT` | `/api/auth/me` | Update profile | Private |
| `PUT` | `/api/auth/change-password` | Change password | Private |
| `GET` | `/api/auth/users` | Get all users | Admin |
| `POST` | `/api/auth/users` | Create user | Admin |
| `PUT` | `/api/auth/users/:id` | Update user | Admin |
| `DELETE` | `/api/auth/users/:id` | Delete user | Admin |

### 🧑‍💼 Vendors

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/api/vendors` | Get all vendors | Private |
| `GET` | `/api/vendors/:id` | Get single vendor | Private |
| `POST` | `/api/vendors` | Create vendor | Private |
| `PUT` | `/api/vendors/:id` | Update vendor | Private |
| `DELETE` | `/api/vendors/:id` | Delete vendor | Admin |
| `GET` | `/api/vendors/stats/overview` | Vendor statistics | Private |
| `PUT` | `/api/vendors/:id/verify` | Verify vendor | Private |

### 📅 Events

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/api/events` | Get all events | Private |
| `GET` | `/api/events/:id` | Get single event | Private |
| `POST` | `/api/events` | Create event | Private |
| `PUT` | `/api/events/:id` | Update event | Private |
| `DELETE` | `/api/events/:id` | Delete event | Private |

### 🏢 Board of Directors (BOD)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/api/bod` | Get all BOD members | Private |
| `GET` | `/api/bod/:id` | Get single BOD member | Private |
| `POST` | `/api/bod` | Create BOD member | Private |
| `PUT` | `/api/bod/:id` | Update BOD member | Private |
| `DELETE` | `/api/bod/:id` | Delete BOD member | Private |

### 👥 Members

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/api/members` | Get all members | Private |
| `GET` | `/api/members/:id` | Get single member | Private |
| `POST` | `/api/members` | Create member | Private |
| `PUT` | `/api/members/:id` | Update member | Private |
| `DELETE` | `/api/members/:id` | Delete member | Private |

### 🏛️ Associations

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/api/associations` | Get all associations | Private |
| `GET` | `/api/associations/:id` | Get single association | Private |
| `POST` | `/api/associations` | Create association | Private |
| `PUT` | `/api/associations/:id` | Update association | Private |
| `DELETE` | `/api/associations/:id` | Delete association | Private |

### 📁 File Upload

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `POST` | `/api/upload/image` | Upload image | Private |
| `POST` | `/api/upload/document` | Upload document | Private |
| `DELETE` | `/api/upload/:filename` | Delete file | Private |

## 🔐 Authentication & Authorization

### JWT Token

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **Admin**: Full access to all resources across all districts
- **Sub-admin**: Restricted access to resources within their assigned district

### Permission System

Each user has granular permissions for different resources:

```javascript
permissions: {
  vendors: { read: true, write: true, delete: false },
  events: { read: true, write: true, delete: false },
  bod: { read: true, write: true, delete: false },
  members: { read: true, write: true, delete: false },
  associations: { read: true, write: false, delete: false }
}
```

## 📊 Database Models

### User Model
- Authentication details (email, password)
- Role and permissions
- District and state information
- Profile data

### Vendor Model
- Business information
- Contact details
- Address and location
- Services and pricing
- Membership status

### Event Model
- Event details and scheduling
- Location information
- Target audience and registration
- Attachments and tags

### BOD Model
- Board member information
- Position and tenure
- Contact details

### Member Model
- Member registration details
- Membership status and expiry
- Contact information

### Association Model
- Branch/district information
- Contact details
- Status and configuration

## 🛡️ Security Features

- **Input Validation**: Express-validator for request validation
- **Rate Limiting**: Configurable rate limiting per IP
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers and protection
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage

## 📁 File Upload

The API supports file uploads for:

- **Images**: Business logos, profile pictures, event photos
- **Documents**: Contracts, certificates, event materials

Files are stored in the `uploads/` directory and served statically.

## 📧 Notifications

### Email Integration
- SMTP configuration for sending emails
- Templates for various notifications
- Membership expiry reminders

### WhatsApp Integration
- Twilio integration for WhatsApp messages
- Automated notifications and alerts

## 🧪 Testing

Run tests using Jest:

```bash
npm test
```

## 📈 Monitoring & Health

### Health Check
```
GET /health
```

Returns server status, environment, and timestamp.

### Error Handling
Comprehensive error handling with:
- Validation errors
- Database errors
- Authentication errors
- File upload errors

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in production.

### Database
- Use MongoDB Atlas for production
- Configure proper indexes for performance
- Set up backup and monitoring

### Security
- Change default JWT secret
- Configure proper CORS origins
- Set up SSL/TLS certificates
- Enable rate limiting

### Performance
- Use PM2 or similar process manager
- Configure proper logging
- Set up monitoring and alerting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added file upload and notifications
- **v1.2.0** - Enhanced security and validation
- **v1.3.0** - Added statistics and analytics

---

**Built with ❤️ for the Mandap Association Platform**






