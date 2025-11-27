# Studio Kubiyot - Fitness Trainer Platform Implementation Plan

## Overview
Build a specialized fitness trainer platform for Studio Kubiyot as a separate customized system. This will use existing KalBook infrastructure but with custom modifications:
- **Separate route namespace**: `/studio-kubiyot/`
- **No group appointments** - only private one-on-one sessions
- **Simplified admin** - Only: Clients, Trainers, WorkOut Types, Settings, Analytics
- **Custom client portal** - OTP login, view workouts, cancel, request new workouts
- **Google Calendar integration** - Two-way sync with trainer's Google Calendar
- **Client measurements** - Store and track client body measurements, progress data
- **Editable client portal** - Admin can customize the client booking page

## Route Structure

### Admin Portal
- **Admin Dashboard**: `/studio-kubiyot/admin/`
- **Clients Management**: `/studio-kubiyot/admin/clients`
- **Trainers Management**: `/studio-kubiyot/admin/trainers`
- **WorkOut Types**: `/studio-kubiyot/admin/workout-types`
- **Settings**: `/studio-kubiyot/admin/settings`
- **Analytics & Insights**: `/studio-kubiyot/admin/analytics`

### Client Portal
- **Client Login**: `/studio-kubiyot/booking/` (OTP-based)
- **Client Dashboard**: `/studio-kubiyot/booking/dashboard` (view workouts, cancel, request new)

## Database Schema Changes

### 1. Trainers Table (`supabase/migrations/013_add_trainers.sql`)
- Create `trainers` table (separate from workers, specific to studio-kubiyot):
  - `id`, `business_id`, `name`, `email`, `phone`
  - `user_id` (links to `users` table for authentication)
  - `active`, `color`, `specializations` (JSONB)
  - `google_calendar_id` (for Google Calendar sync)
  - `created_at`, `updated_at`
- Add indexes and RLS policies
- Migration should allow converting existing workers to trainers if needed

### 2. Client Measurements (`supabase/migrations/014_add_client_measurements.sql`)
- Create `client_measurements` table:
  - `id`, `customer_id`, `business_id`
  - `measured_at` (TIMESTAMPTZ) - when measurement was taken
  - `weight` (DECIMAL), `height` (DECIMAL)
  - `body_fat_percentage` (DECIMAL)
  - `muscle_mass` (DECIMAL)
  - `measurements` (JSONB) - flexible storage for custom measurements:
    - `chest`, `waist`, `hips`, `arms`, `thighs`, etc.
  - `notes` (TEXT)
  - `created_at`, `updated_at`
- Add indexes on `customer_id`, `measured_at`
- RLS policies for business isolation

### 3. Workout Requests (`supabase/migrations/015_add_workout_requests.sql`)
- Create `workout_requests` table:
  - `id`, `customer_id`, `trainer_id`, `business_id`
  - `workout_type_id` (service_id reference)
  - `preferred_date` (DATE)
  - `preferred_time` (TIME)
  - `alternative_dates` (JSONB array of dates)
  - `status` (pending, approved, rejected, cancelled)
  - `requested_at` (TIMESTAMPTZ)
  - `responded_at` (TIMESTAMPTZ)
  - `notes` (TEXT) - client notes
  - `admin_notes` (TEXT) - trainer/admin notes
  - `created_at`, `updated_at`
- Add indexes on `customer_id`, `trainer_id`, `status`
- RLS policies

### 4. Client Portal Customization (`supabase/migrations/016_add_portal_customization.sql`)
- Create `client_portal_customization` table:
  - `id`, `business_id` (UNIQUE)
  - `page_content` (JSONB) - customizable page elements:
    - `welcome_message`, `header_text`, `footer_text`
    - `color_scheme`, `logo_url`
    - `features_enabled` (JSONB): `show_measurements`, `show_history`, etc.
  - `created_at`, `updated_at`
- Allow admin to edit client portal appearance/content

### 5. WorkOut Types (Services Extension)
- Extend existing `services` table with workout-specific fields:
  - `is_workout_type` (BOOLEAN) - mark as workout type
  - `workout_category` (TEXT) - e.g., "Strength", "Cardio", "Flexibility"
  - `equipment_needed` (JSONB array)
  - `difficulty_level` (TEXT)
- No migration needed if using existing services table with new fields

## API Endpoints

### Admin APIs

