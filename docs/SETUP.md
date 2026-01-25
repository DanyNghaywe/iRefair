# Development Setup Guide

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**, **pnpm**, or **yarn**
- **Git**
- **Google Cloud Account** (for Sheets/Drive APIs)
- **Gmail Account** (for email sending)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd iRefair

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure environment variables (see below)
# ...

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Configuration

### Required Variables

#### Authentication

```bash
# Founder (Admin) credentials
FOUNDER_EMAIL=admin@example.com
FOUNDER_PASSWORD_HASH=<bcrypt-hash>
FOUNDER_AUTH_SECRET=<64-char-random-string>

# Generate password hash:
# npx bcryptjs hash "your-password"

# Generate secret:
# node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

#### Email (Gmail SMTP)

```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=<app-password>
```

To generate an App Password:
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate a new app password for "Mail"

#### Google Sheets

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
GOOGLE_SHEETS_CLIENT_EMAIL=<service-account-email>
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Setup steps:
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Sheets API
3. Create a Service Account
4. Download JSON key file
5. Extract `client_email` and `private_key`
6. Share your spreadsheet with the service account email (Editor access)

Required sheet tabs:
- `Applicants`
- `Referrers`
- `Applications`
- `ReferrerCompanies`

#### Google Drive

```bash
GDRIVE_FOLDER_ID=<folder-id>
GDRIVE_CLIENT_EMAIL=<service-account-email>
GDRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Setup:
1. Create a folder in Google Drive
2. Share it with the service account email (Editor access)
3. Copy the folder ID from the URL

#### Database

```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

For local development, you can use:
- [Neon](https://neon.tech/) (recommended, free tier)
- Local PostgreSQL
- Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres`

### Optional Variables

#### Rate Limiting (Upstash Redis)

```bash
UPSTASH_REDIS_REST_URL=<url>
UPSTASH_REDIS_REST_TOKEN=<token>
```

Create a free database at [Upstash](https://upstash.com/).

Without Redis, rate limiting is disabled (requests always allowed).

#### OpenAI (Resume Validation)

```bash
OPENAI_API_KEY=sk-...
RESUME_AI_CHECK=true
```

#### VirusTotal (File Scanning)

```bash
VIRUSTOTAL_API_KEY=<api-key>
```

Get a free API key at [VirusTotal](https://www.virustotal.com/).

## Database Setup

### Initial Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio
npx prisma studio
```

### Schema

The database stores cached data from Google Sheets:

```prisma
model Sheet {
  name      String     @id
  headers   Json
  keyHeader String
  syncedAt  DateTime?
  rows      SheetRow[]
}

model SheetRow {
  sheetName String
  key       String
  rowIndex  Int?
  values    Json
  hash      String
  deletedAt DateTime?
  // ...timestamps
}
```

## Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
iRefair/
├── src/
│   ├── app/                 # Next.js pages and API routes
│   │   ├── (founder)/       # Founder dashboard
│   │   ├── api/             # API endpoints
│   │   └── [pages]/         # Public pages
│   ├── components/          # React components
│   └── lib/                 # Utility functions
├── prisma/
│   └── schema.prisma        # Database schema
├── public/                  # Static assets
├── docs/                    # Documentation
└── .env.local               # Environment variables (not committed)
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/__tests__/founderAuth.test.ts

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

Tests use [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/).

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

## Common Issues

### "GMAIL_USER or GMAIL_APP_PASSWORD not set"

Ensure both variables are in `.env.local` and the app password is correct.

### "Google Sheets API error"

1. Verify the service account has access to the spreadsheet
2. Check that the private key includes `\n` line breaks
3. Ensure the Sheets API is enabled in Google Cloud

### "Database connection failed"

1. Check `DATABASE_URL` format
2. Verify the database is running
3. Run `npx prisma migrate dev` to apply migrations

### Rate limiting not working

Rate limiting requires Upstash Redis. Without it, all requests are allowed.

## Deployment

See the main README for deployment instructions to Vercel.

## Getting Help

- Check [docs/ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
- Check [docs/API.md](./API.md) for API reference
- Open an issue on GitHub for bugs or questions
