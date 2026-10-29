export function getLocalCalendarDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalCalendarDate(dateStr: string): {
  weekday: string;
  monthDay: string;
  year: string;
  fullDate: string;
  monthName: string;
} {
  if (!dateStr) {
    const now = new Date();
    return {
      weekday: now.toLocaleDateString('en-US', { weekday: 'long' }),
      monthDay: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      year: now.toLocaleDateString('en-US', { year: 'numeric' }),
      fullDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      monthName: now.toLocaleDateString('en-US', { month: 'long' }),
    };
  }

  // Parse YYYY-MM-DD parts strictly as local integers
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yearNum = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10) - 1;
    const dayNum = parseInt(parts[2], 10);
    const localDate = new Date(yearNum, monthNum, dayNum);

    return {
      weekday: localDate.toLocaleDateString('en-US', { weekday: 'long' }),
      monthDay: localDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      year: String(yearNum),
      fullDate: localDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      monthName: localDate.toLocaleDateString('en-US', { month: 'long' }),
    };
  }

  return {
    weekday: '',
    monthDay: dateStr,
    year: '',
    fullDate: dateStr,
    monthName: '',
  };
}

export function formatTimeFromISO(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function formatDateTimeFromISO(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function getFormattedDate(date: Date = new Date()): {
  weekday: string;
  monthDay: string;
  year: string;
  fullString: string;
  timeString: string;
  nightWhisper: string;
  localCalendarDate: string;
} {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const year = date.toLocaleDateString('en-US', { year: 'numeric' });

  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const hours = date.getHours();
  let nightWhisper = 'The last room awake';
  if (hours >= 0 && hours < 3) {
    nightWhisper = 'The quietest hour of the night';
  } else if (hours >= 3 && hours < 6) {
    nightWhisper = 'Before the first light';
  } else if (hours >= 6 && hours < 12) {
    nightWhisper = 'Morning stillness';
  } else if (hours >= 12 && hours < 18) {
    nightWhisper = 'Afternoon solitude';
  } else if (hours >= 18 && hours < 22) {
    nightWhisper = 'Dusk has settled';
  } else {
    nightWhisper = 'The outside world has gone silent';
  }

  return {
    weekday,
    monthDay,
    year,
    fullString: `${weekday}, ${monthDay}`,
    timeString,
    nightWhisper,
    localCalendarDate: getLocalCalendarDate(date),
  };
}

// Calendar Utilities (Safe from UTC timezone shifting)
export function getDaysInMonth(year: number, month: number): number {
  // month: 0-11; day 0 of month+1 gives last day of target month (handles leap years)
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return new Date(year, month, 1).getDay();
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month] || '';
}

export function formatMonthYear(year: number, month: number): string {
  return `${getMonthName(month)} ${year}`;
}

export function getMonthKey(dateStr: string): string {
  if (!dateStr || dateStr.length < 7) return '';
  return dateStr.substring(0, 7); // e.g. "2026-10"
}

export function formatMonthKey(monthKey: string): string {
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    return `${getMonthName(month)} ${year}`;
  }
  return monthKey;
}

export function isToday(dateStr: string): boolean {
  return dateStr === getLocalCalendarDate();
}

// Temporary display title derived from content if title is missing
export function deriveDisplayTitle(title?: string, content?: string): string {
  if (title && title.trim()) {
    return title.trim();
  }
  if (!content || !content.trim()) {
    return 'Untitled reflection';
  }
  // Take the first line or first 50 characters of content
  const firstLine = content.trim().split('\n')[0].trim();
  if (firstLine.length <= 50) {
    return firstLine;
  }
  return `${firstLine.substring(0, 48).trim()}...`;
}
