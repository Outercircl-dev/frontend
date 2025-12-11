# IMPLEMENTATION_RULES.md

## Overview

This document defines the **architectural standards, naming conventions, code patterns, and best practices** for the OuterCircl codebase. Every developer (including Cursor during implementation) must follow these rules to maintain consistency, readability, and quality.

**Reference this file whenever implementing a Jira ticket.**

---

## 1. Project Structure & Organization

### Frontend (/src/frontend or /app)

```
/src/frontend
├── /pages                 # Next.js/React pages (route-based)
│   ├── /onboarding
│   ├── /discover
│   ├── /activities
│   ├── /profile
│   ├── /admin
│   └── _app.tsx, _document.tsx
├── /components            # Reusable React components
│   ├── /common            # Shared: Header, Footer, Nav, Modal, etc.
│   ├── /forms             # Form-specific components
│   ├── /cards             # Card components for display
│   ├── /layouts           # Layout wrappers
│   └── /icons             # SVG/icon components
├── /hooks                 # Custom React hooks
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useFeed.ts
│   ├── useActivity.ts
│   └── [feature].ts
├── /services              # API client services (fetch wrappers)
│   ├── api.ts             # Base API client config
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── activity.service.ts
│   ├── notification.service.ts
│   └── [feature].service.ts
├── /stores                # State management (Zustand/Redux/Context)
│   ├── authStore.ts
│   ├── profileStore.ts
│   ├── feedStore.ts
│   └── [feature]Store.ts
├── /types                 # TypeScript interfaces & types
│   ├── index.ts
│   ├── user.types.ts
│   ├── activity.types.ts
│   ├── api.types.ts
│   └── [domain].types.ts
├── /utils                 # Utility functions (non-business logic)
│   ├── format.ts          # Date, string formatting
│   ├── validation.ts      # Form/data validation
│   ├── constants.ts       # App-wide constants
│   └── helpers.ts
├── /styles                # Global CSS/SCSS
│   ├── globals.css
│   ├── variables.css      # CSS variables (colors, spacing)
│   ├── tailwind.config.js (if using Tailwind)
│   └── [component].module.css (component-scoped styles)
├── /public                # Static assets
│   ├── /images
│   ├── /icons
│   └── /fonts
├── next.config.js         # Next.js config (or vite.config.ts)
└── tsconfig.json
```

### Backend (/src/backend or /server)

