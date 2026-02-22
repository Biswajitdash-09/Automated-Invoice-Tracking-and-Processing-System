# Invoice Tracker

A comprehensive, role-based invoice management system built with Next.js, featuring multi-user workflows, document management, and analytics tracking.

## Overview

Invoice Tracker is a full-stack application that manages the lifecycle of invoices from submission through approval and payment. It implements a robust Role-Based Access Control (RBAC) system with four distinct user roles, each with specific permissions and responsibilities in the invoice workflow.

## Features

### Multi-Role Workflow
- **Admin:** Full system access, user management, configuration, rate cards
- **Finance User:** HIL review, final approvals, payment releases, analytics management
- **Project Manager:** Invoice validation, PM-level approvals, project assignment
- **Vendor:** Invoice submission, viewing own invoices, rate card access

### Invoice Management
- Invoice submission and tracking
- Multi-stage approval workflow (PM → Finance)
- Document attachment and preview
- OCR-based invoice parsing
- Export functionality (Excel/PDF)

### Security & Authentication
- JWT-based authentication
- OTP-based login system
- Password reset functionality
- User hierarchy support (Admin → Finance → PM → Vendor)
- Delegation support for temporary role elevation

### Analytics & Reporting
- Invoice analytics dashboard
- Performance metrics tracking
- Rejection rate monitoring
- Payment timeliness tracking

### Additional Features
- Rate card management
- Payment workflows
- Email notifications and reminders
- Audit logging
- System health checks

## Tech Stack

### Core Framework
- **Next.js 15.1.7** - React framework with server-side rendering
- **React 19.0.0** - UI framework
- **Node.js** - Runtime environment

### Database & ORM
- **MongoDB 8.10.1** - Primary database
- **Mongoose 8.10.1** - ODM with schema validation

### Authentication & Security
- **jose 6.1.3** - JWT token handling
- **bcryptjs 3.0.3** - Password hashing

### UI Framework
- **Tailwind CSS 4** - CSS framework
- **DaisyUI 5.0.0** - Component library
- **Lucide React 0.525.0** - Icon set
- **Sonner 2.0.7** - Toast notifications
- **Framer Motion 12.4.2** - Animations

### Data Processing
- **Tesseract.js 7.0.0** - OCR for invoice parsing
- **Mindee 5.0.0-alpha2** - Document processing API
- **pdf-parse 2.4.5** - PDF extraction
- **mammoth 1.11.0** - Word document processing
- **exceljs 4.4.0** - Excel manipulation
- **xlsx 0.18.5** - Spreadsheet handling

### Utilities
- **axios 1.13.4** - HTTP client
- **date-fns 4.1.0** - Date/time manipulation
- **recharts 2.15.1** - Charting library
- **uuid 11.0.0** - UUID generation

### Development
- **jest 30.2.0** - Testing framework
- **eslint 9.39.3** - Code linting

## Installation

### Prerequisites
- Node.js 18+ 
- MongoDB 6+ (running locally or via connection string)

### Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd "Invoice Tracker"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see Configuration section)

4. Start MongoDB:
```bash
# If using local MongoDB
mongod
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/invoice-tracker
# Or use MongoDB Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/invoice-tracker

# Application
NODE_ENV=development
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d

# OTP Configuration
OTP_SECRET=your-otp-secret-key
OTP_DIGITS=6
OTP_EXPIRY=300 # 5 minutes in seconds

# File Upload Configuration
MAX_FILE_SIZE=10485760 # 10MB in bytes
ALLOWED_FILE_TYPES=.pdf,.jpg,.jpeg,.png,.xlsx,.xls

# Application URL (for callbacks)
APP_URL=http://localhost:3000

# Optional: Mindee API for document processing
MINDEE_API_KEY=your-mindee-api-key
```

## Running the Application

### Development Mode
```bash
npm run dev
```
The application will be available at `http://localhost:3000`

### Clean Development (rebuild cache)
```bash
npm run dev:clean
```

