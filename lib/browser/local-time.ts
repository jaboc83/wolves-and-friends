// Time zone helpers for formatting dates and finding calendar days in the visitor's zone.
const dateValue = (value: string | Date) =>
  value instanceof Date ? value : new Date(value);

let resolvedTimeZone: string | undefined;
export function localTimeZone() {
  resolvedTimeZone ??=
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return resolvedTimeZone;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(
  key: string,
  create: () => Intl.DateTimeFormat,
): Intl.DateTimeFormat {
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = create();
    formatters.set(key, formatter);
  }
  return formatter;
}

const dayCache = new Map<string, string>();
export function dayInTimeZone(value: string | Date, timeZone: string) {
  const time = dateValue(value).getTime();
  const key = `${timeZone}|${time}`;
  let day = dayCache.get(key);
  if (day === undefined) {
    day = formatterFor(
      `day|${timeZone}`,
      () =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
    ).format(time);
    if (dayCache.size > 5000) dayCache.clear();
    dayCache.set(key, day);
  }
  return day;
}

const dateFields = [
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "dayPeriod",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "dateStyle",
  "timeStyle",
] as const;

export function formatInTimeZone(
  value: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  // Matches Date#toLocaleString, which defaults to date and time when no fields are set.
  const hasFields = dateFields.some((field) => options[field] !== undefined);
  const resolved: Intl.DateTimeFormatOptions = hasFields
    ? options
    : {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      };
  return formatterFor(
    `format|${timeZone}|${JSON.stringify(resolved)}`,
    () => new Intl.DateTimeFormat("en-US", { ...resolved, timeZone }),
  ).format(dateValue(value));
}

export function timeZoneLabel(
  timeZone: string,
  value: string | Date = new Date(),
) {
  return (
    formatterFor(
      `label|${timeZone}`,
      () =>
        new Intl.DateTimeFormat("en-US", {
          timeZone,
          timeZoneName: "short",
        }),
    )
      .formatToParts(dateValue(value))
      .find((part) => part.type === "timeZoneName")?.value || timeZone
  );
}
