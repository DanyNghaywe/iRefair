# API Reference

## Overview

All API endpoints are located under `/api/`. Responses are JSON with the following structure:

```typescript
// Success
{ "ok": true, "data": {...} }

// Error
{ "ok": false, "error": "Error message" }
```

## Authentication

### Founder Endpoints (`/api/founder/*`)
- Requires `irefair_founder` cookie with valid session token
- Returns `401 Unauthorized` if not authenticated

### Referrer Portal Endpoints (`/api/referrer/portal/*`)
- Requires valid referrer JWT token via:
  - Cookie: `irefair_ref_portal`
  - Header: `Authorization: Bearer <token>`
  - Query: `?token=<token>`

### Public Endpoints
- No authentication required
- Rate limited by IP address

---

## Public Endpoints

### POST /api/applicant

Register or update an applicant profile.

**Rate Limit**: 10 requests / 60 seconds

**Request** (multipart/form-data):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | Yes | First name |
| lastName | string | Yes | Last name |
| email | string | Yes | Email address |
| phone | string | No | Phone number |
| resume | File | No | Resume file (PDF/DOCX, max 10MB) |
| linkedIn | string | No | LinkedIn URL |
| locatedCanada | string | No | "yes" or "no" |
| authorizedCanada | string | No | Work authorization status |
| language | string | No | Preferred language (en/fr) |

**Response**:
```json
{
  "ok": true,
  "confirmationPending": true,
  "message": "Please check your email to confirm registration"
}
```

---

### GET /api/applicant/confirm-registration

Confirm applicant email registration.

**Query Parameters**:
| Param | Required | Description |
|-------|----------|-------------|
| token | Yes | Confirmation token from email |
| email | Yes | Applicant email |

**Response**: Redirects to success/error page

---

### POST /api/apply

Submit a job application.

**Rate Limit**: 10 requests / 60 seconds

**Request** (multipart/form-data):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| applicantId | string | Yes | iRAIN or legacy ID |
| email | string | Yes | Applicant email |
| referrerId | string | No | iRREF ID |
| referrerEmail | string | No | Referrer email (alternative) |
| companyName | string | Yes | Target company |
| position | string | Yes | Position title |
| resume | File | No | Updated resume |
| locatedCanada | string | Yes | Currently in Canada |
| authorizedCanada | string | No | Work authorization |
| eligibleMoveCanada | string | No | Willing to relocate |

**Response**:
```json
{
  "ok": true,
  "applicationId": "APP-12345",
  "message": "Application submitted successfully"
}
```

---

### POST /api/referrer

Register as a new referrer.

**Rate Limit**: 10 requests / 60 seconds

