import type { NormalizedMessage } from "@/lib/chatgpt-export/types";
import type { HeatmapCell, HeatmapWeekday, WeekdayHourHeatmapResult } from "./types";

const TIME_ZONE = "Asia/Tokyo" as const;
const WEEKDAY_BY_SHORT_NAME: Record<string, HeatmapWeekday> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short", hour: "2-digit", hourCycle: "h23" });

function emptyCells(): HeatmapCell[] { return Array.from({ length: 7 }, (_, weekday) => Array.from({ length: 24 }, (_, hour) => ({ weekday: weekday as HeatmapWeekday, hour, count: 0 }))).flat(); }

function weekdayAndHourFromUnixSeconds(unixSeconds: number): { weekday: HeatmapWeekday; hour: number } | null {
  // ChatGPT export create_time values are Unix seconds, not milliseconds.
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return null;
  const parts = dateTimeFormatter.formatToParts(date);
  const weekdayName = parts.find((part) => part.type === "weekday")?.value;
  const hourValue = parts.find((part) => part.type === "hour")?.value;
  const weekday = weekdayName ? WEEKDAY_BY_SHORT_NAME[weekdayName] : undefined;
  const hour = hourValue ? Number(hourValue) : Number.NaN;
  return weekday === undefined || !Number.isInteger(hour) || hour < 0 || hour > 23 ? null : { weekday, hour };
}

export function createWeekdayHourHeatmap(messages: NormalizedMessage[]): WeekdayHourHeatmapResult {
  const cells = emptyCells();
  let includedMessageCount = 0;
  let excludedMessageCount = 0;
  for (const message of messages) {
    if (message.role !== "user") continue;
    if (message.createdAt === null || !Number.isFinite(message.createdAt)) { excludedMessageCount += 1; continue; }
    const dateParts = weekdayAndHourFromUnixSeconds(message.createdAt);
    if (!dateParts) { excludedMessageCount += 1; continue; }
    cells[dateParts.weekday * 24 + dateParts.hour].count += 1;
    includedMessageCount += 1;
  }
  return { cells, maxCount: Math.max(0, ...cells.map((cell) => cell.count)), includedMessageCount, excludedMessageCount, timeZone: TIME_ZONE };
}
