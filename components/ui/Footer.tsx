"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Mail, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ported/ui/button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Textarea } from '@/components/ported/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ported/ui/dialog';
import { useToast } from '@/components/ported/ui/use-toast';
import { useLocale } from '@/components/ported/hooks/useLocale';
import en from '@/messages/en.json';
import he from '@/messages/he.json';
import ar from '@/messages/ar.json';
import ru from '@/messages/ru.json';

const translations = { en, he, ar, ru };

export function Footer() {
  const { locale } = useLocale();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' });
  const [submittingContact, setSubmittingContact] = useState(false);
  const { toast } = useToast();

  const getNested = (obj: any, path: string) => {
    return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
  };

  const homeData = getNested(translations[locale as keyof typeof translations] || translations.en, 'home');
  const getHome = (key: string) => getNested(homeData, key) || '';
  const getFooter = (key: string) => getNested(homeData?.footer, key) || '';

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingContact(true);
    try {
      // Here you would typically send the form data to an API endpoint
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success(getHome('contact.success') || 'Thank you! We\'ll get back to you soon.');
      setContactFormData({ name: '', email: '', message: '' });
      setContactModalOpen(false);
    } catch (error) {
      toast.error(getHome('contact.error') || 'Failed to send message. Please try again.');
    } finally {
      setSubmittingContact(false);
    }
  };

  return (
    <>
      <footer className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Social Links - Left */}
            <div className="flex gap-4 order-3 md:order-1">
              <a
                href="https://instagram.com/kalbook.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com/kalbook.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
            
            {/* Links - Center */}
            <div className="flex gap-4 order-1 md:order-2">
              <button
                onClick={() => setContactModalOpen(true)}
                className="text-sm text-muted-foreground relative inline-block group !hover:bg-transparent !hover:text-muted-foreground"
              >
                {getHome('contact.title') || 'Contact Us'}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-foreground transition-all duration-300 group-hover:w-full"></span>
              </button>
              <Link href="/terms" className="text-sm text-muted-foreground relative inline-block group">
                {getFooter('terms')}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-foreground transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground relative inline-block group">
                {getFooter('privacy')}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-foreground transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </div>
            
            {/* Copyright - Right */}
            <div className="order-2 md:order-3">
              <p 
                className="text-sm text-muted-foreground text-center md:text-right"
                style={locale === 'he' || locale === 'ar' ? { direction: 'ltr' } : {}}
              >
                {locale === 'he' 
                  ? `© ${new Date().getFullYear()} Kalbook.io ${getFooter('rights') || 'כל הזכויות שמורות'}`
                  : `© ${new Date().getFullYear()} Kalbook.io. ${getFooter('rights') || 'All rights reserved.'}`
                }
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-[#030408]">{getHome('contact.title') || 'Contact Us'}</DialogTitle>
            <DialogDescription className="text-gray-600">
              {getHome('contact.description') || 'Get in touch with us. We\'d love to hear from you!'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-[#030408]">{getHome('contact.info') || 'Contact Information'}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <a href="mailto:contact@kalbook.io" className="text-sm text-gray-600 hover:text-gray-700 transition-colors">
                    contact@kalbook.io
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <a href="tel:+972542636737" className="text-sm text-gray-600 hover:text-gray-700 transition-colors">
                    +972 54-263-6737
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <a
                    href="https://wa.me/972542636737"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-gray-700 transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name" className="text-gray-700">{getHome('contact.name') || 'Name'}</Label>
                <Input
                  id="contact-name"
                  value={contactFormData.name}
                  onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                  className="bg-[#f7f7f8] border-[#e2e2e2]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-gray-700">{getHome('contact.email') || 'Email'}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  className="bg-[#f7f7f8] border-[#e2e2e2]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message" className="text-gray-700">{getHome('contact.message') || 'Message'}</Label>
                <Textarea
                  id="contact-message"
                  value={contactFormData.message}
                  onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                  rows={4}
                  className="bg-[#f7f7f8] border-[#e2e2e2]"
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={submittingContact} 
                className="w-full bg-[#ff411b] text-white hover:bg-[#e23a16] shadow-md"
              >
                {submittingContact ? (getHome('contact.submitting') || 'Sending...') : (getHome('contact.submit') || 'Send Message')}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

