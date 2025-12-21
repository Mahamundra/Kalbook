"use client";

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface InlineTextEditorProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

export function InlineTextEditor({
  value,
  onSave,
  onCancel,
  multiline = false,
  placeholder = '',
  className = ''
}: InlineTextEditorProps) {
  const [editedValue, setEditedValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus input when editor opens
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  useEffect(() => {
    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Don't auto-close on outside click, let user explicitly save or cancel
      }
    };

    document.addEventListener('keydown', handleEscape as any);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape as any);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  const handleSave = () => {
    onSave(editedValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-white border-2 border-primary rounded-lg shadow-lg p-2 z-50 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {multiline ? (
        <Textarea
          ref={inputRef}
          value={editedValue}
          onChange={(e) => setEditedValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[100px] resize-none pr-20"
          rows={4}
        />
      ) : (
        <textarea
          ref={inputRef}
          value={editedValue}
          onChange={(e) => setEditedValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-2 py-1 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          rows={1}
        />
      )}
      <div className="flex items-center gap-2 mt-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 px-2"
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          className="h-8 px-2"
        >
          <Check className="w-4 h-4" />
        </Button>
      </div>
      {multiline && (
        <p className="text-xs text-muted-foreground mt-1">
          Press Ctrl+Enter (Cmd+Enter on Mac) to save
        </p>
      )}
    </div>
  );
}

