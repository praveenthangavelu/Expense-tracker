import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

const isValidDate = (d) => {
  if (!d) return false;
  const t = new Date(d);
  return t instanceof Date && !isNaN(t.getTime());
};

export const shortDate = (date) => {
  if (!isValidDate(date)) return "N/A";
  return format(new Date(date), "MMM d");
};

export const longDate = (date) => {
  if (!isValidDate(date)) return "N/A";
  return format(new Date(date), "MMM d, yyyy");
};

export const relativeDate = (date) => {
  if (!isValidDate(date)) return "N/A";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const dateGroupLabel = (date) => {
  if (!isValidDate(date)) return "Unknown Date";
  const value = new Date(date);

  if (isToday(value)) return "Today";
  if (isYesterday(value)) return "Yesterday";

  return longDate(value);
};

export const toInputDate = (date = new Date()) => {
  if (!isValidDate(date)) return format(new Date(), "yyyy-MM-dd");
  return format(new Date(date), "yyyy-MM-dd");
};

export const toISOFromInputDate = (date) => {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
};
