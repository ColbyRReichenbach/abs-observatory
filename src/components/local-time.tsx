export function LocalTime({ dateStr, showDate = false, omitTimeZone = false }: { dateStr: string, showDate?: boolean, omitTimeZone?: boolean }) {
  let formatted = "TBD";
  const d = new Date(dateStr);
  const isTBD = isNaN(d.getTime()) || (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) || (d.getUTCHours() === 7 && d.getUTCMinutes() === 33);
  if (!isTBD) {
    if (showDate) {
      formatted = d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: omitTimeZone ? undefined : "short"
      });
    } else {
      formatted = d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: omitTimeZone ? undefined : "short"
      });
    }
  }

  return <span suppressHydrationWarning>{formatted}</span>;
}
