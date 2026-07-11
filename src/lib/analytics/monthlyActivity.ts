import type { NormalizedMessage } from "@/lib/chatgpt-export/types";
import type { MonthlyActivityItem, MonthlyActivityResult } from "./types";

export const MONTHLY_ACTIVITY_TIME_ZONE = "Asia/Tokyo" as const;

const monthPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MONTHLY_ACTIVITY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});
const monthLabelFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: MONTHLY_ACTIVITY_TIME_ZONE,
  year: "numeric",
  month: "long",
});

function monthFromUnixSeconds(unixSeconds: number): string | null {
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return null;
  const parts = monthPartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month.padStart(2, "0")}` : null;
}

function monthDate(month: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (!Number.isInteger(year) || monthNumber < 1 || monthNumber > 12) return null;
  return new Date(Date.UTC(year, monthNumber - 1, 15, 12));
}

export function formatMonthlyActivityLabel(month: string): string {
  const date = monthDate(month);
  return date ? monthLabelFormatter.format(date) : month;
}

function monthIndex(month: string): number {
  const date = monthDate(month);
  return date ? date.getUTCFullYear() * 12 + date.getUTCMonth() : 0;
}

function monthFromIndex(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function emptyMonth(month: string): MonthlyActivityItem {
  return { month, conversationCount: 0, userMessageCount: 0, assistantMessageCount: 0, totalMessageCount: 0 };
}

function compareByMonth(left: MonthlyActivityItem, right: MonthlyActivityItem): number {
  return left.month < right.month ? -1 : left.month > right.month ? 1 : 0;
}

function peakMonth(months: MonthlyActivityItem[], value: (month: MonthlyActivityItem) => number): MonthlyActivityItem | null {
  let peak: MonthlyActivityItem | null = null;
  for (const month of months) {
    if (!peak || value(month) > value(peak)) peak = month;
  }
  return peak;
}

export function createMonthlyActivity(messages: NormalizedMessage[]): MonthlyActivityResult {
  const monthMap = new Map<string, MonthlyActivityItem>();
  const conversationIdsByMonth = new Map<string, Set<string>>();
  let datedMessageCount = 0;
  let excludedUnknownDateCount = 0;
  let firstMonth: string | null = null;
  let lastMonth: string | null = null;

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const month = message.createdAt !== null && Number.isFinite(message.createdAt)
      ? monthFromUnixSeconds(message.createdAt)
      : null;
    if (!month) {
      excludedUnknownDateCount += 1;
      continue;
    }

    datedMessageCount += 1;
    if (!firstMonth || month < firstMonth) firstMonth = month;
    if (!lastMonth || month > lastMonth) lastMonth = month;
    const item = monthMap.get(month) ?? emptyMonth(month);
    if (message.role === "user") item.userMessageCount += 1;
    else item.assistantMessageCount += 1;
    item.totalMessageCount += 1;
    monthMap.set(month, item);
    const conversationIds = conversationIdsByMonth.get(month) ?? new Set<string>();
    conversationIds.add(message.conversationId);
    conversationIdsByMonth.set(month, conversationIds);
  }

  if (firstMonth && lastMonth) {
    for (let index = monthIndex(firstMonth); index <= monthIndex(lastMonth); index += 1) {
      const month = monthFromIndex(index);
      if (!monthMap.has(month)) monthMap.set(month, emptyMonth(month));
    }
  }

  const months = Array.from(monthMap.values()).map((item) => ({
    ...item,
    conversationCount: conversationIdsByMonth.get(item.month)?.size ?? 0,
  })).sort(compareByMonth);
  return {
    months,
    peakTotalMonth: peakMonth(months, (month) => month.totalMessageCount),
    peakUserMonth: peakMonth(months, (month) => month.userMessageCount),
    analyzedMonthCount: months.length,
    datedMessageCount,
    excludedUnknownDateCount,
  };
}
