"use client";

import { useEffect, useState } from "react";
import { formatDisplayTime, getDisplayTimeZone, isTbdGameDate } from "@/lib/display-time";

function formatLocalDateTime(dateStr: string, showDate: boolean, omitTimeZone: boolean) {
  if (isTbdGameDate(dateStr)) return "TBD";

  return formatDisplayTime(dateStr, {
    locale: undefined,
    timeZone: getDisplayTimeZone(),
    showDate,
    showTime: true,
    omitTimeZone,
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
