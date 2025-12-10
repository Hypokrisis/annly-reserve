# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in project details:
   - Name: annly-reserve
   - Database Password: (generate a strong password)
   - Region: Choose closest to your location
5. Wait for project to be created

## 2. Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## 3. Configure Environment Variables

1. In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 4. Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the migration

This will create:
- 8 tables (businesses, users_businesses, barbers, services, barbers_services, schedules, appointments, notifications)
- All necessary indexes
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates

## 5. Verify Database Setup

1. Go to **Table Editor** in Supabase
2. You should see all 8 tables listed
3. Click on each table to verify the structure

## 6. Test Connection

Run the development server:
```bash
npm run dev
```

The app should connect to Supabase without errors.

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env` file exists in project root
- Verify the variable names match exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after changing `.env`

### SQL migration errors
- Make sure you're running the query in the correct project
- Check that you copied the entire SQL file
- If tables already exist, you may need to drop them first (⚠️ this will delete data)

### RLS policy errors
- Policies are automatically created by the migration
- If you need to modify them, go to **Authentication** → **Policies** in Supabase