#### Trainers Management
- `GET /api/studio-kubiyot/admin/trainers` - List all trainers
- `POST /api/studio-kubiyot/admin/trainers` - Create trainer
- `GET /api/studio-kubiyot/admin/trainers/[id]` - Get trainer details
- `PATCH /api/studio-kubiyot/admin/trainers/[id]` - Update trainer
- `DELETE /api/studio-kubiyot/admin/trainers/[id]` - Delete/deactivate trainer
- `POST /api/studio-kubiyot/admin/trainers/[id]/google-calendar` - Connect Google Calendar

#### Clients Management
- `GET /api/studio-kubiyot/admin/clients` - List all clients
- `POST /api/studio-kubiyot/admin/clients` - Create client
- `GET /api/studio-kubiyot/admin/clients/[id]` - Get client details
- `PATCH /api/studio-kubiyot/admin/clients/[id]` - Update client
- `GET /api/studio-kubiyot/admin/clients/[id]/measurements` - Get client measurements
- `POST /api/studio-kubiyot/admin/clients/[id]/measurements` - Add measurement
- `GET /api/studio-kubiyot/admin/clients/[id]/workouts` - Get client workout history
- `GET /api/studio-kubiyot/admin/clients/[id]/requests` - Get client workout requests

#### WorkOut Types
- `GET /api/studio-kubiyot/admin/workout-types` - List workout types
- `POST /api/studio-kubiyot/admin/workout-types` - Create workout type
- `PATCH /api/studio-kubiyot/admin/workout-types/[id]` - Update workout type
- `DELETE /api/studio-kubiyot/admin/workout-types/[id]` - Delete workout type

#### Workout Requests Management
- `GET /api/studio-kubiyot/admin/workout-requests` - List all requests (with filters)
- `GET /api/studio-kubiyot/admin/workout-requests/[id]` - Get request details
- `POST /api/studio-kubiyot/admin/workout-requests/[id]/approve` - Approve and create appointment
- `POST /api/studio-kubiyot/admin/workout-requests/[id]/reject` - Reject request
- `PATCH /api/studio-kubiyot/admin/workout-requests/[id]` - Update request

#### Client Portal Customization
- `GET /api/studio-kubiyot/admin/portal-customization` - Get current customization
- `PATCH /api/studio-kubiyot/admin/portal-customization` - Update customization

#### Analytics
- `GET /api/studio-kubiyot/admin/analytics/overview` - Overall stats
- `GET /api/studio-kubiyot/admin/analytics/trainers` - Trainer performance
- `GET /api/studio-kubiyot/admin/analytics/clients` - Client engagement
- `GET /api/studio-kubiyot/admin/analytics/workout-types` - Popular workout types
- `GET /api/studio-kubiyot/admin/analytics/revenue` - Revenue analytics

### Client Portal APIs

#### Authentication
- `POST /api/studio-kubiyot/booking/auth/send-otp` - Send OTP to client phone
- `POST /api/studio-kubiyot/booking/auth/verify-otp` - Verify OTP and create session
- `POST /api/studio-kubiyot/booking/auth/logout` - Logout client

#### Client Data
- `GET /api/studio-kubiyot/booking/me` - Get current client profile
- `GET /api/studio-kubiyot/booking/workouts` - Get client's workouts (upcoming/past)
- `GET /api/studio-kubiyot/booking/workouts/[id]` - Get workout details
- `POST /api/studio-kubiyot/booking/workouts/[id]/cancel` - Cancel workout
- `GET /api/studio-kubiyot/booking/measurements` - Get client measurements
- `GET /api/studio-kubiyot/booking/workout-types` - Get available workout types

#### Workout Requests
- `POST /api/studio-kubiyot/booking/workout-requests` - Create workout request
- `GET /api/studio-kubiyot/booking/workout-requests` - Get client's requests
- `GET /api/studio-kubiyot/booking/workout-requests/[id]` - Get request status
- `POST /api/studio-kubiyot/booking/workout-requests/[id]/cancel` - Cancel request

#### Portal Customization
- `GET /api/studio-kubiyot/booking/portal-config` - Get portal customization (public)

## Frontend Components

### Admin Portal Pages (`app/studio-kubiyot/admin/`)

#### Layout
- `app/studio-kubiyot/admin/layout.tsx` - Admin layout with simplified sidebar
  - Sidebar: Clients, Trainers, WorkOut Types, Settings, Analytics
  - No calendar, no services (general), no workers, no templates

#### Clients
- `app/studio-kubiyot/admin/clients/page.tsx` - Clients list
- `app/studio-kubiyot/admin/clients/[id]/page.tsx` - Client details
  - Profile, measurements, workout history, requests
- `components/studio-kubiyot/admin/ClientMeasurements.tsx` - Measurements tracking
- `components/studio-kubiyot/admin/ClientWorkoutHistory.tsx` - Workout history
- `components/studio-kubiyot/admin/AddMeasurementDialog.tsx` - Add measurement form

