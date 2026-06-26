import {
  addDays,
  differenceInDays,
  format,
  parseISO,
  startOfDay,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isValid
} from 'date-fns';

export const ZOOM_CONFIG = {
  days: {
    dayWidth: 48,
    headerHeight: 56,
  },
  weeks: {
    dayWidth: 16, // 112px per week
    headerHeight: 56,
  },
  months: {
    dayWidth: 4, // 120px per 30-day month
    headerHeight: 56,
  }
};

// Safe date parser to avoid timezone jumps
export function parseDate(dateStr: string): Date {
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? startOfDay(d) : new Date();
  } catch {
    return new Date();
  }
}

export function formatDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatReadable(dateStr: string): string {
  if (!dateStr) return '';
  return format(parseDate(dateStr), 'MMM d, yyyy');
}

export function getDaysCount(startStr: string, dueStr: string): number {
  const start = parseDate(startStr);
  const due = parseDate(dueStr);
  return Math.max(1, differenceInDays(due, start) + 1);
}

// Convert date to X pixel offset from timeline start
export function dateToX(dateStr: string, viewStartStr: string, zoom: 'days' | 'weeks' | 'months'): number {
  const date = parseDate(dateStr);
  const viewStart = parseDate(viewStartStr);
  const daysDiff = differenceInDays(date, viewStart);
  return daysDiff * ZOOM_CONFIG[zoom].dayWidth;
}

// Convert X pixel offset to YYYY-MM-DD date string
export function xToDateStr(x: number, viewStartStr: string, zoom: 'days' | 'weeks' | 'months'): string {
  const viewStart = parseDate(viewStartStr);
  const dayWidth = ZOOM_CONFIG[zoom].dayWidth;
  const daysDiff = Math.round(x / dayWidth);
  const targetDate = addDays(viewStart, daysDiff);
  return formatDateStr(targetDate);
}

// Generate headers and grid metadata
export interface TimelineHeaderCell {
  label: string;
  subLabel: string;
  left: number;
  width: number;
}

