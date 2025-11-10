# Phone-Based OTP Authentication

Complete phone-based OTP authentication system using Supabase and Twilio.

## Features

- ✅ SMS/WhatsApp OTP delivery via Twilio
- ✅ Mock mode for development (no Twilio required)
- ✅ Rate limiting (1 request per minute per phone)
- ✅ Automatic customer creation on first login
- ✅ Session management for customers and business owners
- ✅ Support for both customer and business owner authentication

## Environment Variables

Add these to your `.env.local`:

```bash
# Twilio (optional - uses mock if not set)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Enable mock mode (for development)
USE_MOCK_SMS=true

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## API Routes

### POST /api/auth/send-otp

Send OTP code to phone number.

**Request:**
```json
{
  "phone": "+1234567890",
  "method": "whatsapp", // or "sms"
  "userType": "customer" // or "business_owner"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "code": "123456" // Only in development mode
}
```

### POST /api/auth/verify-otp

Verify OTP code and create session.

**Request:**
```json
{
  "phone": "+1234567890",
  "code": "123456",
  "userType": "customer", // or "business_owner"
  "name": "John Doe", // optional for customer
  "email": "john@example.com" // required for business_owner
}
```

**Response (Customer):**
```json
{
  "success": true,
  "session": {
    "type": "customer",
    "customerId": "uuid",
    "businessId": "uuid",
    "phone": "+1234567890",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response (Business Owner):**
```json
{
  "success": true,
  "session": {
    "type": "business_owner",
    "userId": "uuid",
    "businessId": "uuid",
    "email": "john@example.com",
    "phone": "+1234567890",
    "name": "John Doe",
    "role": "owner"
  },
  "authToken": "supabase_auth_token"
}
```

### GET /api/auth/session

Get current session.

**Response:**
```json
{
  "success": true,
  "session": {
    "type": "customer" | "business_owner",
    // ... session data
  }
}
```

### POST /api/auth/logout

Logout and clear session.

**Request:**
```json
{
  "userType": "customer" // or "business_owner"
}
```

**Response:**
```json
{
  "success": true
}
```

## Usage Examples

### Client-Side (React)

```typescript
// Send OTP
const sendOTP = async (phone: string) => {
  const response = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      method: 'whatsapp',
      userType: 'customer',
    }),
  });
  return response.json();
};

// Verify OTP
const verifyOTP = async (phone: string, code: string) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      code,
      userType: 'customer',
      name: 'John Doe', // optional
    }),
  });
  const data = await response.json();
  if (data.success) {
    // Session cookie is set automatically
    console.log('Logged in:', data.session);
  }
  return data;
};

// Get session
const getSession = async () => {
  const response = await fetch('/api/auth/session');
  return response.json();
};

// Logout
const logout = async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userType: 'customer' }),
  });
  return response.json();
};
```

### Server-Side (Server Components)

```typescript
import { getCurrentSession } from '@/lib/auth/session';

export default async function Page() {
  const session = await getCurrentSession();
  
  if (!session) {
    return <div>Not authenticated</div>;
  }

  if (session.type === 'customer') {
    return <div>Customer: {session.name}</div>;
  }

  return <div>Business Owner: {session.name}</div>;
}
```

## How It Works

1. **Send OTP**: User requests OTP → Code generated → Stored in database → Sent via Twilio
2. **Verify OTP**: User submits code → Verified against database → Session created
3. **Customer Flow**: 
   - If phone exists → Login
   - If phone doesn't exist → Auto-create customer → Login
4. **Business Owner Flow**: 
   - Requires email + phone
   - Links to existing user in `users` table
   - Creates Supabase Auth session

## Security Features

- ✅ Rate limiting (1 OTP per minute per phone)
- ✅ OTP expiration (10 minutes)
- ✅ Automatic OTP invalidation after use
- ✅ HttpOnly cookies for customer sessions
- ✅ Secure cookie flags in production

## Development Mode

In development with `USE_MOCK_SMS=true`:
- OTP codes are logged to console
- No Twilio credentials needed
- Codes are returned in API response for testing