#### Trainers
- `app/studio-kubiyot/admin/trainers/page.tsx` - Trainers list
- `app/studio-kubiyot/admin/trainers/[id]/page.tsx` - Trainer details
- `components/studio-kubiyot/admin/TrainerGoogleCalendar.tsx` - Google Calendar connection
- `components/studio-kubiyot/admin/TrainerSchedule.tsx` - Trainer schedule view

#### WorkOut Types
- `app/studio-kubiyot/admin/workout-types/page.tsx` - Workout types list
- `components/studio-kubiyot/admin/WorkoutTypeForm.tsx` - Create/edit workout type
- Uses existing services table but with workout-specific UI

#### Settings
- `app/studio-kubiyot/admin/settings/page.tsx` - Settings page
  - Business info, Google Calendar sync, portal customization
- `components/studio-kubiyot/admin/PortalCustomization.tsx` - Edit client portal
- `components/studio-kubiyot/admin/GoogleCalendarSettings.tsx` - Google Calendar setup

#### Analytics
- `app/studio-kubiyot/admin/analytics/page.tsx` - Analytics dashboard
- `components/studio-kubiyot/admin/AnalyticsOverview.tsx` - Overview stats
- `components/studio-kubiyot/admin/TrainerPerformance.tsx` - Trainer analytics
- `components/studio-kubiyot/admin/ClientEngagement.tsx` - Client analytics
- `components/studio-kubiyot/admin/WorkoutTypeStats.tsx` - Workout type popularity

#### Workout Requests
- `app/studio-kubiyot/admin/workout-requests/page.tsx` - Pending requests
- `components/studio-kubiyot/admin/WorkoutRequestCard.tsx` - Request card
- `components/studio-kubiyot/admin/ApproveRequestDialog.tsx` - Approve and schedule

### Client Portal Pages (`app/studio-kubiyot/booking/`)

#### Layout
- `app/studio-kubiyot/booking/layout.tsx` - Client portal layout
  - Load portal customization
  - Apply custom colors/logo

#### Authentication
- `app/studio-kubiyot/booking/page.tsx` - Login page (OTP)
  - Phone input, OTP verification
  - Uses existing OTP system

#### Dashboard
- `app/studio-kubiyot/booking/dashboard/page.tsx` - Client dashboard
  - Upcoming workouts
  - Past workouts
  - Quick actions: Request new workout, View measurements

#### Workouts
- `app/studio-kubiyot/booking/workouts/page.tsx` - All workouts list
- `app/studio-kubiyot/booking/workouts/[id]/page.tsx` - Workout details
- `components/studio-kubiyot/booking/WorkoutCard.tsx` - Workout card
- `components/studio-kubiyot/booking/CancelWorkoutDialog.tsx` - Cancel confirmation

#### Request Workout
- `app/studio-kubiyot/booking/request/page.tsx` - Request new workout
- `components/studio-kubiyot/booking/WorkoutRequestForm.tsx` - Request form
  - Select workout type, trainer, preferred date/time
  - Alternative dates option

#### Measurements
- `app/studio-kubiyot/booking/measurements/page.tsx` - View measurements
- `components/studio-kubiyot/booking/MeasurementsChart.tsx` - Progress chart

#### Components
- `components/studio-kubiyot/booking/ClientHeader.tsx` - Header with logout
- `components/studio-kubiyot/booking/UpcomingWorkouts.tsx` - Upcoming list
- `components/studio-kubiyot/booking/PastWorkouts.tsx` - Past workouts list

## Google Calendar Integration

### Two-Way Sync
- **Appointments → Google Calendar**: When workout is created/updated, sync to trainer's Google Calendar
- **Google Calendar → Appointments**: When event is created/updated in Google Calendar, sync to platform
- Use existing `lib/calendar/google-sync.ts` but extend for trainer-specific sync

### Implementation
- Each trainer can connect their Google Calendar
- Store Google Calendar ID per trainer in `trainers.google_calendar_id`
- Sync appointments to trainer's calendar when:
  - Workout is created
  - Workout is updated (time, trainer, etc.)
  - Workout is cancelled
- Sync from Google Calendar when:
  - Event is created in trainer's calendar
  - Event is updated in trainer's calendar
  - Event is deleted from trainer's calendar

### Webhook Setup
- Use existing Google Calendar webhook system
- Listen for changes in trainer's calendar
- Update appointments accordingly

## Key Implementation Files

### Database Migrations
- `supabase/migrations/013_add_trainers.sql`
- `supabase/migrations/014_add_client_measurements.sql`
- `supabase/migrations/015_add_workout_requests.sql`
- `supabase/migrations/016_add_portal_customization.sql`

