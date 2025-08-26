# Technology Stack

## Framework & Runtime
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Node.js 18+** runtime environment

## Backend & Database
- **Supabase** for backend services:
  - PostgreSQL database with Row Level Security (RLS)
  - Authentication and user management
  - Real-time subscriptions
  - Edge functions for serverless API routes

## Styling & UI
- **Tailwind CSS** for styling with custom army theme colors
- **Headless UI** for accessible components
- **Heroicons** for iconography
- **Framer Motion** for animations
- **Lucide React** for additional icons

## AI & Voice Integration
- **Google Gemini AI** (via @google/generative-ai) for AI coaching
- **ElevenLabs** for text-to-speech voice generation
- **AssemblyAI** for speech recognition capabilities

## Development & Testing
- **TypeScript** for type safety
- **Jest** with React Testing Library for unit/integration tests
- **ESLint** with Next.js configuration for code quality

## Deployment & Hosting
- **Netlify** as primary deployment platform
- **Vercel** as recommended alternative
- Environment variables managed through `.env.local`

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Database
- Use Supabase dashboard for schema changes
- Run `supabase/schema.sql` for initial setup
- RLS policies are enforced for data security

## Architecture Patterns
- Server Components for data fetching
- Client Components for interactivity (marked with "use client")
- API routes in `app/api/` directory
- Shared utilities in `lib/` directory
- Reusable components in `components/` directory