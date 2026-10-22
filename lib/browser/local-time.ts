const dateValue = (value: string | Date) =>
  value instanceof Date ? value : new Date(value);

export function localTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function dayInTimeZone(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateValue(value));
}

export function formatInTimeZone(
  value: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return dateValue(value).toLocaleString("en-US", { ...options, timeZone });
}

export function timeZoneLabel(
  timeZone: string,
  value: string | Date = new Date(),
) {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(dateValue(value))
      .find((part) => part.type === "timeZoneName")?.value || timeZone
  );
}
