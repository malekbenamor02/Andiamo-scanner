# Scanner App Setup Guide

## 1. Environment Configuration

Create a `.env` file in the scanner-app directory with your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# App Configuration
VITE_APP_NAME=Andiamo Scanner
VITE_APP_VERSION=1.0.0
```

## 2. Database Setup

### Create Test Ambassador Account

Run this SQL in your Supabase SQL editor:

```sql
-- Create a test ambassador account for the scanner app
-- Phone: 27169458
-- Password: 1234567890
-- Status: approved

INSERT INTO ambassadors (
  full_name,
  phone,
  password,
  city,
  status,
  commission_rate,
  created_at,
  updated_at
) VALUES (
  'Test Ambassador',
  '27169458',
  '1234567890',
  'Tunis',
  'approved',
  10.00,
  NOW(),
  NOW()
) ON CONFLICT (phone) DO UPDATE SET
  password = EXCLUDED.password,
  status = EXCLUDED.status,
  updated_at = NOW();
```

## 3. Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key
4. Update the `.env` file with these values

## 4. Start the Application

```bash
cd scanner-app
npm install
npm run dev
```

## 5. Test Login

Use these credentials to test the scanner:
- **Phone**: 27169458
- **Password**: 1234567890

## 6. Troubleshooting

### If you get "Invalid credentials" error:
1. Make sure the ambassador account exists in the database
2. Check that the phone number format is correct (8 digits starting with 2,5,9,4)
3. Verify the password matches exactly
4. Ensure the account status is 'approved'

### If camera doesn't work:
1. Make sure you're using HTTPS (required for camera access)
2. Check browser permissions for camera access
3. Try refreshing the page

### If offline storage doesn't work:
1. Check browser console for IndexedDB errors
2. Ensure the browser supports IndexedDB
3. Try clearing browser cache

## 7. Production Deployment

For production deployment:

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service

3. Set environment variables in your hosting platform

4. Ensure HTTPS is enabled (required for camera access) 