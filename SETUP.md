# RILO Setup Guide

## Environment Configuration

Before running the app, you need to set up your environment variables.

### 1. Create `.env` file

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Add your Supabase credentials

Edit `.env` and replace the placeholder values with your actual Supabase project credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

You can find these values in your Supabase project dashboard:
- Go to **Settings** → **API**
- Copy the **Project URL** and **Anon Key**

### 3. Install dependencies

```bash
npm install
```

### 4. Run the app

```bash
npm start
```

Then select your platform:
- `a` for Android
- `i` for iOS
- `w` for web

## Security Notes

- **Never commit `.env` file** — it's in `.gitignore`
- **Never share your Supabase anon key** publicly
- The `.env.example` file is safe to commit and shows the required variables
- For production, use environment-specific `.env.production.local` files

## Troubleshooting

If you get "Missing Supabase credentials" error:
1. Verify `.env` file exists in the project root
2. Check that both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set
3. Restart the dev server after updating `.env`