```
/src/backend
├── /api
│   ├── /controllers       # Express/Nest controllers (request handlers)
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── activity.controller.ts
│   │   ├── notification.controller.ts
│   │   └── [domain].controller.ts
│   ├── /routes            # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── activity.routes.ts
│   │   └── index.ts (main router)
│   ├── /middleware        # Express middleware
│   │   ├── auth.middleware.ts       # JWT/session validation
│   │   ├── errorHandler.middleware.ts
│   │   ├── logging.middleware.ts
│   │   ├── validation.middleware.ts # Request validation
│   │   ├── rateLimit.middleware.ts
│   │   └── cors.middleware.ts
│   └── /validators        # Request/data validation schemas
│       ├── auth.validator.ts
│       ├── user.validator.ts
│       ├── activity.validator.ts
│       └── [domain].validator.ts
├── /services              # Business logic layer
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── profile.service.ts
│   ├── activity.service.ts
│   ├── notification.service.ts
│   ├── datafeed.service.ts        # Recommendation engine
│   ├── moderation.service.ts
│   └── [domain].service.ts
├── /repositories          # Data access layer (DB queries)
│   ├── user.repository.ts
│   ├── activity.repository.ts
│   ├── notification.repository.ts
│   └── [domain].repository.ts
├── /models                # Sequelize/Prisma/TypeORM models
│   ├── User.ts
│   ├── Activity.ts
│   ├── ActivityInstance.ts
│   ├── Notification.ts
│   ├── Rating.ts
│   └── [domain].ts
├── /types                 # TypeScript interfaces (backend)
│   ├── index.ts
│   ├── request.types.ts   # Request DTOs
│   ├── response.types.ts  # Response DTOs
│   ├── entity.types.ts    # DB entity types
│   └── [domain].types.ts
├── /config                # Configuration (DB, env, etc.)
│   ├── database.config.ts
│   ├── env.config.ts      # Load .env variables
│   ├── constants.ts
│   └── cache.config.ts (if using Redis)
├── /utils                 # Utility functions
│   ├── logger.ts          # Logging utility
│   ├── errors.ts          # Custom error classes
│   ├── response.ts        # Standard response formatter
│   ├── encryption.ts      # Hash/encrypt utilities
│   └── helpers.ts
├── /db
│   ├── /migrations        # Database migrations
│   │   ├── 001_init_schema.sql
│   │   ├── 002_user_auth.sql
│   │   ├── 003_activities.sql
│   │   ├── 004_notifications.sql
│   │   └── [NNN]_OD_XX_feature.sql (ticket-specific)
│   ├── /seeds             # Seed data for dev/testing
│   │   ├── interests.seed.sql
│   │   └── test-users.seed.sql
│   └── schema.sql         # Combined schema (reference only)
├── /tests
│   ├── /unit              # Unit tests (services, utils)
│   ├── /integration       # Integration tests (API endpoints)
│   ├── /fixtures          # Test data fixtures
│   └── setup.ts           # Test environment setup
├── /jobs                  # Background jobs (if needed)
│   ├── notificationQueue.ts
│   ├── recommendationRefresh.ts
│   └── [feature].ts
├── app.ts (or server.ts)  # Express app initialization
├── index.ts (or main.ts)  # Server entry point
├── .env.example           # Environment variable template
└── package.json
```

### Documentation & Config (Root Level)

```
/repo-root
├── /docs
│   ├── Software_Requirements_Specification.pdf  # SRS (reference)
│   ├── API_DOCUMENTATION.md     # API endpoints (auto-generated or manual)
│   ├── ARCHITECTURE.md          # System design overview
│   ├── DATABASE_SCHEMA.md       # DB schema documentation
│   ├── SETUP.md                 # Local dev setup
│   └── DEPLOYMENT.md            # Deployment guide
├── /tickets                     # Ticket-specific notes (created per sprint)
│   └── OD_80_notes.md           # For OD-80, etc.
├── CURSOR_WORKFLOW.md           # This file (workflow)
├── IMPLEMENTATION_RULES.md      # This file (conventions)
├── .github
│   ├── /workflows
│   │   ├── ci.yml               # GitHub Actions for testing
│   │   └── deploy.yml           # Deployment pipeline
│   └── PULL_REQUEST_TEMPLATE.md # PR template
├── .env.example                 # Environment template
├── docker-compose.yml           # Local dev environment
├── Makefile                     # Common commands
└── README.md                    # Project overview
```

---

## 2. Naming Conventions

### Files & Folders

| Item | Convention | Example |
|------|-----------|---------|
| **Folders** | kebab-case | `/onboarding`, `/user-profile`, `/admin-dashboard` |
| **Component files** | PascalCase, one component per file | `UserProfile.tsx`, `ActivityCard.tsx` |
| **Service files** | camelCase + `.service.ts` | `authService.ts`, `feedService.ts` |
| **Hook files** | `use` + PascalCase | `useAuth.ts`, `useActivity.ts`, `useFeed.ts` |
| **Type files** | camelCase + `.types.ts` | `userTypes.ts`, `apiTypes.ts` |
| **Controller files** | [domain] + `.controller.ts` | `authController.ts`, `userController.ts` |
| **Route files** | [domain] + `.routes.ts` | `authRoutes.ts`, `activityRoutes.ts` |
| **Validator files** | [domain] + `.validator.ts` | `authValidator.ts`, `profileValidator.ts` |
| **Migration files** | `NNN_OD_XX_description.sql` | `001_init_schema.sql`, `042_OD_80_user_profiles.sql` |
| **Test files** | `[subject].test.ts` or `.spec.ts` | `authService.test.ts`, `UserProfile.spec.tsx` |

