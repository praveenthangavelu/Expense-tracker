import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export const shortDate = (date) => format(new Date(date), "MMM d");

export const longDate = (date) => format(new Date(date), "MMM d, yyyy");

export const relativeDate = (date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const dateGroupLabel = (date) => {
  const value = new Date(date);

  if (isToday(value)) return "Today";
  if (isYesterday(value)) return "Yesterday";

  return longDate(value);
};

export const toInputDate = (date = new Date()) =>
  format(new Date(date), "yyyy-MM-dd");

export const toISOFromInputDate = (date) => new Date(date).toISOString();
