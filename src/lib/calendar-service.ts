/**
 * Calendar Integration Service
 * Handles Google Calendar API, .ics generation, and reminders
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  meetingLink?: string;
  reminderMinutes?: number[];
}

export interface MeetingDetails {
  subject: string;
  participants: string[];
  proposedTimes: Date[];
  duration: number; // in minutes
  description?: string;
  location?: string;
  isVirtual?: boolean;
}

export class CalendarService {
  /**
   * Generate .ics calendar file for download
   */
  static generateICSFile(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text.replace(/[\\;,\n]/g, (match) => {
        switch (match) {
          case '\\': return '\\\\';
          case ';': return '\\;';
          case ',': return '\\,';
          case '\n': return '\\n';
          default: return match;
        }
      });
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AI Email Client//Calendar Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@ai-email-client.com`,
      `DTSTART:${formatDate(event.startTime)}`,
      `DTEND:${formatDate(event.endTime)}`,
      `SUMMARY:${escapeText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
      `DTSTAMP:${formatDate(new Date())}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      // Add reminders
      ...(event.reminderMinutes || [15]).map(minutes => [
        'BEGIN:VALARM',
        'TRIGGER:-PT' + minutes + 'M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${escapeText(event.title)}`,
        'END:VALARM'
      ]).flat(),
      // Add attendees
      ...(event.attendees || []).map(email => `ATTENDEE:mailto:${email}`),
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line !== '').join('\r\n');

    return icsContent;
  }

  /**
   * Download .ics file
   */
  static downloadICSFile(event: CalendarEvent, filename?: string): void {
    const icsContent = this.generateICSFile(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  /**
   * Generate Google Calendar URL
   */
  static generateGoogleCalendarURL(event: CalendarEvent): string {
    const formatGoogleDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatGoogleDate(event.startTime)}/${formatGoogleDate(event.endTime)}`,
      details: event.description || '',
      location: event.location || '',
      add: (event.attendees || []).join(','),
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate Outlook Calendar URL
   */
  static generateOutlookCalendarURL(event: CalendarEvent): string {
    const formatOutlookDate = (date: Date): string => {
      return date.toISOString();
    };

    const params = new URLSearchParams({
      subject: event.title,
      startdt: formatOutlookDate(event.startTime),
      enddt: formatOutlookDate(event.endTime),
      body: event.description || '',
      location: event.location || '',
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  /**
   * Parse meeting details from AI-generated text
   */
  static parseMeetingFromText(text: string, senderEmail: string): MeetingDetails | null {
    try {
      // Extract meeting subject
      const subjectMatch = text.match(/(?:meeting|call|discussion).*?(?:about|regarding|for)\s+([^.!?]+)/i);
      const subject = subjectMatch && subjectMatch[1] ? subjectMatch[1].trim() : 'Meeting Discussion';

      // Extract time references
      const timePatterns = [
        /(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
        /(?:tomorrow|today)/gi,
        /(\d{1,2}):(\d{2})\s*(am|pm)/gi,
        /(\d{1,2})\s*(am|pm)/gi,
      ];

      const proposedTimes: Date[] = [];
      const now = new Date();

      // Simple time parsing (can be enhanced)
      if (text.toLowerCase().includes('tomorrow')) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0); // Default to 2 PM
        proposedTimes.push(tomorrow);
      }

      if (text.toLowerCase().includes('next week')) {
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(14, 0, 0, 0); // Default to 2 PM
        proposedTimes.push(nextWeek);
      }

      // Default to next business day if no time found
      if (proposedTimes.length === 0) {
        const nextBusinessDay = new Date(now);
        nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
        if (nextBusinessDay.getDay() === 0) nextBusinessDay.setDate(nextBusinessDay.getDate() + 1); // Skip Sunday
        if (nextBusinessDay.getDay() === 6) nextBusinessDay.setDate(nextBusinessDay.getDate() + 2); // Skip Saturday
        nextBusinessDay.setHours(14, 0, 0, 0);
        proposedTimes.push(nextBusinessDay);
      }

      // Extract duration (default to 1 hour)
      const durationMatch = text.match(/(\d+)\s*(?:hour|hr|minute|min)/i);
      const duration = durationMatch && durationMatch[1] ? 
        (text.toLowerCase().includes('minute') || text.toLowerCase().includes('min') ? 
          parseInt(durationMatch[1]) : parseInt(durationMatch[1]) * 60) : 60;

      // Check if virtual meeting
      const isVirtual = /(?:zoom|teams|meet|virtual|online|video\s*call)/i.test(text);

      return {
        subject,
        participants: [senderEmail],
        proposedTimes,
        duration,
        description: text,
        isVirtual,
      };
    } catch (error) {
      console.error('Error parsing meeting details:', error);
      return null;
    }
  }

  /**
   * Generate meeting links
   */
  static generateMeetingLinks(meetingDetails: MeetingDetails) {
    const encodedSubject = encodeURIComponent(meetingDetails.subject);
    
    return {
      zoom: `https://zoom.us/start/videomeeting`,
      googleMeet: `https://meet.google.com/new`,
      teams: `https://teams.microsoft.com/l/meeting/new`,
      // Calendar links
      googleCalendar: this.generateGoogleCalendarURL({
        title: meetingDetails.subject,
        description: meetingDetails.description,
        startTime: meetingDetails.proposedTimes[0] || new Date(),
        endTime: new Date((meetingDetails.proposedTimes[0] || new Date()).getTime() + meetingDetails.duration * 60000),
        attendees: meetingDetails.participants,
        location: meetingDetails.isVirtual ? 'Virtual Meeting' : undefined,
      }),
      outlook: this.generateOutlookCalendarURL({
        title: meetingDetails.subject,
        description: meetingDetails.description,
        startTime: meetingDetails.proposedTimes[0] || new Date(),
        endTime: new Date((meetingDetails.proposedTimes[0] || new Date()).getTime() + meetingDetails.duration * 60000),
        attendees: meetingDetails.participants,
        location: meetingDetails.isVirtual ? 'Virtual Meeting' : undefined,
      }),
    };
  }
}

/**
 * Browser Notification Service for Reminders
 */
export class ReminderService {
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  static async scheduleReminder(
    title: string, 
    message: string, 
    scheduledTime: Date,
    options?: {
      icon?: string;
      badge?: string;
      tag?: string;
    }
  ): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return;
    }

    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Show immediately if time has passed
      this.showNotification(title, message, options);
      return;
    }

    // Schedule for future
    setTimeout(() => {
      this.showNotification(title, message, options);
    }, delay);

    console.log(`Reminder scheduled for ${scheduledTime.toLocaleString()}`);
  }

  static showNotification(
    title: string, 
    message: string, 
    options?: {
      icon?: string;
      badge?: string;
      tag?: string;
    }
  ): void {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: options?.icon || '/favicon.ico',
        badge: options?.badge || '/favicon.ico',
        tag: options?.tag || 'ai-email-reminder',
        requireInteraction: true,
      });

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }
}