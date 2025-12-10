# Quick Start - Deployment Commands

## 1. Setup Supabase Database

1. Go to https://supabase.com and create a project
2. Copy the SQL from `supabase/migrations/001_initial_schema.sql`
3. Paste and run in Supabase SQL Editor
4. Get your credentials from Settings → API

## 2. Configure Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Test Locally

```bash
npm install
npm run dev
```

Visit http://localhost:5173 and test signup/login

## 4. Deploy to Netlify

### Option A: GitHub (Recommended)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/annly-reserve.git
git push -u origin main
```

Then:
1. Go to https://app.netlify.com
2. Import from GitHub
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Option B: Manual Deploy

```bash
npm run build
```

Drag the `dist` folder to Netlify

## 5. Test Production

1. Create account at `https://your-site.netlify.app/signup`
2. Add services, barbers, and schedules
3. Test booking at `https://your-site.netlify.app/book/your-slug`

## Troubleshooting

**Build fails:** Check that all dependencies are in package.json
**Can't login:** Verify Supabase credentials in Netlify environment variables
**No available slots:** Configure barber schedules in dashboard

See DEPLOYMENT.md for detailed instructions.
