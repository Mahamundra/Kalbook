import { ReactNode } from 'react';

export interface LayoutProps {
  header: ReactNode;
  trialBanner: ReactNode;
  bannerCover: ReactNode;
  businessInfo: ReactNode;
  guestMessage: ReactNode;
  customerAppointments?: ReactNode;
  bookingSection?: ReactNode;
  mainContent?: ReactNode;
  rescheduleDialog: ReactNode;
  loginDialog: ReactNode;
  footer?: ReactNode;
  businessName?: string;
  businessDescription?: string;
  logoUrl?: string;
  logoShape?: 'circle' | 'square';
  loginFirst?: boolean;
  dir?: 'ltr' | 'rtl';
}
