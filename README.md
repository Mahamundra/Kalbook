# KalBook 📅

**A modern, multi-tenant appointment booking system for service businesses**

KalBook is a comprehensive booking management platform that enables service businesses (barbershops, salons, clinics, etc.) to manage appointments, customers, staff, and operations through an intuitive admin dashboard and customer-facing booking interface.

## 🌟 Features

### Core Functionality

- **📅 Smart Calendar Management**
  - Day, week, and month views
  - Drag-and-drop appointment rescheduling
  - Filter by staff member
  - Real-time availability checking

- **👥 Customer Management**
  - Complete customer profiles with history
  - Visit tracking and analytics
  - Customer notes and tags
  - Marketing consent management
  - Phone-based customer lookup

- **💼 Service Management**
  - Create and manage services
  - Set pricing and duration
  - Service-worker assignments
  - Active/inactive service toggling

- **👨‍💼 Staff (Workers) Management**
  - Add and manage staff members
  - Assign services to workers
  - Set working schedules
  - Track worker performance

- **📊 Analytics Dashboard**
  - Real-time business metrics
  - Appointment statistics
  - Revenue tracking
  - Customer analytics
  - Performance indicators

- **📱 Multi-Channel Communication**
  - SMS/WhatsApp OTP authentication
  - Appointment confirmations
  - Reminder notifications
  - Customizable message templates

- **🌐 Multi-Language & RTL Support**
  - English, Hebrew, Arabic, Russian
  - Right-to-left (RTL) layout support
  - Per-tenant language configuration

- **🔐 Secure Authentication**
  - Phone-based OTP (One-Time Password)
  - Email/password authentication
  - Session management
  - Role-based access control

- **🏢 Multi-Tenant Architecture**
  - Multiple businesses on one platform
  - Complete data isolation
  - Business-specific branding
  - Custom business slugs

- **📱 QR Code Generation**
  - Generate QR codes for booking pages
  - Easy sharing and marketing

- **⚙️ Customizable Settings**
  - Business information management
  - Operating hours configuration
  - Notification preferences
  - Template customization

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations
- **React Hook Form** - Form management
- **next-intl** - Internationalization
- **Recharts** - Data visualization

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - PostgreSQL database with real-time capabilities
- **Row Level Security (RLS)** - Database-level security
- **Supabase Auth** - Authentication and session management

### Services
- **Twilio** - SMS/WhatsApp messaging (OTP delivery)
- **Supabase Storage** - File uploads and media storage

## 📁 Project Structure

```
kalbook/
├── app/                      # Next.js App Router
│   ├── admin/               # Admin dashboard pages
│   │   ├── calendar/        # Calendar management
│   │   ├── customers/       # Customer management
│   │   ├── dashboard/       # Analytics dashboard
│   │   ├── services/        # Service management
│   │   ├── settings/        # Business settings
│   │   ├── templates/       # Message templates
│   │   ├── workers/         # Staff management
│   │   └── qr/              # QR code generator
│   ├── api/                 # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── appointments/    # Appointment CRUD
│   │   ├── customers/       # Customer management
│   │   ├── services/        # Service management
│   │   └── ...              # Other API endpoints
│   ├── b/[slug]/            # Business-specific pages
│   │   └── admin/           # Business admin panel
│   └── booking/             # Customer booking interface
├── components/              # React components
│   ├── ported/             # Shared components
│   │   ├── admin/          # Admin-specific components
│   │   ├── pages/          # Page components
│   │   └── ui/             # UI components
│   └── providers/          # Context providers
├── lib/                     # Utility libraries
│   ├── supabase/           # Supabase client setup
│   ├── auth/               # Authentication utilities
│   ├── appointments/        # Appointment helpers
│   └── ...                 # Other utilities
├── messages/               # i18n translation files
│   ├── en.json            # English
│   ├── he.json            # Hebrew
│   ├── ar.json            # Arabic
│   └── ru.json            # Russian
├── supabase/               # Database migrations
│   └── migrations/        # SQL migration files
└── public/                 # Static assets
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase account** ([sign up free](https://supabase.com))
- **Twilio account** (optional, for production SMS/WhatsApp)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mahamundra/Kalbook.git
   cd kalbook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   # Supabase (Required)
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Twilio (Optional for development)
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
   USE_MOCK_SMS=true  # Set to true for development

   # App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Supabase database**
   
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the migration files from `supabase/migrations/` in the SQL Editor:
     - `001_initial_schema.sql`
     - `002_fix_rls_recursion.sql`
     - `003_create_storage_bucket.sql`
     - `004_add_main_admin_flag.sql`
   - Enable Phone authentication in Authentication → Providers

5. **Run database migrations**
   
   Option A: Via Supabase Dashboard
   - Go to SQL Editor
   - Copy and run each migration file

   Option B: Via Supabase CLI
   ```bash
   npx supabase db push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   ```
   http://localhost:3000
   ```

