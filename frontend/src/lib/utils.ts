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