### Functions & Variables

| Item | Convention | Example |
|------|-----------|---------|
| **Functions** | camelCase | `fetchUserProfile()`, `validateEmail()`, `handleActivityJoin()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_ACTIVITY_SIZE`, `API_BASE_URL`, `ERROR_MESSAGES` |
| **Variables** | camelCase | `userData`, `activityList`, `isLoading` |
| **Boolean variables** | `is`/`has`/`can` + descriptor | `isLoading`, `hasError`, `canCreateActivity` |
| **Class names** | PascalCase | `User`, `Activity`, `AuthService` |
| **Database tables** | snake_case, plural | `users`, `activities`, `notifications` |
| **Database columns** | snake_case | `user_id`, `created_at`, `is_verified` |
| **Environment variables** | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET`, `API_PORT` |

### API Endpoints

| Verb | Pattern | Example |
|------|---------|---------|
| **GET** (fetch) | `/v1/[resource]` or `/v1/[resource]/:id` | `GET /v1/activities`, `GET /v1/activities/abc-123` |
| **POST** (create) | `POST /v1/[resource]` | `POST /v1/activities` |
| **PUT** (replace) | `PUT /v1/[resource]/:id` | `PUT /v1/activities/abc-123` |
| **PATCH** (update) | `PATCH /v1/[resource]/:id` | `PATCH /v1/activities/abc-123` |
| **DELETE** | `DELETE /v1/[resource]/:id` | `DELETE /v1/activities/abc-123` |

**Versioning**: Always include `/v1` prefix (allows future API versioning without breaking clients).

---

## 3. Code Style & Patterns

### TypeScript

#### Strict Mode Required

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true
  }
}
```

#### Type Definitions

**Always define types explicitly; avoid `any`.**

```typescript
// ✓ GOOD
interface User {
  id: string;
  email: string;
  interests: string[];
  createdAt: Date;
}

type ActivityStatus = 'draft' | 'published' | 'completed' | 'cancelled';

// ✗ BAD
const user: any = fetchUser();
let status = 'active';  // Type inferred; unclear
```

#### Naming Pattern for Types

```typescript
// Entity types (from DB)
interface User { ... }
interface Activity { ... }

// Request/Response DTOs (for API)
interface CreateUserRequest { ... }
interface UserResponse { ... }

// Utility types
type Optional<T> = T | null;
type Paginated<T> = { items: T[]; total: number; page: number };

// Enums (if appropriate)
enum UserRole {
  MEMBER = 'member',
  HOST = 'host',
  ADMIN = 'admin',
}
```

### Frontend: React Components

#### Functional Components Only

```typescript
// ✓ GOOD - Functional with hooks
import { useState } from 'react';

interface UserProfileProps {
  userId: string;
  onSave: (profile: UserProfile) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onSave }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  return (
    <div className="user-profile">
      {/* Component JSX */}
    </div>
  );
};
```

#### Props Destructuring & Typing

```typescript
// ✓ GOOD
interface ActivityCardProps {
  activity: Activity;
  onJoin: (activityId: string) => void;
  isLoading?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onJoin,
  isLoading = false,
}) => {
  return <div>...</div>;
};

// ✗ BAD - No type annotation
const ActivityCard = ({ activity, onJoin }) => {
  return <div>...</div>;
};
```

#### Custom Hooks Convention

```typescript
// ✓ GOOD - Reusable hook
export const useActivity = (activityId: string) => {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity(activityId)
      .then(setActivity)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [activityId]);

  return { activity, isLoading, error };
};
```

### Backend: Express/Nest Controllers

#### Controller Pattern (Express)

