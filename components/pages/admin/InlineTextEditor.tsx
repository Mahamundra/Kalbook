"use client";

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Check, Link2, Bold, Italic, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [html, setHtml] = useState<string>(value || '');
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set initial HTML content
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      setHtml(value || '');
      
      // Focus and place caret at end
      editorRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [value]);

  useEffect(() => {
    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape as any);

    return () => {
      document.removeEventListener('keydown', handleEscape as any);
    };
  }, [onCancel]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      exec('createLink', url);
    }
  };

  // Clean HTML by removing unwanted browser-generated styles and spans
  const cleanHtml = (html: string): string => {
    if (!html) return '';
    
    // Create a temporary div to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove spans with only style attributes (browser-generated around emojis)
    const spans = temp.querySelectorAll('span[style]');
    spans.forEach((span) => {
      const style = span.getAttribute('style') || '';
      // If the span only has font-family in style (browser emoji wrapping), unwrap it
      if (style.includes('font-family') && span.children.length === 0) {
        const parent = span.parentNode;
        if (parent) {
          while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
          }
          parent.removeChild(span);
        }
      }
    });
    
    // Remove empty spans
    const emptySpans = temp.querySelectorAll('span:empty');
    emptySpans.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        parent.removeChild(span);
      }
    });
    
    // Remove style attributes from all elements (keep only intentional formatting tags)
    const allElements = temp.querySelectorAll('*');
    allElements.forEach((el) => {
      // Keep style only for intentional formatting, remove font-family styles
      const currentStyle = el.getAttribute('style');
      if (currentStyle) {
        // Remove font-family related styles
        const cleanedStyle = currentStyle
          .split(';')
          .filter((prop) => !prop.trim().startsWith('font-family'))
          .join(';')
          .trim();
        
        if (cleanedStyle) {
          el.setAttribute('style', cleanedStyle);
        } else {
          el.removeAttribute('style');
        }
      }
    });
    
    return temp.innerHTML;
  };

  const handleInput = () => {
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!multiline && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (multiline && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSave = () => {
    // Clean the HTML before saving
    const cleaned = cleanHtml(html);
    onSave(cleaned);
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-3 pb-3 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => exec('bold')}
          className="h-8 w-8 p-0 hover:bg-gray-100"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => exec('italic')}
          className="h-8 w-8 p-0 hover:bg-gray-100"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => exec('underline')}
          className="h-8 w-8 p-0 hover:bg-gray-100"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleLink}
          className="h-8 w-8 p-0 hover:bg-gray-100"
          title="Insert Link"
        >
          <Link2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="min-h-[120px] w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-black prose prose-sm max-w-none"
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
        data-placeholder={placeholder}
      />
      
      {/* Placeholder styling */}
      <style dangerouslySetInnerHTML={{__html: `
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}} />

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-9 px-4 text-gray-700 hover:bg-gray-100"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          className="h-9 px-4 bg-gray-900 text-white hover:bg-gray-800"
        >
          <Check className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
      {multiline && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Ctrl+Enter (Cmd+Enter on Mac) to save
        </p>
      )}
    </div>
  );
}

