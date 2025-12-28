"use client";

import { useEffect } from 'react';

export function FullCalendarStyles() {
  useEffect(() => {
    // Load FullCalendar CSS dynamically
    const links = [
      {
        href: 'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.19/main.min.css',
        id: 'fullcalendar-core-css',
      },
      {
        href: 'https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.19/main.min.css',
        id: 'fullcalendar-daygrid-css',
      },
      {
        href: 'https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.19/main.min.css',
        id: 'fullcalendar-timegrid-css',
      },
    ];

    links.forEach(({ href, id }) => {
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    });

    return () => {
      // Cleanup on unmount (optional)
      links.forEach(({ id }) => {
        const link = document.getElementById(id);
        if (link) {
          link.remove();
        }
      });
    };
  }, []);

  return null;
}



