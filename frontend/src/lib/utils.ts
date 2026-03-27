import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string into IST (Indian Standard Time)
 * Returns format: "DD MMM YYYY"
 */
export function formatDateIST(dateString: string | Date) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(date);
}

/**
 * Formats a date string into IST Time
 * Returns format: "hh:mm AM/PM"
 */
export function formatTimeIST(dateString: string | Date) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).format(date);
}

/**
 * Formats a date string into IST DateTime
 * Returns format: "DD MMM YYYY, hh:mm AM/PM"
 */
export function formatDateTimeIST(dateString: string | Date) {
  if (!dateString) return "N/A";
  return `${formatDateIST(dateString)}, ${formatTimeIST(dateString)}`;
}

/**
 * Formats a date for datetime-local input in IST
 * Returns format: "YYYY-MM-DDTHH:mm"
 */
export function toISTDateTimeLocal(dateString: string | Date) {
  if (!dateString) return "";
  const date = new Date(dateString);
  
  // Use Intl to get parts in IST
  const parts = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  }).formatToParts(date);

  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  // Intl format for en-IN is DD/MM/YYYY, HH:mm
  // We need YYYY-MM-DDTHH:mm
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
}

/**
 * Converts a local datetime string (from input) to UTC ISO string
 * Assumes the input string is in IST if we want to be strict, 
 * but standard is to use the browser's local time if it's already IST.
 * For production LMS, we should ensure it's treated as IST regardless of browser TZ.
 */
export function fromISTToUTC(dateTimeLocalString: string) {
  if (!dateTimeLocalString) return null;
  
  // To strictly treat the string as IST, we can append the offset
  // or use a library. Without a library, we can do:
  const [datePart, timePart] = dateTimeLocalString.split('T');
  const [year, month, day] = datePart.split('-');
  const [hour, minute] = timePart.split(':');
  
  // Create a string that Date constructor treats as absolute if possible, 
  // or use the fact that IST is UTC+5:30
  const date = new Date(`${datePart}T${timePart}:00+05:30`);
  return date.toISOString();
}