export function generateHeaders(
  viewStartStr: string,
  viewEndStr: string,
  zoom: 'days' | 'weeks' | 'months'
): { primary: TimelineHeaderCell[]; secondary: TimelineHeaderCell[]; totalWidth: number } {
  const start = parseDate(viewStartStr);
  const end = parseDate(viewEndStr);
  const totalDays = differenceInDays(end, start) + 1;
  const dayWidth = ZOOM_CONFIG[zoom].dayWidth;
  const totalWidth = totalDays * dayWidth;

  const primary: TimelineHeaderCell[] = [];
  const secondary: TimelineHeaderCell[] = [];

  if (zoom === 'days') {
    // Primary: Month & Year (e.g. "October 2026")
    const months = eachMonthOfInterval({ start, end });
    months.forEach((m, idx) => {
      const mStart = idx === 0 ? start : startOfMonth(m);
      const mEnd = idx === months.length - 1 ? end : endOfMonth(m);
      if (mStart > mEnd) return;
      
      const leftDays = differenceInDays(mStart, start);
      const spanDays = differenceInDays(mEnd, mStart) + 1;
      
      primary.push({
        label: format(m, 'MMMM yyyy'),
        subLabel: '',
        left: leftDays * dayWidth,
        width: spanDays * dayWidth,
      });
    });

    // Secondary: Individual Days
    const days = eachDayOfInterval({ start, end });
    days.forEach((d) => {
      const leftDays = differenceInDays(d, start);
      secondary.push({
        label: format(d, 'd'),
        subLabel: format(d, 'eee').substring(0, 1), // "M", "T", etc.
        left: leftDays * dayWidth,
        width: dayWidth,
      });
    });
  } else if (zoom === 'weeks') {
    // Primary: Month & Year
    const months = eachMonthOfInterval({ start, end });
    months.forEach((m, idx) => {
      const mStart = idx === 0 ? start : startOfMonth(m);
      const mEnd = idx === months.length - 1 ? end : endOfMonth(m);
      if (mStart > mEnd) return;

      const leftDays = differenceInDays(mStart, start);
      const spanDays = differenceInDays(mEnd, mStart) + 1;

      primary.push({
        label: format(m, 'MMMM yyyy'),
        subLabel: '',
        left: leftDays * dayWidth,
        width: spanDays * dayWidth,
      });
    });

    // Secondary: Weeks starting
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    weeks.forEach((w) => {
      const wStart = w < start ? start : w;
      const wEnd = endOfWeek(w, { weekStartsOn: 1 }) > end ? end : endOfWeek(w, { weekStartsOn: 1 });
      if (wStart > wEnd) return;

      const leftDays = differenceInDays(wStart, start);
      const spanDays = differenceInDays(wEnd, wStart) + 1;

      secondary.push({
        label: `W${format(w, 'I')}`,
        subLabel: format(w, 'd MMM'),
        left: leftDays * dayWidth,
        width: spanDays * dayWidth,
      });
    });
  } else {
    // zoom === 'months'
    // Primary: Years
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    for (let year = startYear; year <= endYear; year++) {
      const yStart = year === startYear ? start : new Date(year, 0, 1);
      const yEnd = year === endYear ? end : new Date(year, 11, 31);
      if (yStart > yEnd) continue;

      const leftDays = differenceInDays(yStart, start);
      const spanDays = differenceInDays(yEnd, yStart) + 1;

      primary.push({
        label: `${year}`,
        subLabel: '',
        left: leftDays * dayWidth,
        width: spanDays * dayWidth,
      });
    }

    // Secondary: Months
    const months = eachMonthOfInterval({ start, end });
    months.forEach((m) => {
      const mStart = m < start ? start : m;
      const mEnd = endOfMonth(m) > end ? end : endOfMonth(m);
      if (mStart > mEnd) return;

      const leftDays = differenceInDays(mStart, start);
      const spanDays = differenceInDays(mEnd, mStart) + 1;

      secondary.push({
        label: format(m, 'MMM'),
        subLabel: format(m, 'yy'),
        left: leftDays * dayWidth,
        width: spanDays * dayWidth,
      });
    });
  }

  return { primary, secondary, totalWidth };
}

export const FEATURE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  cyan: { bg: 'bg-cyan-500/80 dark:bg-cyan-600/80', text: 'text-cyan-500 dark:text-cyan-400', border: 'border-cyan-600 dark:border-cyan-500', dot: 'bg-cyan-500' },
  emerald: { bg: 'bg-emerald-500/80 dark:bg-emerald-600/80', text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-600 dark:border-emerald-500', dot: 'bg-emerald-500' },
  violet: { bg: 'bg-violet-500/80 dark:bg-violet-600/80', text: 'text-violet-500 dark:text-violet-400', border: 'border-violet-600 dark:border-violet-500', dot: 'bg-violet-500' },
  amber: { bg: 'bg-amber-500/80 dark:bg-amber-600/80', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-600 dark:border-amber-500', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-500/80 dark:bg-rose-600/80', text: 'text-rose-500 dark:text-rose-400', border: 'border-rose-600 dark:border-rose-500', dot: 'bg-rose-500' },
  blue: { bg: 'bg-blue-500/80 dark:bg-blue-600/80', text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-600 dark:border-blue-500', dot: 'bg-blue-500' },
  pink: { bg: 'bg-pink-500/80 dark:bg-pink-600/80', text: 'text-pink-500 dark:text-pink-400', border: 'border-pink-600 dark:border-pink-500', dot: 'bg-pink-500' },
  indigo: { bg: 'bg-indigo-500/80 dark:bg-indigo-600/80', text: 'text-indigo-500 dark:text-indigo-400', border: 'border-indigo-600 dark:border-indigo-500', dot: 'bg-indigo-500' },
};
