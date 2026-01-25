# Contributing to iRefair

Thank you for your interest in contributing to iRefair!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Follow the [Setup Guide](./SETUP.md) to configure your environment
4. Create a branch for your changes

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-user-dashboard`
- `fix/login-validation-error`
- `docs/update-api-reference`
- `refactor/simplify-auth-flow`

### Code Style

- **TypeScript**: All code should be written in TypeScript
- **Formatting**: Code is formatted automatically (Prettier via ESLint)
- **Linting**: Run `npm run lint` before committing
- **Naming**:
  - Components: PascalCase (`UserProfile.tsx`)
  - Utilities: camelCase (`formatDate.ts`)
  - Constants: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)

### Commit Messages

Write clear, descriptive commit messages:

```
feat: add email notification for new applications
fix: resolve rate limiting bypass on login
docs: update API reference with new endpoints
refactor: simplify applicant lookup logic
test: add tests for founder authentication
```

Prefixes:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

All new features should include tests. Place test files in `__tests__` directories:

```
src/lib/
├── myFunction.ts
└── __tests__/
    └── myFunction.test.ts
```

Example test structure:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { myFunction } from '../myFunction';

describe('myFunction', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should handle normal case', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('should handle edge case', () => {
    expect(myFunction('')).toBeNull();
  });
});
```

### Test Coverage

Minimum coverage thresholds:
- Lines: 35%
- Functions: 35%
- Branches: 25%
- Statements: 35%

New code should maintain or improve coverage.

## Pull Requests

### Before Submitting

1. Ensure all tests pass: `npm test`
2. Ensure linting passes: `npm run lint`
3. Ensure build succeeds: `npm run build`
4. Update documentation if needed
5. Add tests for new functionality

### PR Description

Include in your PR description:
- What changes were made
- Why the changes were needed
- How to test the changes
- Screenshots (for UI changes)

### Review Process

1. Submit PR against `dev` branch
2. Automated checks run (tests, lint, build)
3. Code review by maintainers
4. Address feedback if any
5. PR merged after approval

## Code Organization

### Directory Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── (founder)/          # Founder dashboard (protected)
│   ├── api/                # API endpoints
│   └── [page]/             # Public pages
├── components/             # React components
│   ├── founder/            # Dashboard-specific
│   └── [shared]/           # Shared components
└── lib/                    # Utility functions
    └── __tests__/          # Unit tests
```

### Adding New Features

1. **API Endpoints**: Add to `src/app/api/`
2. **Components**: Add to `src/components/`
3. **Utilities**: Add to `src/lib/`
4. **Tests**: Add to corresponding `__tests__/` directory
5. **Docs**: Update relevant documentation

### Component Guidelines

- Use functional components with hooks
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use TypeScript for all props

```typescript
type ButtonProps = {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
};

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button className={styles[variant]} onClick={onClick}>
      {children}
    </button>
  );
}
```

### API Route Guidelines

- Validate all inputs
- Return consistent response format
- Handle errors gracefully
- Include rate limiting for public endpoints

```typescript
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateResult = await rateLimit(request, RATE_LIMITS.endpoint);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rateResult) }
      );
    }

    // Validation
    const body = await request.json();
    if (!body.required_field) {
      return NextResponse.json(
        { ok: false, error: 'Missing required field' },
        { status: 400 }
      );
    }

    // Business logic
    const result = await doSomething(body);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Security

### Sensitive Data

- Never commit secrets or credentials
- Use environment variables for configuration
- Validate and sanitize all user input
- Use parameterized queries (Prisma handles this)

### Authentication

- All founder endpoints must use `requireFounder()`
- Referrer portal endpoints must verify JWT tokens
- Public endpoints should have rate limiting

## Questions?

- Check existing documentation in `docs/`
- Open an issue for bugs or feature requests
- Reach out to maintainers for guidance