```typescript
// authController.ts
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export const authController = (app: Router) => {
  const authService = new AuthService();

  // POST /v1/auth/register
  app.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      
      // Validation should be in middleware
      const user = await authService.register(email, password);
      
      return res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error); // Pass to error handler middleware
    }
  });
};
```

#### Service Layer Pattern

```typescript
// authService.ts
import { UserRepository } from '../repositories/user.repository';
import { encryptPassword, comparePassword } from '../utils/encryption';

export class AuthService {
  private userRepository = new UserRepository();

  async register(email: string, password: string): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await encryptPassword(password);

    // Create user
    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
    });

    return user;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateJWT(user.id);
    return { user, token };
  }
}
```

#### Repository Layer Pattern (Data Access)

```typescript
// userRepository.ts
import { User } from '../models/User';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return User.findByPk(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  async create(data: Partial<User>): Promise<User> {
    return User.create(data);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    return user.update(data);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    await user.destroy();
  }
}
```

#### Middleware: Error Handling

```typescript
// errorHandler.middleware.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err.message);

  // Map custom errors to HTTP status codes
  if (err.message === 'User not found') {
    return res.status(404).json({ success: false, error: err.message });
  }

  if (err.message === 'Invalid credentials') {
    return res.status(401).json({ success: false, error: err.message });
  }

  // Generic server error
  res.status(500).json({ success: false, error: 'Internal server error' });
};
```

#### Middleware: Request Validation

```typescript
// validation.middleware.ts
import { body, validationResult } from 'express-validator';

export const validateRegister = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be ≥8 chars'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// Usage in route:
app.post('/auth/register', validateRegister, authController.register);
```

---

## 4. Database Conventions

### Migrations

**File Naming**: `NNN_OD_XX_description.sql`
- `NNN`: Sequential number (001, 002, 042, etc.)
- `OD_XX`: Jira ticket ID (if feature-specific)
- `description`: Brief descriptive name

```sql
-- /db/migrations/042_OD_80_user_profiles.sql

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Profile data
  interests JSONB DEFAULT '[]'::jsonb,  -- Array of interest IDs/strings
  hobbies TEXT[] DEFAULT ARRAY[]::TEXT[],
  bio TEXT,
  profile_pic_url VARCHAR(512),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT interests_not_empty CHECK (jsonb_array_length(interests) > 0 OR interests = '[]'::jsonb)
);

-- Indexes for query performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

### Table Design Rules

1. **All tables have**: `id UUID`, `created_at`, `updated_at` (unless joining table)
2. **Foreign keys**: `[entity]_id`, reference with `ON DELETE CASCADE` or `RESTRICT`
3. **Boolean columns**: `is_[adjective]` (e.g., `is_verified`, `is_active`)
4. **Timestamps**: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
5. **String columns**: Use appropriate lengths (VARCHAR(255), TEXT for unbounded)
6. **JSON columns**: Use JSONB in PostgreSQL (not JSON)

```sql
-- ✓ GOOD
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  max_participants INT CHECK (max_participants > 0),
  is_public BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✗ BAD