### Creating Your First Business

1. **Use the onboarding API** to create a business:
   ```bash
   POST /api/onboarding/create
   {
     "businessType": "barbershop",
     "adminEmail": "admin@example.com",
     "adminName": "Admin User",
     "adminPhone": "+1234567890"
   }
   ```

2. **Or use the migration page** (if migrating from localStorage):
   - Navigate to `http://localhost:3000/migration`
   - Fill in the form and start migration

3. **Access the admin panel**:
   - Go to `/b/[your-slug]/admin/login`
   - Sign in with your admin credentials

## 📖 Documentation

### Key Documentation Files

- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment variables guide
- **[MULTI_TENANCY.md](./MULTI_TENANCY.md)** - Multi-tenant architecture
- **[ADMIN_ACCESS.md](./ADMIN_ACCESS.md)** - Admin access guide
- **[STORAGE_SETUP.md](./STORAGE_SETUP.md)** - File storage setup
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

### API Documentation

#### Authentication
- `POST /api/auth/send-otp` - Send OTP code to phone
- `POST /api/auth/verify-otp` - Verify OTP and create session
- `POST /api/auth/logout` - End user session

#### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/available` - Check availability
- `PUT /api/appointments/[id]` - Update appointment
- `POST /api/appointments/[id]/cancel` - Cancel appointment

#### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details
- `GET /api/customers/phone/[phone]` - Find customer by phone

#### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service
- `PUT /api/services/[id]` - Update service

#### Workers
- `GET /api/workers` - List workers
- `POST /api/workers` - Create worker
- `PUT /api/workers/[id]` - Update worker

See individual API route files for detailed request/response schemas.

## 🏗️ Architecture

### Multi-Tenancy

KalBook uses a **session-based multi-tenant architecture**:

- **Single Admin Interface**: One `/admin` URL for all businesses
- **Automatic Data Filtering**: All queries filtered by `business_id`
- **Data Isolation**: Row Level Security (RLS) at database level
- **Session-Based**: User's business determined from session

Each business owner sees only their own data, automatically filtered by their `business_id`.

### Security

- **Row Level Security (RLS)**: Database-level access control
- **Session Validation**: All API routes validate user sessions
- **Tenant Context**: Business ID attached to every request
- **Role-Based Access**: Owner, admin, and worker roles

### Data Flow

1. User logs in → Session created with user ID
2. Middleware extracts `business_id` from user record
3. Tenant context attached to request headers
4. API routes filter all queries by `business_id`
5. RLS policies enforce additional security at database level

## 🌍 Internationalization

KalBok supports multiple languages with RTL (right-to-left) support:

- **English** (en)
- **Hebrew** (he) - RTL
- **Arabic** (ar) - RTL
- **Russian** (ru)

Language files are in `messages/` directory. The app automatically detects and applies the correct language and text direction based on business settings.

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Development Features

- **Mock OTP Mode**: Set `USE_MOCK_SMS=true` to log OTP codes to console
- **Hot Reload**: Automatic page refresh on code changes
- **TypeScript**: Full type safety
- **ESLint**: Code quality checks

## 📝 Environment Variables

### Required

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional

```bash
# Twilio (for SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
USE_MOCK_SMS=true  # Development mode

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed setup instructions.

## 🚢 Deployment

### Recommended Platforms

- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Render**

### Deployment Checklist

- [ ] Set all environment variables in hosting platform
- [ ] Run database migrations on Supabase
- [ ] Configure Twilio credentials (if using SMS/WhatsApp)
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Test authentication flow
- [ ] Verify RLS policies are working

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For issues, questions, or contributions:

- **Documentation**: Check the `/docs` folder and markdown files
- **Issues**: Open an issue on GitHub
- **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 🎯 Roadmap

- [ ] Email notifications
- [ ] Advanced analytics and reporting
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Recurring appointments
- [ ] Waitlist management
- [ ] Customer reviews and ratings

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Twilio](https://www.twilio.com/)

---

**Made with ❤️ for service businesses**

