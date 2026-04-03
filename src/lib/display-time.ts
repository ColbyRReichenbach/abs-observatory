export const DEFAULT_DISPLAY_TIME_ZONE = "America/New_York";

type DateLike = string | Date;

type FormatDisplayTimeOptions = {
  locale?: string;
  timeZone?: string;
  showDate?: boolean;
  showTime?: boolean;
  omitTimeZone?: boolean;
  month?: "numeric" | "2-digit" | "short" | "long";
  day?: "numeric" | "2-digit";
  year?: "numeric" | "2-digit";
};

export function getDisplayTimeZone() {
  if (typeof window === "undefined") {
    return DEFAULT_DISPLAY_TIME_ZONE;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_DISPLAY_TIME_ZONE;
}

export function isTbdGameDate(dateLike: DateLike) {
  const value = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return (
    Number.isNaN(value.getTime()) ||
    (value.getUTCHours() === 0 && value.getUTCMinutes() === 0) ||
    (value.getUTCHours() === 7 && value.getUTCMinutes() === 33)
  );
}

export function formatDisplayTime(dateLike: DateLike, options: FormatDisplayTimeOptions = {}) {
  const {
    locale = "en-US",
    timeZone = DEFAULT_DISPLAY_TIME_ZONE,
    showDate = true,
    showTime = true,
    omitTimeZone = false,
    month = "short",
    day = "numeric",
    year,
  } = options;

  const value = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(value.getTime())) {
    return "Invalid date";
  }

  if (showDate && showTime) {
    return value.toLocaleString(locale, {
      month,
      day,
      year,
      hour: "numeric",
      minute: "2-digit",
      timeZone,
      timeZoneName: omitTimeZone ? undefined : "short",
    });
  }

  if (showDate) {
    return value.toLocaleDateString(locale, {
      month,
      day,
      year,
      timeZone,
    });
  }

  return value.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: omitTimeZone ? undefined : "short",
  });
}
