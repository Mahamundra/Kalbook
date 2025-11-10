/**
 * Database types for Supabase
 * Generated from the database schema
 */

export type BusinessType = 'barbershop' | 'nail_salon' | 'gym_trainer' | 'other';
export type UserRole = 'owner' | 'admin';
export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';
export type TemplateChannel = 'email' | 'message';
export type TemplateType = 'booking_confirmation' | 'reminder' | 'cancellation';

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          address: string | null;
          timezone: string;
          currency: string;
          business_type: BusinessType | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          timezone?: string;
          currency?: string;
          business_type?: BusinessType | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          timezone?: string;
          currency?: string;
          business_type?: BusinessType | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          business_id: string;
          email: string;
          phone: string | null;
          name: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          email: string;
          phone?: string | null;
          name: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          email?: string;
          phone?: string | null;
          name?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          category: string | null;
          duration: number;
          price: number;
          tax_rate: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          category?: string | null;
          duration: number;
          price: number;
          tax_rate?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          description?: string | null;
          category?: string | null;
          duration?: number;
          price?: number;
          tax_rate?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      workers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          active: boolean;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          active?: boolean;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          active?: boolean;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      worker_services: {
        Row: {
          worker_id: string;
          service_id: string;
        };
        Insert: {
          worker_id: string;
          service_id: string;
        };
        Update: {
          worker_id?: string;
          service_id?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string;
          email: string | null;
          last_visit: string | null;
          notes: string | null;
          date_of_birth: string | null;
          gender: string | null;
          consent_marketing: boolean;
          blocked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone: string;
          email?: string | null;
          last_visit?: string | null;
          notes?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          consent_marketing?: boolean;
          blocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          last_visit?: string | null;
          notes?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          consent_marketing?: boolean;
          blocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      customer_tags: {
        Row: {
          customer_id: string;
          tag: string;
        };
        Insert: {
          customer_id: string;
          tag: string;
        };
        Update: {
          customer_id?: string;
          tag?: string;
        };
      };
      visits: {
        Row: {
          id: string;
          customer_id: string;
          business_id: string;
          date: string;
          service_name: string;
          staff_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          business_id: string;
          date: string;
          service_name: string;
          staff_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          business_id?: string;
          date?: string;
          service_name?: string;
          staff_name?: string;
          created_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          service_id: string;
          worker_id: string;
          start: string;
          end: string;
          status: AppointmentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          service_id: string;
          worker_id: string;
          start: string;
          end: string;
          status?: AppointmentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          service_id?: string;
          worker_id?: string;
          start?: string;
          end?: string;
          status?: AppointmentStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          business_id: string;
          branding: Record<string, any>;
          locale: Record<string, any>;
          notifications: Record<string, any>;
          calendar: Record<string, any>;
          registration: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branding?: Record<string, any>;
          locale?: Record<string, any>;
          notifications?: Record<string, any>;
          calendar?: Record<string, any>;
          registration?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branding?: Record<string, any>;
          locale?: Record<string, any>;
          notifications?: Record<string, any>;
          calendar?: Record<string, any>;
          registration?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          business_id: string;
          channel: TemplateChannel;
          type: TemplateType;
          locale: string;
          subject: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          channel: TemplateChannel;
          type: TemplateType;
          locale: string;
          subject?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          channel?: TemplateChannel;
          type?: TemplateType;
          locale?: string;
          subject?: string | null;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      otp_codes: {
        Row: {
          id: string;
          phone: string;
          code: string;
          expires_at: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          code: string;
          expires_at: string;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          code?: string;
          expires_at?: string;
          verified?: boolean;
          created_at?: string;
        };
      };
    };
  };
}

// Convenience types for common operations
export type Business = Database['public']['Tables']['businesses']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type Worker = Database['public']['Tables']['workers']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Settings = Database['public']['Tables']['settings']['Row'];
export type Template = Database['public']['Tables']['templates']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];
export type OTPCode = Database['public']['Tables']['otp_codes']['Row'];





