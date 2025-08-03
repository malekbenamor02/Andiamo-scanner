# 🚀 Deployment Guide - Vercel

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Supabase Project**: Make sure your Supabase project is ready

## Step 1: Prepare Your Repository

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Make sure your `.env` file is NOT committed** (it should be in `.gitignore`)

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

## Step 3: Configure Environment Variables

After deployment, go to your Vercel project dashboard:

1. **Navigate to Settings > Environment Variables**
2. **Add these variables**:
   ```
   VITE_SUPABASE_URL=https://ykeryyraxmtjunnotoep.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_APP_NAME=Andiamo Scanner
   VITE_APP_VERSION=1.0.0
   ```

3. **Redeploy** after adding environment variables

## Step 4: Test Your Deployment

1. **Visit your Vercel URL** (e.g., `https://your-app.vercel.app`)
2. **Test the camera functionality** on your iPhone
3. **Verify HTTPS is working** (should be automatic with Vercel)

## Step 5: Custom Domain (Optional)

1. **Go to your Vercel project settings**
2. **Navigate to Domains**
3. **Add your custom domain** (e.g., `scanner.andiamo.com`)

## Troubleshooting

### Camera Still Not Working?

1. **Check HTTPS**: Make sure your Vercel URL starts with `https://`
2. **Test on Safari**: iOS Safari has the best camera support
3. **Check permissions**: Allow camera access when prompted
4. **Clear browser cache**: Sometimes cached settings interfere

### Environment Variables Not Working?

1. **Redeploy after adding variables**
2. **Check variable names**: Must start with `VITE_`
3. **Verify Supabase credentials**: Test your Supabase connection

### Build Errors?

1. **Check TypeScript errors**: Run `npm run build` locally first
2. **Verify dependencies**: Make sure all packages are in `package.json`
3. **Check Vercel logs**: Look at the build logs in your Vercel dashboard

## Post-Deployment Checklist

- [ ] HTTPS is working (automatic with Vercel)
- [ ] Camera access works on iPhone
- [ ] Supabase connection is working
- [ ] QR scanning functionality works
- [ ] Offline storage works
- [ ] History page loads correctly

## Benefits of Vercel Deployment

✅ **Automatic HTTPS** - Solves iOS camera issues  
✅ **Global CDN** - Fast loading worldwide  
✅ **Automatic deployments** - Updates on every git push  
✅ **Environment variables** - Secure configuration  
✅ **Custom domains** - Professional URLs  
✅ **Analytics** - Track usage and performance  

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Test locally with `npm run build`
3. Verify environment variables are set correctly
4. Test camera access on different devices 