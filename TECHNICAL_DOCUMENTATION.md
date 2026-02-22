# InvoiceFlow Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Data Models](#data-models)
4. [Authentication & Authorization](#authentication--authorization)
5. [RBAC Implementation](#rbac-implementation)
6. [Workflow State Machine](#workflow-state-machine)
7. [API Endpoints](#api-endpoints)
8. [Database Layer](#database-layer)
9. [Frontend Components](#frontend-components)
10. [Security Features](#security-features)
11. [Configuration](#configuration)
12. [File Structure](#file-structure)

---

## Architecture Overview

InvoiceFlow is a **role-based invoice tracking system** built on Next.js 15 with MongoDB. The application follows a **state machine workflow pattern** for invoice lifecycle management, with granular access control and delegation capabilities.

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard  │  │  Sidebar    │  │ Components  │        │
│  │   Pages     │  │  (UI)       │  │  (UI/Logic) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   /api/*    │  │ RBAC        │  │ Auth        │        │
│  │  (Routes)   │  │ Middleware  │  │ Validation  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Workflow    │  │ Invoice     │  │ Audit       │        │
│  │  Engine     │  │  Ops        │  │  Logger     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   lib/db    │  │ Mongoose    │  │ MongoDB     │        │
│  │  (1,056L)   │  │  Models    │  │  Database   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns
- **State Machine Pattern**: Enforces valid invoice status transitions
- **RBAC Middleware**: Granular permission checking at route and field levels
- **Audit Trail Pattern**: Comprehensive tracking of all state changes
- **Session-based Auth**: JWT tokens with 7-day expiration
- **Delegation Pattern**: Users can delegate approval responsibilities up the hierarchy

---

## Technology Stack

### Core Frameworks
- **Next.js**: 15.1.7 (App router architecture)
- **React**: 19.0.0
- **Node.js**: 20.13.0

### Database & ORM
- **MongoDB**: 8.10.1
- **Mongoose**: 8.10.1 (ODM)

### Authentication & Security
- **jose**: JWT signing/verification (HS256 algorithm)
- Custom OTP-based login system

### UI/UX
- **framer-motion**: React animations
- **Custom Icon component**: FontAwesome-style icon rendering

### Development Tools
- **TypeScript**: Not used (JavaScript project)
- **ESLint**: Configuration present

### Processing Libraries
- **Tesseract.js**: OCR for timesheet validation
- **Mindee**: PDF parsing for rate card validation

---

## Data Models

### User Model (`models/User.js`)

```javascript
{
  id: ObjectId,
  name: String,
  email: String,
  role: Enum['ADMIN', 'PROJECT_MANAGER', 'FINANCE_USER', 'VENDOR'],
  managedBy: ObjectId,  // Parent in hierarchy
  vendorId: ObjectId,   // For vendor role only
  isActive: Boolean,
  createdAt: Date
}
```

**Indexes**: 
- Compound on `{email: 1}`
- Compound on `{managedBy: 1}`
- Compound on `{role: 1}`

---

### Vendor Model (`models/Vendor.js`)

```javascript
{
  id: ObjectId,
  name: String,
  email: String,
  phone: String,
  address: String,
  isActive: Boolean,
  createdAt: Date
}
```

---

### Project Model (`models/Project.js`)

```javascript
{
  id: ObjectId,
  name: String,
  ringiNumber: String,
  description: String,
  status: Enum['ACTIVE', 'COMPLETED', 'ARCHIVED'],
  assignedPMs: [ObjectId],  // Project managers
  vendorIds: [ObjectId],    // Associated vendors
  billingMonth: String,
  createdAt: Date
}
```

**Indexes**: 
- `{assignedPMs: 1}` for PM lookup
- `{status: 1}` for filtering
- `{ringiNumber: 1}` for search

---

### Invoice Model (`models/Invoice.js`)

Core model with comprehensive workflow tracking:

```javascript
{
  id: ObjectId,
  invoiceNumber: String,         // Unique business identifier
  invoiceDate: Date,
  project: ObjectId,             // Reference to Project
  vendor: ObjectId,              // Reference to Vendor
  submittedByUserId: ObjectId,   // User who submitted
  assignedPM: ObjectId,          // Current PM responsible
  assignedFinanceUser: ObjectId, // Finance user assigned
  
  // Workflow State
  status: Enum['Submitted', 'Pending PM Approval', 'PM Approved', 
              'PM Rejected', 'More Info Needed', 
              'Pending Finance Review', 'Finance Approved', 
              'Finance Rejected'],
  
  // PM Approval Section
  pmApproval: {
    approvedBy: ObjectId,
    approvedAt: Date,
    approvedAmount: Decimal128,
    justification: String,
    notes: String
  },
  
  // Finance/HIL Review Section
  hilReview: {
    reviewedBy: ObjectId,
    reviewedAt: Date,
    approvedAmount: Decimal128,
    approvalNotes: String,
    discrepancies: [{
      type: Enum['AMOUNT_MISMATCH', 'MISSING_DOCS', 'TIMESHEET_VALIDATION', 'RATE_CARD_VALIDATION'],
      severity: Enum['LOW', 'MEDIUM', 'HIGH'],
      description: String,
      resolved: Boolean
    }],
    finalRecommendation: Enum['APPROVE', 'REJECT', 'REQUEST_DOCUMENTS']
  },
  
  // Line Items with rate validation
  lineItems: [{
    itemCode: String,
    description: String,
    quantity: Decimal128,
    rate: Decimal128,
    rateCardMatch: Boolean,
    status: Enum['MATCH', 'MISMATCH', 'MANUAL'],
    notes: String
  }],
  
  // Documents (Base64 encoded)
  documents: [{
    fileName: String,
    fileType: String,
    documentType: Enum['RINGI', 'ANNEX', 'TIMESHEET', 'RATE_CARD', 
                     'INVOICE', 'RFP_COMMERCIAL', 'OTHER'],
    fileSize: Number,
    uploadedAt: Date,
    base64Content: String,
    validationDetails: Object
  }],
  
  // Audit Trail (Array of changes)
  auditTrail: [{
    timestamp: Date,
    action: String,
    userId: ObjectId,
    username: String,
    details: String,
    ipAddress: String,
    userAgent: String,
    previousStatus: String,
    newStatus: String
  }],
  
  // Legacy backward compatibility
  AuditTrail: Object,  // Deprecated - migrated to auditTrail array
  
  finalAmount: Decimal128,
  remarks: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{status: 1}` - Queries by workflow stage
- `{assignedPM: 1}` - PM's assigned invoices
- `{assignedFinanceUser: 1}` - Finance user's assigned invoices
- `{submittedByUserId: 1}` - Vendor's invoices
- `{project: 1}` - Project-based filtering
- `{pmApproval.approvedBy: 1}` PM's approvals
- `{hilReview.reviewedBy: 1}` Finance reviews
- Text index on `invoiceNumber` - Search

---

### DocumentUpload Model (`models/DocumentUpload.js`)

```javascript
{
  id: ObjectId,
  projectId: ObjectId,
  invoiceId: ObjectId,
  uploadedBy: ObjectId,
  fileName: String,
  fileType: String,
  fileSize: Number,
  type: Enum['RINGI', 'ANNEX', 'TIMESHEET', 'RATE_CARD', 'INVOICE', 
            'RFP_COMMERCIAL', 'OTHER'],
  status: Enum['PENDING', 'VALIDATED', 'REJECTED'],
  base64Content: String,
  uploadedAt: Date,
  validationDetails: {
    isValid: Boolean,
    errors: [String],
    warnings: [String],
    billingMonth: String,
    ringiNumber: String,
    projectName: String
  },
  createdAt: Date
}
```

---

## Authentication & Authorization

### Authentication Flow

#### 1. OTP Verification (`app/api/auth/otp/verify/route.js`)

```javascript
POST /api/auth/otp/verify
Body: { otp: string }
Response: { success: boolean, message: string }
```

**Process**:
1. Validate OTP format (4-digit numeric)
2. Lookup OTP in Vendor records
3. Validate OTP not expired (24-hour TTL)
4. Create session with user context:
   - Normalize role (`getNormalizedRole`)
   - Include `vendorId` for vendor role
5. Delete used OTP (prevent replay attack)
6. Return session cookie

#### 2. Session Management (`lib/auth.js`)

**JWT Configuration**:
- Algorithm: HS256
- Secret: `process.env.JWT_SECRET` (min 32 chars)
- Token expiration: 2 hours (payload)
- Cookie expiration: 7 days (storage)

**Cookie Settings**:
```javascript
{
  httpOnly: true,     // Prevent JavaScript access
  secure: production, // HTTPS only in production
  sameSite: 'lax',    // CSRF protection, allows redirects
  path: '/',          // Application-wide
  expires: 7 days
}
```

**Session Operations**:
- `login(user)` - Encrypt payload, set cookie
- `logout_session()` - Clear cookie
- `getSession()` - Decrypt and return session
- `encrypt(payload)` - Sign JWT
- `decrypt(token)` - Verify and decode JWT

---

### Authorization Layer

#### Role-Based Access Control (RBAC)

**Role Hierarchy**:
```
Admin (Root)
  └ Finance User
       └ Project Manager
            └ Vendor
```

**Roles in `constants/roles.js`**:
```javascript
ROLES = {
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  FINANCE_USER: 'FINANCE_USER',
  VENDOR: 'VENDOR'
}
```

**Hierarchy Rules** (enforced in `app/api/admin/hierarchy/route.js`):
- Finance User can only be managed by Admin
- Project Manager can only be managed by Finance User
- Vendor can only be managed by Project Manager

---

## RBAC Implementation

### Permission System (`lib/rbac.js`)

#### Permissions Enum
```javascript
Permissions = {
  UPLOAD_DOCUMENT: 'UPLOAD_DOCUMENT',
  APPROVE_INVOICE: 'APPROVE_INVOICE',
  VALIDATE_TIMESHEET: 'VALIDATE_TIMESHEET',
  SUBMIT_INVOICE: 'SUBMIT_INVOICE',
  HIL_REVIEW: 'HIL_REVIEW',
  FINAL_APPROVAL: 'FINAL_APPROVAL',
  PAYMENT_RELEASE: 'PAYMENT_RELEASE'
}
```

#### Role-Permission Matrix

| Role | UPLOAD_DOCUMENT | APPROVE_INVOICE | VALIDATE_TIMESHEET | SUBMIT_INVOICE | HIL_REVIEW | FINAL_APPROVAL | PAYMENT_RELEASE |
|------|-----------------|-----------------|---------------------|----------------|------------|-----------------|-----------------|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Finance User | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Project Manager | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Vendor | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |

#### Key Functions

**`checkPermission(userRole, permission)`**
```javascript
Returns: { allowed: boolean, reason: string }
```
Validates if a role has a specific permission.

**`requireRole(allowedRoles)`**
Middleware factory for route protection:
```javascript
// Usage in API routes
const roleCheck = requireRole([ROLES.ADMIN, ROLES.FINANCE_USER])(user);
if (!roleCheck.allowed) {
  return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
}
```

**`getVisibleFields(userRole)`**
Returns array of fields a role can view from Invoice model:
- **Vendor**: basic invoice data only
- **PM**: PM approval fields
- **Finance User**: HIL review fields
- **Admin**: All fields

**`filterFields(data, userRole)`**
Filters an invoice object to role-permissible fields.

**`getAllowedInvoiceActions(invoiceStatus, userRole)`**
Returns array of valid actions based on current status and role.

---

### Menu Permissions (`constants/roles.js`)

Role-based navigation access:

```javascript
MENU_PERMISSIONS = {
  'Dashboard': ['ADMIN', 'FINANCE_USER', 'PROJECT_MANAGER', 'VENDOR'],
  'Messages': ['ADMIN', 'PROJECT_MANAGER', 'FINANCE_USER'],
  'Approvals': ['ADMIN', 'PROJECT_MANAGER'],
  'PM Approval Queue': ['PROJECT_MANAGER'],
  'Finance Approval Queue': ['FINANCE_USER'],
  'Configuration': ['ADMIN'],
  'User Management': ['ADMIN'],
  'Audit Logs': ['ADMIN', 'FINANCE_USER', 'PROJECT_MANAGER'],
  'Rate Cards': ['ADMIN', 'PROJECT_MANAGER', 'FINANCE_USER', 'VENDOR'],
  'Hierarchy': ['ADMIN'],
  'Re-check Requests': ['VENDOR']
}
```

**Sidebar Implementation** (`components/Layout/Sidebar.jsx`):
- Filters menu items by role
- Dynamic path replacement based on role:
  - Admin → `/admin/dashboard`
  - Finance User → `/finance/dashboard`
  - PM → `/pm/dashboard`
  - Vendor → `/vendors`

---

## Workflow State Machine

### Invoice Workflow (`lib/invoice-workflow.js`)

The workflow is strictly enforced through a state machine pattern.

#### Status States

```javascript
INVOICE_STATUS = {
  SUBMITTED: 'Submitted',
  PENDING_PM_APPROVAL: 'Pending PM Approval',
  PM_APPROVED: 'PM Approved',
  PM_REJECTED: 'PM Rejected',
  MORE_INFO_NEEDED: 'More Info Needed',
  PENDING_FINANCE_REVIEW: 'Pending Finance Review',
  FINANCE_APPROVED: 'Finance Approved',
  FINANCE_REJECTED: 'Finance Rejected'
}
```

#### Valid Transitions

```
Submitted
  ↓
Pending PM Approval
  ↓                    ┐
  ├→ PM Approved      ─┤ Loop
  │   ↓               ─┤
  │ Pending Finance Review
  │   ↓               ─┘
  │   ├→ Finance Approved (Terminal)
  │   │
  │   └→ Finance Rejected (Terminal)
  │
  ├→ PM Rejected (Terminal)
  │
  └→ More Info Needed
       ↓
       Submitted (Restart workflow)
```

#### Transition Permissions

| Status Transition | Allowed Roles | Description |
|-------------------|----------------|-------------|
| Submitted → Pending PM Approval | Admin, PM | Initial submission processing |
| Pending PM Approval → PM Approved | PM | PM approves invoice |
| Pending PM Approval → PM Rejected | PM | PM rejects invoice |
| Pending PM Approval → More Info Needed | PM | PM requests additional info |
| More Info Needed → Submitted | Vendor | Vendor resubmits |
| PM Approved → Pending Finance Review | PM, Finance User | Assign to finance review |
| Pending Finance Review → Finance Approved | Finance User | Final approval |
| Pending Finance Review → Finance Rejected | Finance User | Final rejection |

#### Validation Function

**`validateTransition(currentStatus, newStatus, userRole)`**
```javascript
Returns: { valid: boolean, reason: string }
```

**Logic**:
1. Check if `currentStatus → newStatus` exists in `WORKFLOW_TRANSITIONS`
2. Check if `userRole` is in `TRANSITION_PERMISSIONS[newStatus]`
3. Return validation result

**Usage Example**:
```javascript
const validation = validateTransition(
  'Pending PM Approval',
  'PM Approved',
  'PROJECT_MANAGER'
);
// Returns: { valid: true, reason: null }
```

#### Helper Functions

- **`getAllowedTransitions(currentStatus, userRole)`**: Returns array of valid next states
- **`isTerminalStatus(status)`**: Returns true for final states (Approved/Rejected)
- **`isReviewStatus(status)`**: Returns true for review stages (Pending PM/Finance)
- **`determineInfoReturnDestination(status)`**: Determines destination after More Info Needed

---

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/otp/verify`
**Purpose**: Verify OTP and create session

**Request Body**:
```json
{
  "otp": "1234"
}
```

**Response**:
- `200 OK`: `{ success: true, message: "Login successful" }`
- `400 Bad Request`: `{ success: false, message: "Invalid OTP" }`
- `404 Not Found`: `{ success: false, message: "OTP not found" }`

**Process**:
1. Validate OTP in Vendor records
2. Check expiration (24 hours)
3. Create session cookie (7 days)
4. Delete used OTP

---

### Invoice Endpoints

#### GET `/api/invoices`
**Purpose**: List invoices with RBAC filtering

**Query Parameters**:
- `status`: Filter by invoice status (optional)
- `limit`: Maximum invoices to return (optional)
- `vendorId`: Filter by vendor (for vendor role)

**RBAC Behavior**:
- **Admin**: All invoices
- **PM**: Invoices where `assignedPM === user` OR in assigned projects OR delegated projects
- **Finance User**: Invoices where `assignedFinanceUser === user`
- **Vendor**: Only own invoices (`submittedByUserId === user.vendorId`)

**Response**:
```json
{
  "invoices": [
    {
      "id": "...",
      "invoiceNumber": "INV-001",
      "status": "Pending PM Approval",
      // Role-filtered fields
    }
  ],
  "total": 10
}
```

---

#### POST `/api/invoices`
**Purpose**: Manual invoice submission

**Request Body**:
```json
{
  "invoiceNumber": "INV-001",
  "invoiceDate": "2026-01-01",
  "project": "projectId",
  "vendor": "vendorId",
  "lineItems": [
    {
      "itemCode": "001",
      "description": "Service",
      "quantity": 100,
      "rate": 50.00
    }
  ],
  "documents": [
    {
      "fileName": "invoice.pdf",
      "fileType": "application/pdf",
      "documentType": "INVOICE",
      "base64Content": "base64..."
    }
  ]
}
```

**Validation**:
- Required fields: `invoiceNumber`, `invoiceDate`, `project`, `vendor`, `lineItems`
- Vendor invoices must have `assignedPM` in project
- No duplicate invoice numbers
- Documents validated and converted to Base64

**RBAC**: Requires `SUBMIT_INVOICE` permission

**Response**:
- `201 Created`: Invoice object with ID
- `400 Bad Request`: Validation errors
- `403 Forbidden`: Permission denied

---

#### PUT `/api/invoices/:id`
**Purpose**: Update invoice (limited fields)

**Updatable Fields** (by role):
- **Vendor**: `remarks`, add documents
- **PM**: `remarks`, `pmApproval` fields (when making approval)
- **Finance User**: `remarks`, `hilReview` fields (when making review)
- **Admin**: All fields

**Workflow Enforcement**:
- Status transitions validated by `validateTransition`
- Only allowed roles can update approval fields

**Response**:
- `200 OK`: Updated invoice
- `400 Bad Request`: Invalid transition
- `404 Not Found`: Invoice not found

---

### Hierarchy Endpoints

#### GET `/api/admin/hierarchy`
**Purpose**: Get user hierarchy tree

**RBAC**: Admin only

**Response**:
```json
{
  "tree": [
    {
      "id": "...",
      "name": "System Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "children": [
        {
          "id": "...",
          "name": "Finance User 1",
          "role": "FINANCE_USER",
          "children": [
            {
              "id": "...",
              "name": "PM 1",
              "role": "PROJECT_MANAGER",
              "children": [
                {
                  "id": "...",
                  "name": "Vendor 1",
                  "role": "VENDOR",
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "unassigned": [],
  "allUsers": [...]
}
```

---

#### PUT `/api/admin/hierarchy`
**Purpose**: Assign/update hierarchy

**RBAC**: Admin only

**Request Body**:
```json
{
  "userId": "userId",
  "managedBy": "managerId",
  "children": ["child1Id", "child2Id"]
}
```

**Validation**:
- Enforces hierarchy rules (FU ← Admin, PM ← FU, Vendor ← PM)
- Manager must exist
- Prevents circular references

**Atomic Operation**:
1. Update `managedBy` for user
2. Bulk update `managedBy` for children list
3. Unassign removed children (set `managedBy: null`)
4. Create audit trail entry

**Response**:
- `200 OK`: `{ success: true }`
- `400 Bad Request`: Validation error
- `403 Forbidden**: Invalid hierarchy rule

---

### User Endpoints

#### GET `/api/admin/users`
**Purpose**: List all users

**RBAC**: Admin only

**Response**:
```json
{
  "users": [
    {
      "id": "...",
      "name": "User Name",
      "email": "email@example.com",
      "role": "PROJECT_MANAGER",
      "managedBy": "managerId",
      "isActive": true
    }
  ]
}
```

---

#### GET `/api/admin/users/:id`
**Purpose**: Get specific user

**RBAC**: Admin can see all, others see self

---

#### PUT `/api/admin/users/:id`
**Purpose**: Update user

**RBAC**: Admin only

**Updatable**:
- `name`, `email`, `managedBy`, `isActive`

---

### Audit Endpoints

#### GET `/api/audit`
**Purpose**: Get audit trail entries

**Query Parameters**:
- `invoiceId`: Filter by invoice
- `startDate`: Filter start date
- `endDate`: Filter end date
- `limit`: Max entries

**RBAC**: Admin, Finance User, PM

**Response**:
```json
{
  "entries": [
    {
      "id": "...",
      "invoice_id": "invoiceId",
      "username": "User Name",
      "action": "PM_APPROVED",
      "details": "Approved amount: 5000.00",
      "timestamp": "2026-01-01T10:00:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

---

### Vendor Endpoints

#### POST `/api/vendor/submit`
**Purpose**: Submit invoice from vendor interface

**Similar to POST /api/invoices** but with vendor-specific:
- Auto-populates `submittedByUserId` from session
- Validates vendor has access to project

---

#### GET `/api/vendor/rechecks`
**Purpose**: Get re-check requests for vendor

**Response**:
```json
{
  "requests": [...],
  "unreadCount": 5
}
```

---

#### POST `/api/vendor/rate-cards`
**Purpose**: Upload rate card for validation

**RBAC**: Vendor only

**Process**:
1. Parse PDF with Mindee
2. Extract rate table
3. Compare with hard-coded reference values in code
4. Return validation result

**Response**:
```json
{
  "success": true,
  "validated": true,
  "discrepancies": [],
  "referenceRates": {
    "001": 50.00,
    "002": 75.00
  }
}
```

---

### Project Endpoints

#### GET `/api/projects`
**Purpose**: List projects

**RBAC Filtering**:
- **Admin**: All projects
- **PM**: Projects where `assignedPMs` includes user OR managed projects
- **Finance User**: projects in managed PM's assignments
- **Vendor**: Projects where `vendorIds` includes user.vendorId

---

#### POST `/api/projects`
**Purpose**: Create project

**RBAC**: Admin only

---

## Database Layer

### Connection Management (`lib/mongodb.js`)

**Connection Pooling Configuration**:
```javascript
{
  bufferCommands: false,         // Don't buffer queries before connection
  serverSelectionTimeoutMS: 15000,  // 15s to select primary
  connectTimeoutMS: 15000,      // 15s to establish connection
  socketTimeoutMS: 45000,       // 45s socket timeout
  family: 4,                    // Force IPv4
  maxPoolSize: 10               // Max simultaneous connections
}
```

**Connection Caching**:
- Global `mongoose` object cached across hot reloads
- Single connection reused per deployment
- Prevents connection exponential growth

---

### Database Operations (`lib/db.js`)

The `db` module provides a unified interface for all database operations (1,056 lines).

#### Invoice Operations

**`getInvoices(filters, user)`**
- Applies RBAC filtering based on user role
- PMs see assigned projects or delegated projects
- Vendors see only own invoices
- Finance users see assigned invoices
- Supports filtering by status, limit

**`getInvoiceById(id)`**
- Returns full invoice object
- Includes backward compatibility fields

**`saveInvoice(invoice)`**
- Handles both new and existing invoices
- Creates audit trail entry for status changes
- Updates `updatedAt` timestamp
- Supports legacy AuditTrail collection for migration

**`updateInvoiceStatus(id, newStatus, user)`**
- Validates transition via workflow engine
- Updates status and creates audit entry
- Records ipAddress, userAgent

**`assignPM(id, pmId, user)`**
- Assigns PM to an invoice
- Creates audit entry
- PM must have permission

**`assignFinanceUser(id, financeUserId, user)`**
- Assigns Finance User to an invoice
- Creates audit entry

---

#### User Operations

**`getAllUsers()`**
- Returns all users with hierarchy data

**`getUserById(id)`**
- Returns single user

**`getUserByEmail(email)`**
- Returns user or null

**`updateUserManagedBy(userId, managedBy)`**
- Updates hierarchy relationship
- Used for parent/child management

---

#### Project Operations

**`getProjects(filters, user)`**
- RBAC filtered project list
- PMs see assigned or delegated projects
- Vendors see projects they're associated with

**`createProject(project)`**
- Creates new project
- Validates assignedPMs exist

**`assignProjectToPM(projectId, pmId)`**
- Adds PM to project's assignedPMs array

---

#### Audit Trail Operations

**`getAuditTrail(filters)`**
- Query audit entries with pagination
- Filters by invoice, date range, action type

**`createAuditTrailEntry(entry)`**
- Creates audit entry with full context
- Includes: invoice_id, username, action, details, timestamp, ipAddress, userAgent

---

#### Delegation Operations

**`getDelegatedProjects(userId)`**
- Returns projects delegated to user
- Traverses hierarchy: PM → Finance User → Admin

**`createDelegation(delegation)`**
- Creates delegation record
- Links: delegator, delegatee, projects, expires at

**`getDelegations(userId)`**
- Returns active delegations for user

---

#### Helper Functions

**`syncPMAssignments()`**
- Syncs PM assignments across projects
- Maintains consistency after hierarchy changes

**`testConnection()`**
- Verifies MongoDB connection health
- Returns connection stats

**`getSystemConfig(key)`**
- Retrieves system configuration value

**`saveSystemConfig(key, value)`**
- Persists system configuration

---

### RBAC Filtering Implementation

The `getInvoices` function demonstrates RBAC filtering:

```javascript
if (userRole === ROLES.PROJECT_MANAGER) {
  // PM sees invoices where assignedPM matches
  // OR project is in assigned OR delegated projects
  const userProjects = await getUserProjects(user);
  query.$or = [
    { assignedPM: userId },
    { project: { $in: userProjects } }
  ];
}

if (userRole === ROLES.VENDOR) {
  // Vendor sees only own invoices
  query.submittedByUserId = user.vendorId;
}

if (userRole === ROLES.FINANCE_USER) {
  // Finance user sees assigned invoices
  query.assignedFinanceUser = userId;
}
```

---

## Frontend Components

### Layout Components

#### **Sidebar** (`components/Layout/Sidebar.jsx`)

**Features**:
- **Role-based menu filtering**: Uses `canSeeMenuItem` from role constants
- **Dynamic path replacement**: Routes adapt to user role
- **Collapsed/Expanded mode**: Stored in localStorage
- **Responsive design**: Desktop sidebar + Mobile drawer
- **Animated with framer-motion**: Smooth transitions
- **Real-time counters**:
  - unread messages count (pending messages)
  - unread re-check requests (vendors only)
  - polls every 30 seconds

**Menu Structure**:
```javascript
const menuItems = [
  { name: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
  { name: "Messages", icon: "Mail", path: "/pm/messages" },
  { name: "Approvals", icon: "CheckCircle", path: "/pm/approvals" },
  { name: "PM Approval Queue", icon: "ClipboardCheck", path: "/pm/approval-queue" },
  { name: "Finance Approval Queue", icon: "ListChecks", path: "/finance/approval-queue" },
  { name: "Configuration", icon: "Settings", path: "/config" },
  { name: "User Management", icon: "Shield", path: "/users" },
  { name: "Audit Logs", icon: "FileText", path: "/audit" },
  { name: "Rate Cards", icon: "Layers", path: "/admin/ratecards" },
  { name: "Hierarchy", icon: "GitBranch", path: "/admin/hierarchy" },
  { name: "Re-check Requests", icon: "AlertCircle", path: "/vendors/rechecks" }
]
```

**Dynamic Path Mapping**:
- Admin → `/admin/dashboard`, `/admin/messages`, `/admin/hierarchy`
- Finance User → `/finance/dashboard`, `/finance/rate-cards`, `/finance/approval-queue`
- PM → `/pm/dashboard`, `/pm/messages`, `/pm/approval-queue`
- Vendor → `/vendors`, `/vendor/ratecards`

**Styling Highlights**:
- Glassmorphism backdrop
- Theme-aware (light/dark mode)
- Animated active tab indicators
- Collapsible text with reactAnimatePresence
- Icon-based visual hierarchy

---

### Dashboard Components

#### **Role-specific Dashboards**

**AdminDashboard** (`components/Dashboard/Roles/AdminDashboard.jsx`)
- System-wide statistics
- User hierarchy visualization
- Configuration management
- Global audit logs access

**FinanceUserDashboard** (`components/Dashboard/Roles/FinanceUserDashboard.jsx`)
- Assigned invoices queue
- Finance review workflow
- HIL review tracking
- Payment release permissions

**ProjectManagerDashboard** (`components/Dashboard/Roles/ProjectManagerDashboard.jsx`)
- PM approval queue
- Project-based invoice tracking
- Vendor coordination
- Timesheet validation access

---

### Authentication Context

**AuthContext** (`context/AuthContext.jsx`)

Provides user authentication state across the app:

```javascript
interface AuthContext {
  user: User | null,        // Current user from session
  login: (user) => void,    // Login method
  logout: () => void,       // Logout method
  isAuthenticated: boolean  // Auth status
}
```

**Usage**:
```javascript
const { user, logout } = useAuth();
if (!user) {
  // Redirect to login
}
```

---

### Icon Component

**Icon** (`components/Icon.jsx`)

FontAwesome-style icon rendering system:
- Maps icon names to FontAwesome icon paths
- Supports dynamic sizing
- stroke-width customization
- Used throughout UI for consistent look

---

## Security Features

### 1. JWT-based Authentication

**Token Structure**:
```javascript
{
  user: { id, name, email, role, vendorId },
  iat: 1234567890,        // Issued at timestamp
  exp: 1234589890         // Expiration timestamp
}
```

**Security Properties**:
- **httpOnly cookie**: Prevents XSS attacks
- **sameSite: 'lax'**: CSRF protection with redirect support
- **secure in production**: HTTPS-only
- **7-day expiration**: Reduces attack window
- **OTPs single-use**: Prevents replay attacks

---

### 2. Role-Based Access Control

**Multiple Layers**:
1. **Route-level**: `requireRole` middleware on API routes
2. **Field-level**: `getVisibleFields` filters sensitive data
3. **Menu-level**: Sidebar items filtered by role
4. **Operation-level**: Permissions for specific actions

**Example**:
```javascript
// Route level
const roleCheck = requireRole([ROLES.ADMIN])(user);
if (!roleCheck.allowed) return 403;

// Field level
const visibleFields = getVisibleFields(user.role);
const filteredData = filterFields(invoiceData, user.role);
```

---

### 3. Workflow State Machine Protection

**Transition Validation**:
- Enforces valid status changes
- Restricts who can perform which transitions
- Prevents skipping workflow stages

**Final States cannot be modified**:
```javascript
if (isTerminalStatus(currentStatus)) {
  return { valid: false, reason: "Cannot modify closed invoice" };
}
```

---

### 4. Audit Trail

Comprehensive tracking of all operations:
- Every status change logged
- IP address and User Agent recorded
- Timestamp with UTC time
- Action description with details
- Queryable by invoice, date, user, action type

Stored in both invoice document (array) and dedicated AuditTrail collection (legacy support).

---

### 5. Input Validation

**API Routes validate**:
- Required fields presence
- Data type validation
- Business rule validation (e.g., vendor needs assignedPM)
- Duplicate prevention (invoice numbers)
- Hierarchy rules (managedBy constraints)

**Sanitization**:
- Passwords not stored with users (OTP-based)
- Document files converted to Base64
- IP addresses logged but not used for auth
- XSS protection via React escaping

---

### 6. Database Security

**Connection Settings**:
- IPv4 only (`family: 4`)
- Connection timeout: 15s
- Socket timeout: 45s
- Max pool size: 10 (prevents exhaustion)

**Indexes**:
- Proper indexing on query fields
- Compound indexes for complex queries
- Text index on searchable fields

---

### 7. Rate Card Validation Security

Hardcoded reference values prevent tampering:
```javascript
const REFERENCE_RATES = {
  '001': 50.00,
  '002': 75.00,
  // ... encoded in application code
};
```

Rate card uploads must match these values to pass validation.

---

## Configuration

### Environment Variables

Required in `.env.local`:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/invoiceflow
# or atlas: mongodb+srv://user:pass@cluster.mongodb.net/invoiceflow

# JWT Secret (minimum 32 characters)
JWT_SECRET=your-secret-key-at-least-32-chars-long-change-in-production

# Node Environment
NODE_ENV=development  # or production

# Optional: App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Next.js Configuration (`next.config.mjs`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer-when-downgrade'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
          }
        ]
      }
    ];
  }
};
```

---

### Dependencies (`package.json`)

**Core**:
- `next`: 15.1.7
- `react`: 19.0.0
- `react-dom`: 19.0.0

**Database**:
- `mongoose`: 8.10.1
- `mongodb`: 8.10.1

**Auth**:
- `jose`: ^5.9.6 (JWT operations)

**UI**:
- `framer-motion`: ^12.0.0
- `clsx`: ^1.2.1
- `argon2`: ^0.40.3

**Processing**:
- `tesseract.js`: ^5.1.0 (OCR)
- `mindee`: ^5.0.0 (PDF parsing)

---

## File Structure

```
Invoice Tracker/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/
│   │   │   └── otp/verify/     # OTP login endpoint
│   │   ├── admin/
│   │   │   ├── users/          # User management
│   │   │   └── hierarchy/      # Hierarchy management
│   │   ├── invoices/           # Invoice CRUD
│   │   └── vendor/             # Vendor-specific endpoints
│   │       ├── submit/         # Invoice submission
│   │       └── rate-cards/     # Rate card validation
│   │
│   ├── approvals/              # Approval pages
│   ├── finance/                # Finance user pages
│   │   ├── dashboard/
│   │   ├── approval-queue/
│   │   └── rate-cards/
│   ├── pm/                     # Project manager pages
│   │   ├── dashboard/
│   │   ├── approval-queue/
│   │   └── rate-cards/
│   ├── admin/                  # Admin pages
│   │   ├── dashboard/
│   │   ├── hierarchy/
│   │   └── ratecards/
│   ├── vendors/                # Vendor pages
│   │   ├── rechecks/
│   │   └── ratecards/
│   ├── audit/                  # Audit log viewer
│   ├── users/                  # User management UI
│   ├── dashboard/              # Default dashboard
│   └── config/                 # Configuration pages
│
├── components/
│   ├── Layout/
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   └── ThemeToggle.jsx     # Dark mode toggle
│   ├── Dashboard/
│   │   └── Roles/              # Role-specific dashboards
│   │       ├── AdminDashboard.jsx
│   │       ├── FinanceUserDashboard.jsx
│   │       └── ProjectManagerDashboard.jsx
│   ├── Icon.jsx                # Icon rendering component
│   └── [other UI components]
│
├── context/
│   └── AuthContext.jsx         # Authentication state
│
├── lib/
│   ├── auth.js                 # JWT session management
│   ├── db.js                   # Database operations (1,056 lines)
│   ├── mongodb.js              # MongoDB connection
│   ├── rbac.js                 # Role-based access control
│   ├── server-auth.js          # Server-side auth helpers
│   ├── invoice-workflow.js     # Workflow state machine
│   └── version.js              # App version constant
│
├── models/
│   ├── User.js                 # User schema
│   ├── Vendor.js               # Vendor schema
│   ├── Project.js              # Project schema
│   ├── Invoice.js              # Invoice schema (with workflow)
│   └── DocumentUpload.js       # Document schema
│
├── constants/
│   └── roles.js                # Role constants and permissions
│
├── scripts/                    # Utility scripts
│   ├── clean-database.js       # Database cleanup
│   ├── clean-database-auto.js
│   └── create-admin.js         # Admin user creation
│
├── next.config.mjs             # Next.js configuration
├── package.json                # Dependencies
├── README.md                   # User-facing documentation
├── TECHNICAL_DOCUMENTATION.md  # This file
└── .env.local                  # Environment variables (gitignored)
```

---

## Key Architectural Decisions

### 1. State Machine for Workflow

**Decision**: Enforce strict status transitions

**Rationale**:
- Prevents invalid workflow skips
- Ensures proper approval chain
- Enables state-based UI rendering
- Simplifies workflow management

**Implementation**:
- `WORKFLOW_TRANSITIONS` matrix
- `TRANSITION_PERMISSIONS` role mapping
- `validateTransition()` function

---

### 2. Role-Based Field Filtering

**Decision**: Filter sensitive data based on role

**Rationale**:
- Separates concerns (PM vs Finance vs Vendor)
- Reduces information leakage
- Enables role-specific UI
- Simplifies frontend permissions

**Implementation**:
- `getVisibleFields()` per role
- `filterFields()` for data sanitization
- Applied in API responses

---

### 3. Audit Trail Pattern

**Decision**: Comprehensive change tracking

**Rationale**:
- Debugging workflow issues
- Compliance requirements
- User accountability
- Historical analysis

**Implementation**:
- Array-based audit trail in invoice document
- Dedicated AuditTrail collection (legacy)
- IP address and user agent tracking
- Queryable by multiple dimensions

---

### 4. Session-based Auth (JWT)

**Decision**: JWT tokens in httpOnly cookies

**Rationale**:
- Stateless authentication
- Good performance
- Security: httpOnly prevents XSS
- 7-day expiration balances UX and security

**Implementation**:
- HS256 algorithm
- jose library for signing
- Cookie-based storage
- Role normalization on creation

---

### 5. Hierarchy-based Delegation

**Decision**: Users delegate to parent roles

**Rationale**:
- Supports workflow escalation
- Allows temporary delegation
- Follows organizational structure
- PM → Finance User → Admin chain

**Implementation**:
- User.managedBy field
- Hierarchy validation rules
- Delegated projects tracking
- Traversal in queries

---

## Performance Considerations

### Database Optimization

1. **Indexing Strategy**:
   - Single field indexes on most queried fields
   - Compound indexes for common query patterns
   - Text index on searchable fields

2. **Connection Pooling**:
   - Max 10 connections per deployment
   - Cached connection across hot reloads
   - IPv4 preference for stability

3. **Query Optimization**:
   - RBAC filtering at database level
   - Paginated results with limit parameter
   - No complex aggregations on hot paths

---

### Frontend Optimization

1. **React optimization**:
   - Client-side components marked `"use client"`
   - Batched updates from fetch polling
   - Animation caching with framer-motion

2. **Caching**:
   - ETag headers via Next.js default
   - no-cache for fresh data (approvals, messages)
   - localStorage for UI preferences

3. **Render performance**:
   - Component boundaries well-defined
   - No deep component nesting
   - Lazy rendering for large datasets

---

## Extension Points

### Adding New Roles

1. Update `constants/roles.js`:
   ```javascript
   ROLES = {
     // ... existing
     NEW_ROLE: 'NEW_ROLE'
   }
   ```

2. Add permissions in `lib/rbac.js`:
   ```javascript
   const ROLE_PERMISSIONS = {
     NEW_ROLE: [/* permissions */]
   }
   ```

3. Update hierarchy validation in `app/api/admin/hierarchy/route.js`

4. Add menu items with `MENU_PERMISSIONS`

---

### Adding Workflow States

1. Add to `INVOICE_STATUS` in `lib/invoice-workflow.js`

2. Update `WORKFLOW_TRANSITIONS` matrix

3. Add to `TRANSITION_PERMISSIONS`

4. Update `WORKFLOW_STAGE_DESCRIPTIONS`

5. Add handling in status transitions UI

---

### Adding Audit Actions

Audit trail accepts any action string. New workflow actions:
- Simply call `createAuditTrailEntry({ action: 'NEW_ACTION', ... })`
- No schema changes required
- Queryable via `/api/audit?filter=action:NEW_ACTION`

---

## Testing Strategy

Recommended test coverage:

1. **Unit Tests**:
   - Workflow validation logic
   - RBAC permission checking
   - Role normalization
   - Data filtering

2. **Integration Tests**:
   - API endpoint workflows
   - Authentication flows
   - Database operations
   - Hierarchy management

3. **End-to-End Tests**:
   - Complete invoice lifecycle
   - Role-based access scenarios
   - Error handling paths

4. **Security Tests**:
   - Unauthorized access attempts
   - Invalid workflow transitions
   - Session hijacking prevention
   - Input validation

---

## Troubleshooting

### Common Issues

**Issue**: "Mongoose connection timeout"
**Solution**: Check `MONGODB_URI`, verify network connectivity, ensure MongoDB is running

**Issue**: "Invalid transition" errors
**Solution**: Verify workflow state, check user role has permission for transition

**Issue**: "Permission denied" on API routes
**Solution**: Verify user role, check RBAC permissions, ensure session is valid

**Issue**: Cannot see invoices in dashboard
**Solution**: Check RBAC filtering logic, verify user assignments (PM/FinanceUser), check delegated projects

**Issue**: OTP login fails
**Solution**: Verify OTP exists in Vendor records, check 24-hour expiration, ensure OTP not already used

---

## Conclusion

This technical documentation provides a comprehensive view of the InvoiceFlow system architecture, data models, authentication/authorization, workflow state machine, API endpoints, database operations, frontend components, security features, and configuration. The system is designed with RBAC as a first-class concern, strict workflow enforcement, and comprehensive audit trail capabilities.

For deployment considerations, refer to the README.md for environment setup and deployment instructions.