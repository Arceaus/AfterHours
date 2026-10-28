export function getFormattedDate(date: Date = new Date()): {
  weekday: string;
  monthDay: string;
  year: string;
  fullString: string;
  timeString: string;
  nightWhisper: string;
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
  };
}