### Production Build
```bash
npm run build
npm start
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Database Seeding

Create initial admin user:
```bash
node scripts/create-admin.js
```

Seed test users:
```bash
npm run seed
```

Clean database (development only):
```bash
node scripts/clean-database.js
```

## Project Structure

```
Invoice Tracker/
├── app/                         # Next.js app directory
│   ├── admin/                   # Admin UI pages
│   ├── analytics/               # Analytics dashboard
│   ├── finance/                 # Finance user pages
│   │   ├── approvals/           # Invoice approval queue
│   │   ├── dashboard/           # Finance dashboard
│   │   ├── hil-review/          # HIL invoice review
│   │   ├── manual-entry/        # Manual invoice entry
│   │   └── rate-cards/          # Rate card management
│   ├── pm/                      # Project Manager pages
│   ├── vendors/                 # Vendor pages
│   └── api/                     # API routes
│       ├── admin/               # Admin endpoints
│       ├── finance/             # Finance endpoints
│       ├── pm/                  # PM endpoints
│       ├── vendors/             # Vendor endpoints
│       ├── auth/                # Authentication endpoints
│       ├── documents/           # File upload/download
│       └── invoices/            # Invoice CRUD operations
├── components/                  # React components
│   ├── Analytics/               # Analytics components
│   ├── Approvals/               # Approval workflow components
│   ├── Dashboard/               # Dashboard views (role-specific)
│   ├── Layout/                  # Layout components
│   └── ui/                      # UI components
├── lib/                         # Utility libraries
│   ├── db.js                    # Database connection
│   ├── rbac.js                  # Role-based access control
│   └── services/                # Business logic services
├── models/                      # Mongoose schemas
│   ├── User.js                  # User model
│   ├── Vendor.js                # Vendor model
│   └── Invoice.js               # Invoice model
├── constants/                   # Constants and enums
│   └── roles.js                 # Role definitions
├── public/                      # Static files
├── scripts/                     # Utility scripts
├── __tests__/                   # Test files
├── .env                         # Environment variables
├── package.json                 # Dependencies
├── next.config.mjs             # Next.js configuration
└── README.md                    # This file
```

## User Roles and Permissions

### Admin
- **Access Level:** Full system access
- **Key Permissions:**
  - User management (create/edit/delete users)
  - Configure system settings
  - Manage rate cards
  - View all audit logs
  - Invoice backup/restore
  - View all invoices and analytics
- **Pages accessible:** `/admin/*`

### Finance User
- **Access Level:** Invoice processing and analytics
- **Key Permissions:**
  - HIL (High Invoice Limit) review
  - Process discrepancies
  - Manual invoice entry
  - Final approval/rejection
  - Payment release
  - Upload supporting documents
  - View analytics dashboard
- **Pages accessible:** `/finance/*`, `/analytics`

### Project Manager
- **Access Level:** Project-scoped invoice management
- **Key Permissions:**
  - Approve/reject assigned invoices
  - Upload project documents
  - Send messages to vendors
  - View project analytics
  - Validate timesheets
  - Manage project assignments
- **Pages accessible:** `/pm/*`

### Vendor
- **Access Level:** Invoice submission only
- **Key Permissions:**
  - Submit new invoices
  - View own invoices only
  - Access rate cards
  - Receive messages from PMs
- **Pages accessible:** `/vendor/*`

## Invoice Workflow

```
1. VENDOR submits invoice
   ↓
2. Invoice enters system with status: 'PENDING_PM'
   ↓
3. PROJECT MANAGER reviews and approves
   ↓
4. Invoice status: 'PENDING_FINANCE'
   ↓
5. FINANCE USER performs HIL review
   ↓
6. Finance user provides final approval
   ↓
7. Invoice status: 'APPROVED'
   ↓
8. Payment released
   ↓
9. Invoice status: 'PAID'
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with OTP
- `POST /api/auth/otp/request` - Request OTP for login
- `POST /api/auth/otp/verify` - Verify OTP and get JWT
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/password/reset` - Reset password

### Invoices
- `GET /api/invoices` - List invoices (filtered by role)
- `GET /api/invoices/:id` - Get specific invoice
- `POST /api/invoices` - Create new invoice (Vendor)
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/:id/workflow` - Get workflow state
- `POST /api/invoices/export` - Export invoices

### Documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id/file` - Download document
- `GET /api/documents/:id/preview` - Preview document
- `POST /api/ocr` - OCR document processing

### Role-specific Approvals
- `POST /api/pm/approve/:id` - PM approve invoice
- `POST /api/finance/approve/:id` - Finance approve invoice

### Admin
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/projects` - List projects
- `GET /api/admin/ratecards` - List rate cards
- `POST /api/admin/ratecards` - Create rate card

### Health & Diagnostics
- `GET /api/health` - Health check
- `GET /api/version` - Version info
- `GET /api/debug/seed` - Seed test data

## Security Features

### Headers
- Strict-Transport-Security
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Content-Security-Policy

### Authentication Flow
1. User requests OTP via `/api/auth/otp/request`
2. User receives OTP via email/SMS (toggleable)
3. User submits OTP via `/api/auth/otp/verify`
4. System validates OTP and returns JWT
5. JWT included in Authorization header for subsequent requests

### RBAC Implementation
- Centralized in [`lib/rbac.js`](lib/rbac.js)
- Field-level access control
- Route-level permission checks
- Action-based authorization
- Role normalization for flexibility

## Performance Optimizations

- **Caching:**
  - Static assets: 1 year cache
  - API responses: No cache (data freshness priority)
  - HTML pages: No cache (prevent stale UI)
  
- **Compression:** Gzip enabled for all responses

- **ETags:** Enabled for cache validation

- **Database Indexes:**
  - Users: email, role+isActive, managedBy
  - Vendors: status, linkedUserId
  - Invoices: status, project, vendor

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/lib/rbac.test.js
```

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env`
- Verify MongoDB is accessible on the specified port

**File Upload Fails**
- Check `MAX_FILE_SIZE` in config
- Verify file type is in `ALLOWED_FILE_TYPES`
- Ensure uploads directory has write permissions

**OTP Not Working**
- Verify `OTP_SECRET` is set
- Check `OTP_EXPIRY` is reasonable
- Ensure user email is configured for OTP delivery

**Build Errors**
- Run `npm run dev:clean` for fresh build
- Check Node.js version (18+ required)
- Clear `.next` directory manually if needed

## Contributing

When contributing to Invoice Tracker:

1. Follow the existing code structure
2. Use RBAC functions in [`lib/rbac.js`](lib/rbac.js) for all authorization
3. Add tests for new functionality
4. Update documentation for new features
5. Follow ESLint rules

## License

Proprietary - Internal use only

## Support

For issues or questions, contact the development team or check the project repository issue tracker.