**Request** (JSON):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "phone": "+1234567890",
  "companyName": "Tech Corp",
  "linkedIn": "https://linkedin.com/in/johndoe"
}
```

**Response**:
```json
{
  "ok": true,
  "irref": "iRREF-12345"
}
```

---

### POST /api/referrer/portal/request-link

Request a portal access link via email.

**Rate Limit**: 10 requests / 60 seconds

**Request** (JSON):
```json
{
  "email": "referrer@company.com"
}
```

**Response**:
```json
{
  "ok": true,
  "message": "Portal link sent to your email"
}
```

---

### POST /api/chatgpt

Proxy for OpenAI ChatGPT API.

**Rate Limit**: 5 requests / 60 seconds

**Request** (JSON):
```json
{
  "prompt": "Your question here"
}
// OR
{
  "messages": [
    { "role": "user", "content": "Your question" }
  ]
}
```

**Query Parameters**:
| Param | Description |
|-------|-------------|
| statusOnly=true | Check configuration without making API call |

**Response**:
```json
{
  "ok": true,
  "reply": "ChatGPT response..."
}
```

---

## Referrer Portal Endpoints

### GET /api/referrer/portal/data

Get referrer portal data including assigned applicants.

**Authentication**: Referrer JWT token

**Response**:
```json
{
  "ok": true,
  "referrer": {
    "irref": "iRREF-12345",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@company.com"
  },
  "applicants": [
    {
      "irain": "iRAIN-12345",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@email.com",
      "status": "active"
    }
  ]
}
```

---

### POST /api/referrer/portal/feedback

Submit feedback on an applicant.

**Authentication**: Referrer JWT token

**Request** (JSON):
```json
{
  "applicantId": "iRAIN-12345",
  "feedback": "Great candidate, strong technical skills",
  "rating": 5,
  "recommend": true
}
```

---

### GET /api/referrer/portal/resume

Download applicant resume.

**Authentication**: Referrer JWT token

**Query Parameters**:
| Param | Required | Description |
|-------|----------|-------------|
| applicantId | Yes | iRAIN of applicant |

**Response**: File download (PDF/DOCX)

---

## Founder (Admin) Endpoints

All founder endpoints require authentication via the `irefair_founder` cookie.

### POST /api/founder/auth/login

Authenticate as founder.

**Rate Limit**: 5 requests / 60 seconds

**Request** (JSON):
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response**:
```json
{
  "ok": true
}
```

Sets `irefair_founder` cookie on success.

---

### POST /api/founder/auth/logout

End founder session.

**Response**: Clears session cookie

---

### GET /api/founder/applicants

List all applicants with filtering.

**Query Parameters**:
| Param | Description |
|-------|-------------|
| status | Filter by status |
| search | Search by name/email |
| limit | Max results |
| offset | Pagination offset |

**Response**:
```json
{
  "ok": true,
  "applicants": [...],
  "total": 100
}
```

---

### GET /api/founder/applicants/[irain]

Get single applicant details.

**Response**:
```json
{
  "ok": true,
  "applicant": {
    "irain": "iRAIN-12345",
    "firstName": "Jane",
    "lastName": "Smith",
    // ... all fields
  }
}
```

---

### PATCH /api/founder/applicants/[irain]

Update applicant fields.

**Request** (JSON):
```json
{
  "status": "active",
  "notes": "Updated notes"
}
```

---

### DELETE /api/founder/applicants/[irain]

Archive an applicant (soft delete).

---

### GET /api/founder/applications

List all applications.

**Query Parameters**: Same as applicants endpoint

---

### GET /api/founder/referrers

List all referrers.

---

### POST /api/founder/sync-sheets

Manually trigger Google Sheets sync.

**Response**:
```json
{
  "ok": true,
  "synced": {
    "Applicants": 150,
    "Referrers": 45,
    "Applications": 200
  }
}
```

---

### GET /api/founder/stats

Get dashboard statistics.

**Response**:
```json
{
  "ok": true,
  "stats": {
    "totalApplicants": 150,
    "activeApplicants": 120,
    "totalReferrers": 45,
    "totalApplications": 200,
    "pendingApplications": 25
  }
}
```

---

## Archive Endpoints

### GET /api/founder/archive/applicants
List archived applicants.

### POST /api/founder/archive/applicants/[irain]/restore
Restore archived applicant.

### DELETE /api/founder/archive/applicants/[irain]
Permanently delete archived applicant.

Similar endpoints exist for:
- `/api/founder/archive/applications/*`
- `/api/founder/archive/referrers/*`

---

## Cron Endpoints

These endpoints are called by scheduled jobs and require the `CRON_SECRET` header.

### GET /api/cron/sync-sheets

Sync Google Sheets data to PostgreSQL cache.

**Headers**:
```
Authorization: Bearer <CRON_SECRET>
```

---

### POST /api/cron/applicant-registration-reminders

Send reminder emails to unconfirmed applicants.

---

### POST /api/cron/cleanup-expired-applicants

Archive applicants with expired confirmation tokens.

---

## Error Codes

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## Rate Limit Headers

Rate-limited endpoints return these headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1704067200
Retry-After: 60  (only when blocked)
```
