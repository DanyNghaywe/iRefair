# iRefair

A job referral management platform connecting international talent with hiring opportunities through a community-driven referral system.

## Overview

iRefair enables:
- **Applicants** to register, build profiles, and apply for positions through referrers
- **Referrers** to manage candidates and facilitate job connections
- **Founders** to oversee the ecosystem and manage data

Built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Documentation

- [Setup Guide](docs/SETUP.md) - Development environment setup
- [Architecture](docs/ARCHITECTURE.md) - System overview and design
- [API Reference](docs/API.md) - API endpoint documentation
- [Contributing](docs/CONTRIBUTING.md) - Contribution guidelines

## Configuration

### Required Environment Variables

Copy `.env.example` to `.env.local` and configure:

#### Authentication
- `FOUNDER_EMAIL` - Admin email
- `FOUNDER_PASSWORD_HASH` - bcrypt hash of admin password
- `FOUNDER_AUTH_SECRET` - Secret for session signing (64+ chars)

#### Email (Gmail SMTP)
- `GMAIL_USER` - Gmail address
- `GMAIL_APP_PASSWORD` - App password ([generate here](https://myaccount.google.com/apppasswords))

#### Google Sheets
- `GOOGLE_SHEETS_SPREADSHEET_ID` - Spreadsheet ID
- `GOOGLE_SHEETS_CLIENT_EMAIL` - Service account email
- `GOOGLE_SHEETS_PRIVATE_KEY` - Service account private key

#### Database
- `DATABASE_URL` - PostgreSQL connection string

See `.env.example` for all available options.

## Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon), Google Sheets
- **Storage**: Google Drive
- **Email**: Gmail SMTP via Nodemailer
- **Rate Limiting**: Upstash Redis
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── (founder)/       # Founder dashboard
│   ├── api/             # API endpoints
│   └── [pages]/         # Public pages
├── components/          # React components
└── lib/                 # Utility functions

docs/                    # Documentation
prisma/                  # Database schema
```

## License

Private - All rights reserved.
