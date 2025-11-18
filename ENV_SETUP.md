# Environment Variables Setup Guide

This guide will help you set up all required environment variables for the KalBook application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Supabase Setup](#supabase-setup)
3. [Twilio Setup (OTP)](#twilio-setup-otp)
4. [Next.js Configuration](#nextjs-configuration)
5. [Email Service (Optional)](#email-service-optional)
6. [Local Development Setup](#local-development-setup)
7. [Production Deployment](#production-deployment)

---

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required variables (see sections below)

3. Start the development server:
   ```bash
   npm run dev
   ```

---

## Supabase Setup

### Required Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### How to Get Supabase Credentials

1. **Create a Supabase Project**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Sign up or log in
   - Click "New Project"
   - Fill in project details:
     - Name: Your project name
     - Database Password: Create a strong password (save it!)
     - Region: Choose closest to your users
   - Wait for project to be created (2-3 minutes)

2. **Get API Credentials**
   - In your Supabase project dashboard, go to **Settings** → **API**
   - You'll find:
     - **Project URL**: Copy this as `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public key**: Copy this as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **service_role key**: Copy this as `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

3. **Set Up Database Schema**
   - Go to **SQL Editor** in Supabase dashboard
   - Run the migration files from `supabase/migrations/`:
     - `001_initial_schema.sql` - Creates all tables
     - `002_fix_rls_recursion.sql` - Fixes RLS policies
   - Or use the Supabase CLI:
     ```bash
     npx supabase db push
     ```

4. **Enable Authentication**
   - Go to **Authentication** → **Providers**
   - Enable **Phone** provider (for OTP)
   - Optionally enable **Email** provider

5. **Verify Connection**
   - Run the test script:
     ```bash
     npm run test:connection
     ```
   - Or use the API test route: `http://localhost:3000/api/test-db`

### Security Notes

- ✅ **Safe to expose**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (they're public)
- 🔒 **Keep secret**: `SUPABASE_SERVICE_ROLE_KEY` (bypasses Row Level Security - never expose to client!)

---

## Twilio Setup (OTP)

### Required Variables (Optional)

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
USE_MOCK_SMS=true  # For development
```

### How to Set Up Twilio

#### Option 1: Development (Mock Mode) - Recommended for Testing

For local development, you can skip Twilio setup entirely:

```bash
USE_MOCK_SMS=true
```

This will:
- Log OTP codes to the console instead of sending SMS
- Use a test code "1234" for OTP verification
- No Twilio account required

#### Option 2: Production (Real Twilio)

1. **Create Twilio Account**
   - Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
   - Sign up for a free trial account
   - Verify your email and phone number

2. **Get Credentials**
   - Go to [Twilio Console](https://console.twilio.com/)
   - You'll see your **Account SID** and **Auth Token** on the dashboard
   - Copy these values

3. **Get a Phone Number**
   - Go to **Phone Numbers** → **Manage** → **Buy a number**
   - Choose a number with SMS capability
   - For WhatsApp, you'll need to:
     - Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
     - Follow the setup wizard
     - Use the format: `whatsapp:+1234567890`

4. **Configure Environment Variables**

   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
   USE_MOCK_SMS=false  # or remove this line
   ```

5. **Test OTP Sending**
   - Use the `/api/auth/send-otp` endpoint
   - Check your phone for the OTP code
   - Verify using `/api/auth/verify-otp`

### Twilio Costs

- **Trial Account**: Free credits for testing
- **Production**: 
  - SMS: ~$0.0075 per message (varies by country)
  - WhatsApp: ~$0.005 per message (varies by country)
  - Check [Twilio Pricing](https://www.twilio.com/pricing) for exact rates

### Troubleshooting

**Issue**: "Twilio credentials not configured"
- **Solution**: Make sure all Twilio variables are set, or set `USE_MOCK_SMS=true`

**Issue**: "Invalid phone number"
- **Solution**: Use E.164 format: `+[country code][number]` (e.g., `+1234567890`)

**Issue**: WhatsApp not working
- **Solution**: Ensure `TWILIO_WHATSAPP_NUMBER` starts with `whatsapp:` prefix

---

## Google Calendar Sync (Optional)

### Required Variables

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/google/oauth/callback
```

### How to Set Up Google Calendar OAuth

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Calendar API**
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Calendar API"
   - Click **Enable**

3. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URI:
     - Development: `http://localhost:3000/api/calendar/google/oauth/callback`
     - Production: `https://yourdomain.com/api/calendar/google/oauth/callback`
   - Copy the **Client ID** and **Client Secret**

4. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Fill in app information
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Add test users (for development)
   - Submit for verification (for production)

5. **Set Environment Variables**

   ```bash
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/google/oauth/callback
   ```

### Features

- **Bidirectional Sync**: Appointments sync to Google Calendar and updates sync back
- **Automatic Sync**: Appointments automatically sync when created/updated/cancelled
- **Plan-Based**: Available in Professional and Business plans

---

## Cron Job Configuration

### Required Variables

```bash
CRON_SECRET=your_random_secret_string
```

### How to Set Up

1. **Generate a Secret**
   - Use a random string generator
   - Or run: `openssl rand -hex 32`
   - Keep it secure and don't commit to version control

2. **Set Environment Variable**

   ```bash
   CRON_SECRET=your_random_secret_string_here
   ```

3. **Vercel Cron (Recommended)**
   - The `vercel.json` file is already configured
   - Cron job runs every 15 minutes to process reminders
   - No additional setup needed on Vercel

4. **External Cron Service (Alternative)**
   - Use services like [cron-job.org](https://cron-job.org/) or [EasyCron](https://www.easycron.com/)
   - Set up a job to call: `GET https://yourdomain.com/api/cron/process-reminders`
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: Every 15 minutes (`*/15 * * * *`)

### What It Does

- Processes pending appointment reminders
- Sends SMS/WhatsApp reminders based on schedule
- Updates reminder status in database

---

## Next.js Configuration

### Required Variables

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Production
NODE_ENV=development  # Automatically set by Next.js
```

### Local Development

For local development, you can leave `NEXT_PUBLIC_APP_URL` as `http://localhost:3000` or omit it.

### Production

Set `NEXT_PUBLIC_APP_URL` to your production domain:

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

This is used for:
- Generating absolute URLs in emails/notifications
- Redirect callbacks
- OAuth redirects

---

## Email Service (Optional)

The app currently supports OTP via SMS/WhatsApp. Email notifications are planned for future releases.

### Option 1: Resend (Recommended)

1. **Sign up**: [https://resend.com](https://resend.com)
2. **Get API Key**: 
   - Go to **API Keys** → **Create API Key**
   - Copy the key (starts with `re_`)
3. **Configure**:
   ```bash
   RESEND_API_KEY=re_your_api_key_here
   ```

### Option 2: SendGrid

1. **Sign up**: [https://sendgrid.com](https://sendgrid.com)
2. **Get API Key**:
   - Go to **Settings** → **API Keys** → **Create API Key**
   - Copy the key (starts with `SG.`)
3. **Configure**:
   ```bash
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

---

## Local Development Setup

### Step-by-Step Guide

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd kalbook
   npm install
   ```

2. **Create Environment File**
   ```bash
   cp .env.example .env.local
   ```

3. **Set Up Supabase** (Required)
   - Follow [Supabase Setup](#supabase-setup) above
   - Add credentials to `.env.local`

4. **Set Up Twilio** (Optional for Development)
   - For development: Set `USE_MOCK_SMS=true`
   - For production testing: Follow [Twilio Setup](#twilio-setup-otp)

5. **Run Database Migrations**
   - Via Supabase Dashboard SQL Editor, or
   - Via Supabase CLI:
     ```bash
     npx supabase db push
     ```

6. **Create First Business** (Optional)
   ```bash
   npm run create-business
   ```
   Or use the onboarding API: `POST /api/onboarding/create`

7. **Start Development Server**
   ```bash
   npm run dev
   ```

8. **Verify Setup**
   - Open [http://localhost:3000](http://localhost:3000)
   - Test OTP: Use phone number and check console for code (if `USE_MOCK_SMS=true`)
   - Test API: `GET http://localhost:3000/api/test-db`

### Development Features

- **Mock OTP**: OTP codes logged to console (no Twilio needed)
- **Test OTP Code**: Use "1234" in development mode
- **Hot Reload**: Changes reflect immediately
- **Type Safety**: Full TypeScript support

---

## Production Deployment

### Environment Variables Checklist

Before deploying, ensure you have:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- ✅ `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- ✅ `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- ✅ `TWILIO_PHONE_NUMBER` - Your Twilio phone number
- ✅ `TWILIO_WHATSAPP_NUMBER` - Your Twilio WhatsApp number
- ✅ `NEXT_PUBLIC_APP_URL` - Your production domain
- ✅ `NODE_ENV=production` - Set automatically by hosting platform

### Platform-Specific Setup

#### Vercel

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add all variables from `.env.example`
4. Deploy

#### Netlify

1. Go to **Site settings** → **Environment variables**
2. Add all variables
3. Redeploy

#### Railway / Render / Fly.io

1. Use their dashboard or CLI to set environment variables
2. Ensure all variables from `.env.example` are set
3. Deploy

### Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Use different Supabase projects** for development and production
3. **Rotate service role keys** regularly
4. **Use environment variable encryption** in your hosting platform
5. **Monitor API usage** in Twilio and Supabase dashboards

---

## Troubleshooting

### Common Issues

**Issue**: "Missing Supabase environment variables"
- **Solution**: Check that all three Supabase variables are set in `.env.local`

**Issue**: "Failed to connect to Supabase"
- **Solution**: 
  - Verify your project URL is correct
  - Check that your Supabase project is active
  - Ensure your IP is not blocked (check Supabase dashboard)

**Issue**: "Twilio error: Invalid phone number"
- **Solution**: Use E.164 format: `+[country code][number]` (e.g., `+1234567890`)

**Issue**: "OTP not sending in development"
- **Solution**: Check console logs - if `USE_MOCK_SMS=true`, codes are logged, not sent

**Issue**: "Service role key not working"
- **Solution**: 
  - Verify you copied the service_role key (not anon key)
  - Check for extra spaces or quotes in `.env.local`
  - Ensure the key hasn't been rotated in Supabase dashboard

---

## Support

For additional help:
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Twilio Docs**: [https://www.twilio.com/docs](https://www.twilio.com/docs)
- **Next.js Docs**: [https://nextjs.org/docs](https://nextjs.org/docs)

---

## Quick Reference

### Minimum Required Variables (Development)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
USE_MOCK_SMS=true
```

### All Variables (Production)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Google Calendar OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/google/oauth/callback

# Cron Job Secret
CRON_SECRET=your_random_secret_string

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

---

**Last Updated**: 2024

