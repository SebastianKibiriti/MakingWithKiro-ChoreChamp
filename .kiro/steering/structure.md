# Project Structure

## Directory Organization

### `/app` - Next.js App Router
- **`/api`** - API route handlers for backend functionality
- **`/auth`** - Authentication pages and flows
- **`/child`** - Child-specific pages and dashboards
- **`/parent`** - Parent-specific pages and dashboards
- **`/components`** - App-specific components (consider moving to root `/components`)
- **`globals.css`** - Global styles and Tailwind imports
- **`layout.tsx`** - Root layout with AuthProvider
- **`page.tsx`** - Landing/home page

### `/components` - Reusable UI Components
- Component files use PascalCase naming (e.g., `DashboardLayout.tsx`)
- Each component should be self-contained with TypeScript interfaces
- Test files in `__tests__/` subdirectory

### `/lib` - Shared Utilities & Configuration
- **`auth-context.tsx`** - Authentication context provider
- **`supabase.ts`** - Supabase client configuration
- **`hooks/`** - Custom React hooks
- **`ranks.ts`** - Rank system logic and definitions
- **`rate-limiter.ts`** - API rate limiting utilities

### `/supabase` - Database Schema
- **`schema.sql`** - Complete database schema with RLS policies
- Migration files and database-related scripts

### Configuration Files
- **`.env.local`** - Environment variables (not committed)
- **`.env.local.example`** - Template for required environment variables
- **`next.config.js`** - Next.js configuration with optimizations
- **`tailwind.config.js`** - Tailwind CSS configuration with army theme
- **`tsconfig.json`** - TypeScript configuration with path aliases

## Naming Conventions

### Files & Directories
- React components: PascalCase (e.g., `AIVoiceCoach.tsx`)
- Utility files: kebab-case (e.g., `rate-limiter.ts`)
- API routes: kebab-case (e.g., `ai-coach/route.ts`)
- Pages: lowercase (e.g., `dashboard/page.tsx`)

### Code Conventions
- TypeScript interfaces: PascalCase with descriptive names
- Component props: Use interface definitions
- Database types: Import from generated Supabase types
- CSS classes: Tailwind utility classes preferred over custom CSS

## Architecture Patterns

### Component Structure
```
components/
├── ComponentName.tsx          # Main component
├── __tests__/
│   └── ComponentName.test.tsx # Component tests
└── index.ts                   # Optional barrel export
```

### Page Structure
```
app/
├── role/
│   ├── dashboard/
│   │   └── page.tsx          # Route page
│   └── layout.tsx            # Role-specific layout
└── api/
    └── endpoint/
        └── route.ts          # API handler
```

### Data Flow
- Server Components for initial data fetching
- Client Components for user interactions
- Supabase client for database operations
- Context providers for shared state (auth, user profile)
- API routes for complex server-side operations (AI, external APIs)

## Import Patterns
- Use path aliases: `@/components`, `@/lib`, `@/app`
- Group imports: React, Next.js, third-party, local
- Prefer named exports over default exports for utilities
- Use barrel exports (`index.ts`) for component directories