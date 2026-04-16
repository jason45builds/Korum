const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatDateTime = (value: string | Date) =>
  dateFormatter.format(typeof value === "string" ? new Date(value) : value);

export const toIsoString = (value: Date | string) =>
  (typeof value === "string" ? new Date(value) : value).toISOString();

export const isPast = (value: string | Date) =>
  (typeof value === "string" ? new Date(value) : value).getTime() < Date.now();

export const minutesFromNow = (minutes: number) =>
  new Date(Date.now() + minutes * 60 * 1000).toISOString();

export const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
