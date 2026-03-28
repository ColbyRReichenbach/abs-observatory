"use client";

import { useEffect, useState } from "react";

function formatLocalDateTime(dateStr: string, showDate: boolean, omitTimeZone: boolean) {
  const d = new Date(dateStr);
  const isTBD =
    isNaN(d.getTime()) ||
    (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) ||
    (d.getUTCHours() === 7 && d.getUTCMinutes() === 33);

  if (isTBD) return "TBD";

  if (showDate) {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: omitTimeZone ? undefined : "short",
    });
  }

  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: omitTimeZone ? undefined : "short",
  });
}

export function LocalTime({
  dateStr,
  showDate = false,
  omitTimeZone = false,
}: {
  dateStr: string;
  showDate?: boolean;
  omitTimeZone?: boolean;
}) {
  const [formatted, setFormatted] = useState(() => formatLocalDateTime(dateStr, showDate, omitTimeZone));

  useEffect(() => {
    setFormatted(formatLocalDateTime(dateStr, showDate, omitTimeZone));
  }, [dateStr, showDate, omitTimeZone]);

  return <span suppressHydrationWarning>{formatted}</span>;
}
