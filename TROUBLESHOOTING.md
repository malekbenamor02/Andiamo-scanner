# Troubleshooting Guide

## The Issue: "Invalid credentials or account not approved"

This error means the scanner app can't find the ambassador account in the database. Here's how to fix it:

## Step 1: Check Your Supabase Credentials

1. **Open your Supabase project dashboard**
2. **Go to Settings > API**
3. **Copy these values:**
   - Project URL (looks like: `https://abc123.supabase.co`)
   - anon/public key (starts with `eyJ...`)

## Step 2: Set Up Environment Variables

Create a `.env` file in the `scanner-app` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual values from Step 1.

## Step 3: Test the Connection

1. **Open the test page:**
   ```
   scanner-app/test.html
   ```
   
2. **Enter your Supabase URL and Key**
3. **Click "Test Connection"**
4. **Check if it shows "✅ Connection successful!"**

## Step 4: Create the Test Ambassador

If the connection works but you get "Ambassador not found", run this SQL in your Supabase SQL editor:

```sql
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

## Step 5: Verify the Ambassador

1. **Go to your Supabase dashboard**
2. **Navigate to Table Editor**
3. **Select the `ambassadors` table**
4. **Look for the test ambassador with phone `27169458`**

## Step 6: Test the Login

1. **Start the scanner app:**
   ```bash
   npm run dev
   ```

2. **Open the app in your browser**
3. **Try logging in with:**
   - Phone: `27169458`
   - Password: `1234567890`

## Common Issues & Solutions

### Issue 1: "Connection failed"
- **Solution:** Check your Supabase URL and Key
- **Make sure:** You're using the anon/public key, not the service role key

### Issue 2: "Ambassadors table error"
- **Solution:** The table doesn't exist
- **Fix:** Run the ambassadors table migration from the main project

### Issue 3: "Ambassador not found"
- **Solution:** The test account doesn't exist
- **Fix:** Run the SQL insert command above

### Issue 4: "Account not approved"
- **Solution:** The ambassador status is not 'approved'
- **Fix:** Update the status in the database:
  ```sql
  UPDATE ambassadors 
  SET status = 'approved' 
  WHERE phone = '27169458';
  ```

### Issue 5: Phone number format
- **Solution:** The phone number must be exactly 8 digits
- **Format:** Must start with 2, 5, 9, or 4
- **Example:** `27169458` ✅, `+21627169458` ❌

## Quick Test

Use this simple test to verify everything is working:

1. **Open browser console** (F12)
2. **Paste this code:**
```javascript
// Replace with your actual credentials
const supabase = window.supabase.createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Test the connection
supabase.from('ambassadors')
  .select('*')
  .eq('phone', '27169458')
  .then(({data, error}) => {
    if (error) console.error('Error:', error);
    else console.log('Ambassador found:', data);
  });
```

## Still Having Issues?

1. **Check browser console** for error messages
2. **Verify Supabase project** is active and not paused
3. **Check RLS policies** - make sure ambassadors table allows public read
4. **Try a different browser** or incognito mode
5. **Clear browser cache** and try again 