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
} {
  if (!dateStr) {
    const now = new Date();
    return {
      weekday: now.toLocaleDateString('en-US', { weekday: 'long' }),
      monthDay: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      year: now.toLocaleDateString('en-US', { year: 'numeric' }),
      fullDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
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
    };
  }

  return {
    weekday: '',
    monthDay: dateStr,
    year: '',
    fullDate: dateStr,
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
