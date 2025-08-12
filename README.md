# 🎖️ Chore Champion

A gamified family chore management platform that transforms household tasks into exciting missions for children while providing parents with powerful management tools.

## Features

- **Dual Dashboard System**: Separate interfaces for parents and children
- **Army Rank Progression**: 9 unique ranks from Recruit Rascal to Supreme Commander
- **AI Voice Coach**: Personalized encouragement with selectable character voices
- **Flexible Reward System**: Custom rewards linked to points and ranks
- **Real-time Progress Tracking**: Monitor completion rates and streaks
- **Multi-child Management**: Support for multiple children per family

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI Integration**: OpenAI API (for enhanced voice coaching)
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chore-champion
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials and OpenAI API key in `.env.local`.

4. Set up the database:
   - Create a new Supabase project
   - Run the SQL commands from `supabase/schema.sql` in your Supabase SQL editor
   - Enable Row Level Security policies

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### For Parents

1. **Sign up** as a parent account
2. **Add children** by creating child accounts with credentials
3. **Create chores** with point values and assign them to specific children or leave unassigned
4. **Set up rewards** that children can unlock with points and ranks
5. **Review and approve** completed chores to award points
6. **Monitor progress** through the parent dashboard

### For Children

1. **Log in** with credentials provided by parents
2. **View available missions** (chores) in the Mission Hub
3. **Complete chores** and submit for parent approval
4. **Track progress** toward the next army rank
5. **Interact with AI Voice Coach** for encouragement and guidance
6. **View unlocked rewards** based on points and rank achievements

## Army Ranks

1. **Recruit Rascal** (0 points) - Just starting the journey
2. **Task Trooper** (50 points) - Getting the hang of helping
3. **Chore Corporal** (150 points) - Reliable household helper
4. **Duty Sergeant** (300 points) - Leading by example
5. **Mission Major** (500 points) - True household hero
6. **Captain Clean** (750 points) - Master of maintaining order
7. **Colonel Capable** (1000 points) - Exceptionally skilled
8. **General Great** (1500 points) - Legendary household leader
9. **Supreme Commander** (2000 points) - Ultimate chore champion

## Database Schema

The application uses the following main tables:
- `profiles` - User accounts (parents and children)
- `chores` - Household tasks with point values
- `chore_completions` - Tracking of completed chores
- `rewards` - Custom rewards set by parents

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue on GitHub or contact the development team.