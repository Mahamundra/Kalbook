"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Phone, MessageCircle, Mail, X, Plus, GripVertical, Bold, Italic, Underline, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatIsraeliPhoneInput } from '@/lib/phone/display';

type ContactType = 'phone' | 'whatsapp' | 'email';

interface Contact {
  id: string;
  type: ContactType;
  value: string;
  visible: boolean;
}

interface ContactMessageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings?: {
    enabled?: boolean;
    message?: string;
    contacts?: Contact[];
  };
  onSave: (settings: {
    enabled: boolean;
    message: string;
    contacts: Contact[];
  }) => void;
}

export function ContactMessageEditor({
  open,
  onOpenChange,
  currentSettings,
  onSave,
}: ContactMessageEditorProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const [enabled, setEnabled] = useState(currentSettings?.enabled ?? true);
  const [message, setMessage] = useState(currentSettings?.message || '');
  const [contacts, setContacts] = useState<Contact[]>(
    currentSettings?.contacts || []
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const messageEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && currentSettings) {
      setEnabled(currentSettings.enabled ?? true);
      setMessage(currentSettings.message || '');
      setContacts(currentSettings.contacts || []);
    }
  }, [open, currentSettings]);

  useEffect(() => {
    // Set initial HTML content in editor
    if (messageEditorRef.current && open) {
      messageEditorRef.current.innerHTML = message || '';
    }
  }, [open, message]);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddContact = (type: ContactType) => {
    // Check if this type already exists
    const existingContact = contacts.find((c) => c.type === type);
    if (existingContact) {
      // Don't add if type already exists
      return;
    }
    
    const newContact: Contact = {
      id: `contact-${Date.now()}-${Math.random()}`,
      type,
      value: '',
      visible: true,
    };
    setContacts([...contacts, newContact]);
  };

  const handleRemoveContact = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newContacts = [...contacts];
    const draggedItem = newContacts[draggedIndex];
    
    // Remove dragged item
    newContacts.splice(draggedIndex, 1);
    
    // Insert at new position
    newContacts.splice(index, 0, draggedItem);
    
    setContacts(newContacts);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleUpdateContact = (id: string, updates: Partial<Contact>) => {
    setContacts(
      contacts.map((c) => {
        if (c.id !== id) return c;
        
        // If updating value, format it based on type
        if (updates.value !== undefined) {
          const contact = { ...c, ...updates };
          if (contact.type === 'phone' || contact.type === 'whatsapp') {
            // Format phone/WhatsApp numbers
            contact.value = formatIsraeliPhoneInput(updates.value);
          } else if (contact.type === 'email') {
            // For email, just update the value (validation happens on save)
            contact.value = updates.value;
          }
          return contact;
        }
        
        return { ...c, ...updates };
      })
    );
  };

  const handleSave = () => {
    // Validate all contacts before saving
    const validContacts: Contact[] = [];
    const errors: string[] = [];

    for (const contact of contacts) {
      const trimmedValue = contact.value.trim();
      
      if (!trimmedValue) {
        // Skip empty contacts
        continue;
      }

      // Validate based on type
      if (contact.type === 'phone' || contact.type === 'whatsapp') {
        // Remove dashes and check if we have exactly 10 digits
        const digits = trimmedValue.replace(/\D/g, '');
        if (digits.length !== 10) {
          const typeLabel = contact.type === 'phone' 
            ? (t('settings.addPhone') || 'Phone')
            : (t('settings.addWhatsApp') || 'WhatsApp');
          errors.push(`${typeLabel} ${t('settings.contactInvalidPhone') || 'must be exactly 10 digits'}`);
          continue;
        }
        // Store with dashes formatted
        validContacts.push({
          ...contact,
          value: formatIsraeliPhoneInput(trimmedValue),
        });
      } else if (contact.type === 'email') {
        if (!validateEmail(trimmedValue)) {
          errors.push(`${t('settings.addEmail') || 'Email'} ${t('settings.contactInvalidEmail') || 'must be a valid email address'}`);
          continue;
        }
        validContacts.push(contact);
      }
    }

    if (errors.length > 0) {
      errors.forEach((error) => {
        toast.error(error);
      });
      return;
    }

    onSave({
      enabled,
      message,
      contacts: validContacts,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (currentSettings) {
      setEnabled(currentSettings.enabled ?? true);
      setMessage(currentSettings.message || '');
      setContacts(currentSettings.contacts || []);
    }
    onOpenChange(false);
  };

  const getContactIcon = (type: ContactType) => {
    switch (type) {
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
    }
  };

  const getContactPlaceholder = (type: ContactType) => {
    switch (type) {
      case 'phone':
        return t('settings.contactPhonePlaceholder') || 'e.g., +972-50-123-4567';
      case 'whatsapp':
        return t('settings.contactWhatsAppPlaceholder') || 'e.g., +972-50-123-4567';
      case 'email':
        return t('settings.contactEmailPlaceholder') || 'e.g., info@example.com';
    }
  };

  const execFormatCommand = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    messageEditorRef.current?.focus();
    if (messageEditorRef.current) {
      setMessage(messageEditorRef.current.innerHTML);
    }
  };

  const handleMessageInput = () => {
    if (messageEditorRef.current) {
      setMessage(messageEditorRef.current.innerHTML);
    }
  };

  const handleAddLink = () => {
    const url = prompt(t('settings.addLinkUrl') || 'Enter URL:');
    if (url) {
      execFormatCommand('createLink', url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto z-[10001]" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('settings.contactMessage') || 'Contact Message Settings'}</DialogTitle>
          <DialogDescription>
            {t('settings.contactMessageDescription') || 'Configure contact message and contact methods'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label className="text-sm font-medium block">
                {t('settings.contactMessageEnabled') || 'Show Contact Message'}
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.contactMessageDescription') || 'Display contact message on booking page'}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Message Text */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.contactMessageText') || 'Message Text'}
            </label>
            
            {/* Formatting Toolbar */}
            <div className={`flex items-center gap-1 mb-2 p-2 border border-gray-200 rounded-t-lg bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execFormatCommand('bold')}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title={t('settings.formatBold') || 'Bold (Ctrl+B)'}
                disabled={!enabled}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execFormatCommand('italic')}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title={t('settings.formatItalic') || 'Italic (Ctrl+I)'}
                disabled={!enabled}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execFormatCommand('underline')}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title={t('settings.formatUnderline') || 'Underline (Ctrl+U)'}
                disabled={!enabled}
              >
                <Underline className="w-4 h-4" />
              </Button>
              <div className={`h-6 w-px bg-gray-300 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddLink}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title={t('settings.formatLink') || 'Add Link'}
                disabled={!enabled}
              >
                <Link2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Rich Text Editor */}
            <div className="relative">
              <div
                ref={messageEditorRef}
                contentEditable={enabled}
                onInput={handleMessageInput}
                className={`min-h-[80px] p-3 border border-gray-200 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                  isRTL ? 'text-right' : 'text-left'
                } ${!enabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                style={{
                  minHeight: '80px',
                  overflowY: 'auto',
                }}
                suppressContentEditableWarning={true}
              />
              {!message && enabled && (
                <div
                  className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} text-gray-400 pointer-events-none`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {t('settings.contactMessagePlaceholder') || 'Enter your contact message...'}
                </div>
              )}
            </div>
          </div>

          {/* Contact Methods */}
          {enabled && (
            <div className="space-y-4 pt-2 border-t">
              <div className={`flex items-center justify-between mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                <label className="text-sm font-medium">
                  {t('settings.contactMethods') || 'Contact Methods'}
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddContact('phone')}
                    className="h-8 px-2"
                    disabled={contacts.some((c) => c.type === 'phone')}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    {t('settings.addPhone') || 'Phone'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddContact('whatsapp')}
                    className="h-8 px-2"
                    disabled={contacts.some((c) => c.type === 'whatsapp')}
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {t('settings.addWhatsApp') || 'WhatsApp'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddContact('email')}
                    className="h-8 px-2"
                    disabled={contacts.some((c) => c.type === 'email')}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    {t('settings.addEmail') || 'Email'}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div
                    key={contact.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-move transition-all ${
                      draggedIndex === index ? 'opacity-50 border-blue-400' : 'hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white text-gray-700 border">
                      {getContactIcon(contact.type)}
                    </div>
                    <Input
                      value={contact.value}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (contact.type === 'phone' || contact.type === 'whatsapp') {
                          // Format phone/WhatsApp input
                          const formatted = formatIsraeliPhoneInput(newValue);
                          handleUpdateContact(contact.id, { value: formatted });
                        } else {
                          // For email, allow free typing
                          handleUpdateContact(contact.id, { value: newValue });
                        }
                      }}
                      placeholder={getContactPlaceholder(contact.type)}
                      className="flex-1"
                      dir="ltr"
                      type={contact.type === 'email' ? 'email' : 'text'}
                      maxLength={contact.type === 'phone' || contact.type === 'whatsapp' ? 12 : undefined} // XXX-XXX-XXXX = 12 chars
                      onDragStart={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={contact.visible}
                        onCheckedChange={(checked) =>
                          handleUpdateContact(contact.id, { visible: checked })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveContact(contact.id)}
                        aria-label={t('settings.removeContact') || 'Remove contact'}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <p className={`text-sm text-muted-foreground text-center py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.noContactsAdded') || 'No contact methods added. Click buttons above to add.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave}>
            {t('common.save') || 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