CREATE TABLE activity (  -- Singular (should be plural)
  id INT AUTO_INCREMENT,  -- Use UUID, not INT
  hostId VARCHAR(36),  -- camelCase (should be snake_case)
  title VARCHAR,  -- No length specified
  isPublic INT,  -- Store boolean as INT (should be BOOLEAN)
  createdAt DATETIME  -- camelCase
);
```

### Indexes Strategy

- Index **foreign keys** (for JOINs)
- Index **frequently searched columns** (email, user_id, etc.)
- Index **frequently sorted columns** (created_at for feeds)
- Avoid over-indexing (performance cost during writes)

```sql
-- ✓ Index these
CREATE INDEX idx_activities_host_id ON activities(host_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_users_email ON users(email);

-- ✗ Don't index everything
CREATE INDEX idx_activities_description ON activities(description);  -- Too large
```

---

## 5. API Response & Error Handling

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { /* actual data */ },
  "meta": {
    "timestamp": "2025-12-04T15:45:00Z",
    "version": "v1"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "message": "Email already in use"
  },
  "meta": {
    "timestamp": "2025-12-04T15:45:00Z"
  }
}
```

### Response Helper (Backend)

```typescript
// utils/response.ts
export const sendSuccess = (res: Response, data: any, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  });
};

export const sendError = (res: Response, message: string, code: string, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

// Usage
res.post('/auth/login', async (req, res) => {
  try {
    const { user, token } = await authService.login(req.body.email, req.body.password);
    sendSuccess(res, { user, token }, 200);
  } catch (error) {
    sendError(res, error.message, 'AUTH_FAILED', 401);
  }
});
```

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|------------|
| **200** | OK | Successful GET, PATCH, PUT |
| **201** | Created | Successful POST (resource created) |
| **204** | No Content | DELETE successful, no body needed |
| **400** | Bad Request | Invalid input, validation failed |
| **401** | Unauthorized | Auth required but missing/invalid |
| **403** | Forbidden | Auth valid, but insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource already exists (e.g., duplicate email) |
| **422** | Unprocessable | Data validation failed |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Server Error | Unhandled exception |

---

## 6. Validation & Error Handling

### Frontend: Form Validation

```typescript
// hooks/useForm.ts
interface UseFormResult<T> {
  values: T;
  errors: Record<keyof T, string>;
  isValid: boolean;
  setField: (key: keyof T, value: any) => void;
  submit: (onSubmit: (values: T) => Promise<void>) => Promise<void>;
}

export const useForm = <T>(
  initialValues: T,
  validate: (values: T) => Record<keyof T, string>
): UseFormResult<T> => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (key: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (onSubmit: (values: T) => Promise<void>) => {
    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        setErrors((prev) => ({ ...prev, submit: error.message }));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return {
    values,
    errors,
    isValid: Object.keys(errors).length === 0,
    setField,
    submit,
  };
};
```

### Backend: Validation Rules (express-validator)

```typescript
// validators/user.validator.ts
import { body } from 'express-validator';

export const validateUserRegistration = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain number'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be ≤100 characters'),
];

export const validateUserProfileUpdate = [
  body('interests')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Interests must be array with ≥1 item'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be ≤500 characters'),
];
```

### Custom Error Classes

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 422);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

// Usage
if (!user) {
  throw new NotFoundError('User');
}

if (!hasPermission) {
  throw new UnauthorizedError('You do not have permission');
}
```

---

## 7. Authentication & Authorization

### JWT Token Format

```typescript
// utils/jwt.ts
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  role: 'member' | 'host' | 'admin';
  iat: number;
  exp: number;
}

export const generateToken = (user: User): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
};
```

### Auth Middleware

```typescript
// middleware/auth.middleware.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];  // "Bearer <token>"
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = verifyToken(token);
    req.user = payload;  // Attach to request
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Usage in route
app.get('/v1/profile', authenticate, profileController.getProfile);
```

### Role-Based Access Control (RBAC)

```typescript
// middleware/authorize.middleware.ts
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }
    next();
  };
};

// Usage
app.delete(
  '/v1/activities/:id',
  authenticate,
  authorize(['admin', 'host']),
  activityController.deleteActivity
);
```

---

## 8. Performance & Caching

### Query Optimization

```typescript
// ✓ GOOD - Select only needed fields
const users = await User.findAll({
  attributes: ['id', 'email', 'name'],  // Don't fetch password, bio, etc.
  where: { isActive: true },
});

// ✗ BAD - N+1 query problem
for (const activity of activities) {
  const host = await User.findByPk(activity.hostId);  // Query per iteration
}

