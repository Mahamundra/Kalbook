'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { formatDate } from '@/components/ported/lib/i18n';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  id: string;
  noteText: string;
  createdBy: string | null;
  createdByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

interface NotesHistoryProps {
  customerId: string;
  onAddNote?: () => void;
}

export function NotesHistory({ customerId, onAddNote }: NotesHistoryProps) {
  const { t, locale } = useLocale();
  const { isRTL } = useDirection();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [customerId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}/notes-history`);
      const data = await response.json();
      if (data.success) {
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${customerId}/notes-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText: newNote }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Note added successfully');
        setNewNote('');
        setShowAddNote(false);
        fetchNotes();
        onAddNote?.();
      } else {
        toast.error(data.error || 'Failed to add note');
      }
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold">{t('customers.notesHistory.title') || 'Notes History'}</h3>
        <Button onClick={() => setShowAddNote(true)} size="sm">
          <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
          {t('customers.notesHistory.addNote') || 'Add Note'}
        </Button>
      </div>

      {showAddNote && (
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <Label>{t('customers.notes') || 'Note'}</Label>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t('customers.notesPlaceholder') || 'Additional notes about this customer'}
              rows={4}
            />
          </div>
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={handleAddNote} disabled={saving}>
              {saving ? 'Saving...' : t('customers.notesHistory.addNote') || 'Add Note'}
            </Button>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>
              {t('customers.cancel') || 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('customers.notesHistory.noNotes') || 'No notes found'}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="border rounded-lg p-4">
              <div className="text-sm mb-2">{note.noteText}</div>
              <div className="text-xs text-muted-foreground">
                {note.createdByUser ? (
                  <>
                    {t('customers.notesHistory.createdBy') || 'Created by'} {note.createdByUser.name} • {formatDate(note.createdAt, locale)}
                  </>
                ) : (
                  formatDate(note.createdAt, locale)
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


