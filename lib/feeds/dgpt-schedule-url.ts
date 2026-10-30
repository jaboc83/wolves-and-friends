export const dgptScheduleUrl = (base: string, year: number) => {
  const url = new URL(base);
  url.searchParams.set("eventCriteria", "full_schedule");
  url.searchParams.set("eventType", "all");
  url.searchParams.set("eventYear", String(year));
  return url.href;
};