// ✓ GOOD - Eager load with association
const activities = await Activity.findAll({
  include: ['host'],  // Fetch host in single query
});
```

### Pagination

```typescript
// Service layer
export async function getActivities(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;

  const { count, rows } = await Activity.findAndCountAll({
    offset,
    limit,
    order: [['createdAt', 'DESC']],
  });

  return {
    items: rows,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    },
  };
}

// API response
res.json({
  success: true,
  data: activities.items,
  pagination: activities.pagination,
});
```

### Caching (Redis)

```typescript
// services/cache.service.ts
import Redis from 'ioredis';

export class CacheService {
  private redis = new Redis(process.env.REDIS_URL);

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, expirySeconds: number = 3600) {
    await this.redis.setex(key, expirySeconds, JSON.stringify(value));
  }

  async invalidate(key: string) {
    await this.redis.del(key);
  }
}

// Usage in service
export class ActivityService {
  private cache = new CacheService();

  async getActivity(id: string) {
    const cacheKey = `activity:${id}`;
    let activity = await this.cache.get(cacheKey);

    if (!activity) {
      activity = await activityRepository.findById(id);
      if (activity) {
        await this.cache.set(cacheKey, activity, 3600);  // Cache 1 hour
      }
    }

    return activity;
  }
}
```

---

## 9. Testing Standards

### Unit Tests (Jest)

```typescript
// tests/services/auth.service.test.ts
import { AuthService } from '../../src/services/auth.service';
import { UserRepository } from '../../src/repositories/user.repository';

