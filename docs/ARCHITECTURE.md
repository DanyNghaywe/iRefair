# iRefair Architecture

## Overview

iRefair is a job referral management platform that connects international talent (particularly newcomers to Canada) with hiring opportunities through a community-driven referral system.

## System Architecture

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   Web Browser    |---->|   Next.js App    |---->|  Google Sheets   |
|   (React UI)     |     |   (API Routes)   |     |  (Data Storage)  |
|                  |     |                  |     |                  |
+------------------+     +--------+---------+     +------------------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
         v                       v                       v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   PostgreSQL     |     |   Google Drive   |     |   Gmail SMTP     |
|   (Cache/Sync)   |     |   (Resumes)      |     |   (Email)        |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
         |
         v
+------------------+
|                  |
|   Upstash Redis  |
|   (Rate Limit)   |
|                  |
+------------------+
```

## Core Components

### Frontend (React/Next.js)
- **Framework**: Next.js 16 with App Router
- **UI**: React 19 with Tailwind CSS 4
- **Routing**: File-based routing with route groups
- **State**: Server components + client-side form handling

### Backend (API Routes)
- **Runtime**: Node.js via Next.js API routes
- **Authentication**: Custom HMAC-signed sessions
- **Rate Limiting**: Upstash Redis REST API
- **File Uploads**: FormData handling with validation

### Data Storage
- **Primary**: Google Sheets (source of truth)
- **Cache**: PostgreSQL via Prisma (fast queries)
- **Sync**: Cron job syncs Sheets -> PostgreSQL every 5 minutes

### External Services
- **Google Drive**: Resume/CV file storage
- **Gmail**: Transactional emails via SMTP
- **OpenAI**: AI-powered resume validation (optional)
- **VirusTotal**: File security scanning (optional)

## User Roles

### 1. Applicants
- Register with profile information
- Upload resume/CV
- Apply to positions through referrers
- Receive email confirmations

### 2. Referrers
- Register as a referrer
- Access portal to view candidates
- Submit feedback on applicants
- Manage company associations

### 3. Founders (Admins)
- Full dashboard access
- Manage applicants, referrers, applications
- Archive/restore records
- Sync data and configure system

## Authentication Flows

### Founder Authentication
```
1. POST /api/founder/auth/login
   - Validates email/password against env vars
   - Creates HMAC-SHA256 signed session token
   - Sets httpOnly cookie (irefair_founder)
   - Session expires in 7 days

2. Subsequent requests
   - Middleware extracts token from cookie
   - Verifies signature with timing-safe comparison
   - Checks expiration
   - Grants access or returns 401
```

### Referrer Portal Authentication
```
1. Referrer requests portal link
   - POST /api/referrer/portal/request-link
   - Validates email against referrer database
   - Sends magic link via email

2. Portal access
   - JWT token in URL/cookie
   - Contains referrer ID + version
   - Verified against stored version (for rotation)
```

### Applicant Update Tokens
```
1. Applicant registration
   - Creates one-time token
   - Sends confirmation email with link

2. Email confirmation
   - GET /api/applicant/confirm-registration
   - Validates token hash
   - Activates profile
   - Token can only be used once
```

## Data Models

### Applicants (iRAIN)
- Unique identifier: `iRAIN-XXXXX` format
- Personal info, contact, work authorization
- Resume file reference (Google Drive)
- Status: pending, active, archived

### Referrers (iRREF)
- Unique identifier: `iRREF-XXXXX` format
- Company associations
- Portal token version (for rotation)
- Status: pending, approved, archived

### Applications (APP-)
- Links applicant to position/referrer
- Status tracking
- Eligibility flags
- Submission metadata

### Referrer Companies (iRCRN)
- Company name and details
- Approval status
- Associated referrers

## API Structure

```
/api
├── applicant/              # Public applicant endpoints
│   ├── route.ts            # POST: Register/update
│   ├── data/               # GET: Fetch applicant data
│   ├── confirm-registration/
│   └── confirm-update/
│
├── apply/                  # Public application submission
│   └── route.ts            # POST: Submit application
│
├── referrer/               # Public referrer endpoints
│   ├── route.ts            # POST: Register referrer
│   ├── portal/             # Referrer portal APIs
│   │   ├── data/           # GET: Portal data
│   │   ├── feedback/       # POST: Submit feedback
│   │   ├── link/           # POST: Generate portal link
│   │   ├── request-link/   # POST: Request portal email
│   │   └── resume/         # GET: Download resume
│   └── reschedule/         # Meeting rescheduling
│
├── founder/                # Protected admin endpoints
│   ├── auth/               # Login/logout
│   ├── applicants/         # CRUD operations
│   ├── applications/       # Application management
│   ├── referrers/          # Referrer management
│   ├── archive/            # Archive operations
│   ├── stats/              # Dashboard statistics
│   └── sync-sheets/        # Manual sync trigger
│
├── cron/                   # Scheduled tasks
│   ├── sync-sheets/        # Sheets -> DB sync
│   ├── cleanup-expired-applicants/
│   └── applicant-registration-reminders/
│
├── chatgpt/                # OpenAI proxy
└── update-cv/              # Resume update flow
```

## Security Measures

### Authentication
- HMAC-SHA256 signed tokens
- Timing-safe comparison prevents timing attacks
- HttpOnly, Secure cookies in production
- Session expiration (7 days)

### Rate Limiting
- Per-endpoint configuration
- Redis-backed distributed limiting
- Client IP extraction from proxy headers
- Fail-open on Redis errors (graceful degradation)

### Input Validation
- File type and size validation
- HTML escaping for XSS prevention
- Honeypot fields for spam protection
- URL normalization

### File Security
- MIME type verification
- File extension validation
- VirusTotal scanning (when configured)
- AI-based resume content validation

### Headers (Middleware)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (production)
- `Permissions-Policy` (restricts APIs)

## Data Synchronization

### Google Sheets -> PostgreSQL
```
1. Cron job runs every 5 minutes
2. Fetches all rows from configured sheets
3. Computes hash of each row
4. Compares with stored hashes
5. Updates only changed rows
6. Soft-deletes removed rows
```

### Write Operations
```
1. API receives write request
2. Updates Google Sheets (source of truth)
3. Updates PostgreSQL cache
4. Returns response
```

## Deployment

### Hosting
- **Platform**: Vercel (serverless)
- **Database**: Neon PostgreSQL (managed)
- **Redis**: Upstash (serverless)

### Environment
- Development: `npm run dev`
- Production: Vercel auto-deploy from main branch

### Cron Jobs
- GitHub Actions workflow (every 5 minutes)
- Calls `/api/cron/sync-sheets` with secret
- Authenticated via `CRON_SECRET` header

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (founder)/          # Founder dashboard (route group)
│   ├── api/                # API routes
│   ├── applicant/          # Applicant pages
│   ├── apply/              # Application pages
│   └── referrer/           # Referrer pages
│
├── components/             # React components
│   ├── founder/            # Dashboard components
│   └── [shared]/           # Shared components
│
├── lib/                    # Utilities
│   ├── founderAuth.ts      # Founder authentication
│   ├── sheets.ts           # Google Sheets operations
│   ├── mailer.ts           # Email sending
│   ├── rateLimit.ts        # Rate limiting
│   └── [others]/           # Other utilities
│
└── middleware.ts           # Global middleware

prisma/
└── schema.prisma           # Database schema

docs/                       # Documentation
```