### Library Functions
- `lib/studio-kubiyot/trainers.ts` - Trainer utilities
- `lib/studio-kubiyot/measurements.ts` - Client measurements utilities
- `lib/studio-kubiyot/workout-requests.ts` - Workout request management
- `lib/studio-kubiyot/portal-customization.ts` - Portal customization
- `lib/studio-kubiyot/google-calendar.ts` - Extended Google Calendar sync for trainers

### API Routes
- `app/api/studio-kubiyot/admin/trainers/` - Trainer CRUD
- `app/api/studio-kubiyot/admin/clients/` - Client management (extend existing)
- `app/api/studio-kubiyot/admin/workout-types/` - Workout types
- `app/api/studio-kubiyot/admin/workout-requests/` - Request management
- `app/api/studio-kubiyot/admin/portal-customization/` - Portal customization
- `app/api/studio-kubiyot/admin/analytics/` - Analytics endpoints
- `app/api/studio-kubiyot/booking/auth/` - Client authentication
- `app/api/studio-kubiyot/booking/workouts/` - Client workout endpoints
- `app/api/studio-kubiyot/booking/workout-requests/` - Client request endpoints
- `app/api/studio-kubiyot/booking/measurements/` - Client measurements
- `app/api/studio-kubiyot/booking/portal-config/` - Public portal config

### Frontend Pages
- `app/studio-kubiyot/admin/**` - Admin portal pages
- `app/studio-kubiyot/booking/**` - Client portal pages

### Components
- `components/studio-kubiyot/admin/**` - Admin components
- `components/studio-kubiyot/booking/**` - Client portal components

## Integration Points

### Existing Systems to Leverage
- Use existing `customers` table (clients = customers)
- Use existing `appointments` table (workouts = appointments)
- Use existing `services` table (workout types = services with `is_workout_type = true`)
- Use existing OTP system for client authentication
- Use existing Google Calendar sync (`lib/calendar/google-sync.ts`)
- Use existing session management
- Use existing RLS policies pattern

### Authentication Flow
- **Trainers**: Link to `users` table (similar to admin workers)
- **Clients**: Phone-based OTP (extend existing OTP system)
- **Session management**: Use existing session cookie patterns

## Workflow: Workout Request System

1. **Client requests workout**:
   - Client logs in via `/studio-kubiyot/booking/`
   - Fills out workout request form (type, trainer, preferred date/time)
   - Submits request → Status: `pending`

2. **Admin/Trainer reviews**:
   - Admin sees request in `/studio-kubiyot/admin/workout-requests`
   - Can approve or reject

3. **Approval**:
   - Admin approves → Creates appointment
   - Syncs to trainer's Google Calendar
   - Client receives notification
   - Status: `approved`

4. **Rejection**:
   - Admin rejects → Client receives notification
   - Status: `rejected`

5. **Client cancels**:
   - Client can cancel approved workout
   - Cancels appointment
   - Removes from Google Calendar
   - Status: `cancelled`

## Analytics & Insights

### Metrics to Track
- Total clients
- Active clients (workouts in last 30 days)
- Total workouts (completed, upcoming, cancelled)
- Trainer utilization (workouts per trainer)
- Popular workout types
- Client retention rate
- Average workouts per client
- Revenue (if pricing is tracked)
- Client measurements progress (average weight loss, muscle gain, etc.)

### Reports
- Trainer performance report
- Client engagement report
- Workout type popularity
- Client progress reports (measurements over time)

## Testing Considerations
- Test workout request flow end-to-end
- Test Google Calendar two-way sync
- Test client portal customization
- Test client measurements tracking
- Test OTP authentication for clients
- Test trainer Google Calendar connection
- Test analytics calculations

## Implementation Order

1. **Database migrations** - Create all tables
2. **Trainers management** - CRUD operations
3. **Client measurements** - Add/view measurements
4. **Workout requests** - Request system
5. **Client portal** - Login, dashboard, request form
6. **Admin portal** - Simplified admin interface
7. **Google Calendar integration** - Two-way sync
8. **Portal customization** - Admin can edit client portal
9. **Analytics** - Dashboard and reports

## Notes

- This is a **separate customized system** for a specific customer
- Uses existing KalBook infrastructure but with custom routes and features
- No group appointments - only private one-on-one sessions
- Simplified admin - only 6 sections (Clients, Trainers, WorkOut Types, Settings, Analytics, Workout Requests)
- Client portal is fully customizable by admin
- Google Calendar sync is essential for trainer workflow