jest.mock('../../src/repositories/user.repository');

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepository = new UserRepository() as jest.Mocked<UserRepository>;
    authService = new AuthService();
  });

  describe('login', () => {
    it('should return user and token on valid credentials', async () => {
      const user = { id: '1', email: 'test@example.com', password: 'hashed' };
      userRepository.findByEmail.mockResolvedValue(user);

      const result = await authService.login('test@example.com', 'password');

      expect(result.user).toEqual(user);
      expect(result.token).toBeDefined();
    });

    it('should throw on invalid email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login('invalid@example.com', 'password')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });
});
```

### Component Tests (React Testing Library)

```typescript
// tests/components/UserProfile.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfile } from '../../src/components/UserProfile';

describe('UserProfile', () => {
  it('should render profile form', () => {
    render(<UserProfile userId="1" onSave={jest.fn()} />);
    
    expect(screen.getByLabelText(/interests/i)).toBeInTheDocument();
  });

  it('should call onSave when form submitted', async () => {
    const onSave = jest.fn();
    render(<UserProfile userId="1" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// tests/integration/auth.integration.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Auth Integration', () => {
  it('POST /v1/auth/register should create user', async () => {
    const response = await request(app)
      .post('/v1/auth/register')
      .send({ email: 'test@example.com', password: 'SecurePass123' });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe('test@example.com');
  });
});
```

### Test Coverage Targets

- **Services**: ≥80% coverage
- **Components**: ≥70% coverage
- **Integration**: Key user flows covered

---

## 10. Security Best Practices

### Input Sanitization

```typescript
// ✓ GOOD - Sanitize before storing/displaying
import DOMPurify from 'dompurify';

const sanitizedBio = DOMPurify.sanitize(userInput);
await userRepository.update(userId, { bio: sanitizedBio });

// Frontend: Use textContent instead of innerHTML
element.textContent = userBio;  // Safe
// element.innerHTML = userBio;  // Unsafe - XSS risk
```

### Password Security

```typescript
// ✓ GOOD - Hash passwords
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(plainPassword, 10);
const isValid = await bcrypt.compare(plainPassword, hashedPassword);

// ✗ BAD - Never store plaintext
const user = await User.create({ email, password: plainPassword });  // NO!
```

### Rate Limiting

```typescript
// middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts
  message: 'Too many login attempts, try again later',
  keyGenerator: (req) => req.ip,  // Rate limit by IP
});

app.post('/v1/auth/login', loginLimiter, authController.login);
```

### CORS Configuration

```typescript
// Express CORS setup
import cors from 'cors';

const allowedOrigins = [
  process.env.FRONTEND_URL,  // React app
  'https://outercircl.io',   // Production domain
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

### Environment Variables

```bash
# .env.example (committed to repo)
DATABASE_URL=
JWT_SECRET=
API_PORT=3000
LOG_LEVEL=info

# .env (NOT committed - local only)
DATABASE_URL=postgresql://user:pass@localhost/outercircl_dev
JWT_SECRET=your-secret-key-here-min-32-chars
API_PORT=3000
LOG_LEVEL=debug
```

---

## 11. Logging & Monitoring

### Logging Pattern

```typescript
// utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Usage
logger.info('User registered', { userId: user.id, email: user.email });
logger.error('Database connection failed', { error: error.message });
logger.warn('Rate limit exceeded', { ip: req.ip });
```

### Key Events to Log

- ✓ User registration, login, logout
- ✓ Activity creation, modification
- ✓ Admin actions (moderation, bans)
- ✓ API errors, exceptions
- ✓ Payment transactions
- ✗ Don't log passwords, tokens, sensitive data

---

## 12. Quick Reference: Cursor Checklists

### Before Starting Implementation

- [ ] You're on branch: `feature/OD-XX-<slug>` (not on main)
- [ ] `/IMPLEMENTATION_RULES.md` is open/pinned in Cursor context
- [ ] `/CURSOR_WORKFLOW.md` is available for reference
- [ ] Jira ticket copied (Title, Description, AC, Subtasks)
- [ ] SRS (`/docs/Software_Requirements_Specification.pdf`) pinned if relevant

### During Implementation

- [ ] Following naming conventions from Section 2
- [ ] Types defined explicitly (no `any`)
- [ ] Components/services follow patterns in Section 3
- [ ] No console.log() debug statements (use logger)
- [ ] Tests written alongside code
- [ ] No hardcoded values (use constants or env vars)
- [ ] Error handling implemented (try-catch, custom errors)
- [ ] Database migrations numbered correctly
- [ ] No breaking changes to existing APIs

### Before Committing

- [ ] All tests passing: `npm test -- --testPathPattern="OD_XX"`
- [ ] Build succeeds: `npm build` (or `tsc --noEmit`)
- [ ] Linting passes: `npm lint` (or `eslint .`)
- [ ] Commit message: `OD-XX: <verb> <object>`
- [ ] No console.log() statements in code
- [ ] No `.env` file committed (only `.env.example`)
- [ ] No node_modules/ or dist/ in commits

### PR Review Checklist (For Reviewer)

- [ ] Branch name follows convention: `feature/OD-XX-<slug>`
- [ ] Commits are logical and focused
- [ ] PR description complete (SRS mapping, testing, risk)
- [ ] All tests passing (GH Actions green)
- [ ] Code follows IMPLEMENTATION_RULES.md
- [ ] No unrelated refactors
- [ ] Database migrations valid & tested
- [ ] APIs match documented contracts
- [ ] Security review: no hardcoded secrets, input sanitization, etc.

---

## Summary

✅ **This file defines the rule set that Cursor must follow**

- Cursor will read this file as context before implementing any ticket
- When Cursor suggests code, it must match patterns in Section 3
- When naming files/functions, refer to Section 2
- When building APIs, follow Section 5
- When designing databases, follow Section 4

**Use this as your "Cursor guardrails" document.**

---

## Quick Links (Within This Document)

- [Project Structure](#1-project-structure--organization) → Where files go
- [Naming Conventions](#2-naming-conventions) → How to name things
- [Code Patterns](#3-code-style--patterns) → How to write code
- [Database](#4-database-conventions) → How to design DB tables
- [API Standards](#5-api-response--error-handling) → How APIs respond
- [Security](#10-security-best-practices) → How to keep code secure
- [Testing](#9-testing-standards) → How to write tests
- [Checklist](#12-quick-reference-cursor-checklists) → Pre-commit checklist
