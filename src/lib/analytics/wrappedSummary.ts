import type { ParsedExport, NormalizedMessage } from "@/lib/chatgpt-export/types";
import { createFrequentWords } from "./frequentWords";
import { createWeekdayHourHeatmap } from "./heatmap";
import { formatMonthlyActivityLabel, createMonthlyActivity } from "./monthlyActivity";
import type { HeatmapWeekday, WrappedLongestConversation, WrappedPeakUsage, WrappedSummary } from "./types";

type Daypart = "深夜" | "朝" | "昼" | "夜";

function isBasicMessage(message: NormalizedMessage): boolean {
  return message.role === "user" || message.role === "assistant";
}

function daypartForHour(hour: number): Daypart {
  if (hour <= 5) return "深夜";
  if (hour <= 11) return "朝";
  if (hour <= 17) return "昼";
  return "夜";
}

function dateFromUnixSeconds(value: number | null): Date | null {
  if (value === null || !Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function peakUsage(messages: NormalizedMessage[]): WrappedPeakUsage {
  const heatmap = createWeekdayHourHeatmap(messages);
  if (heatmap.includedMessageCount === 0) return { weekday: null, weekdayMessageCount: 0, hour: null, hourMessageCount: 0, daypart: null, messageCount: 0 };
  const weekdayCounts = Array.from({ length: 7 }, (_, weekday) => heatmap.cells.slice(weekday * 24, weekday * 24 + 24).reduce((total, cell) => total + cell.count, 0));
  const hourCounts = Array.from({ length: 24 }, (_, hour) => heatmap.cells.filter((cell) => cell.hour === hour).reduce((total, cell) => total + cell.count, 0));
  const pair = heatmap.cells.reduce((peak, cell) => cell.count > peak.count ? cell : peak, heatmap.cells[0]);
  const weekday = weekdayCounts.reduce((peak, count, index) => count > weekdayCounts[peak] ? index : peak, 0) as HeatmapWeekday;
  const hour = hourCounts.reduce((peak, count, index) => count > hourCounts[peak] ? index : peak, 0);
  return { weekday, weekdayMessageCount: weekdayCounts[weekday], hour, hourMessageCount: hourCounts[hour], daypart: daypartForHour(pair.hour), messageCount: pair.count };
}

function findLongestConversation(input: ParsedExport): WrappedLongestConversation | null {
  if (!input.conversations.length) return null;
  const messagesByConversation = new Map<string, NormalizedMessage[]>();
  for (const message of input.messages) {
    if (!isBasicMessage(message)) continue;
    const messages = messagesByConversation.get(message.conversationId) ?? [];
    messages.push(message);
    messagesByConversation.set(message.conversationId, messages);
  }
  const candidates = input.conversations.map((conversation) => {
    const messages = messagesByConversation.get(conversation.conversationId) ?? [];
    const datedMessages = messages.map((message) => message.createdAt).filter((value): value is number => value !== null && Number.isFinite(value));
    return {
      conversationId: conversation.conversationId,
      title: conversation.title || "無題の会話",
      messageCount: messages.length,
      userMessageCount: messages.filter((message) => message.role === "user").length,
      assistantMessageCount: messages.filter((message) => message.role === "assistant").length,
      characterCount: messages.reduce((total, message) => total + Array.from(message.text).length, 0),
      startedAt: datedMessages.length ? Math.min(...datedMessages) : conversation.createdAt,
    };
  });
  return candidates.sort((left, right) => right.messageCount - left.messageCount || right.characterCount - left.characterCount || (left.startedAt ?? Number.POSITIVE_INFINITY) - (right.startedAt ?? Number.POSITIVE_INFINITY) || left.conversationId.localeCompare(right.conversationId))[0] ?? null;
}

export function createWrappedInsights(summary: Pick<WrappedSummary, "totals" | "peakUsage" | "messageRatio">, messages: NormalizedMessage[]): string[] {
  const userMessages = messages.filter((message) => message.role === "user");
  const insights: string[] = [];
  if (userMessages.length >= 4 && summary.peakUsage.daypart && summary.peakUsage.messageCount / userMessages.length >= 0.4) {
    const daypartComment: Record<Daypart, string> = { 深夜: "深夜に集中して考えるタイプです", 朝: "朝からChatGPTを活用しています", 昼: "昼の時間帯にChatGPTを活用しています", 夜: "夜にじっくり考えるタイプです" };
    insights.push(daypartComment[summary.peakUsage.daypart]);
  }
  const weekendCount = userMessages.filter((message) => {
    const date = dateFromUnixSeconds(message.createdAt);
    if (!date) return false;
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", weekday: "short" }).format(date);
    return weekday === "Sat" || weekday === "Sun";
  }).length;
  const datedUserCount = userMessages.filter((message) => dateFromUnixSeconds(message.createdAt)).length;
  if (datedUserCount >= 6 && weekendCount / datedUserCount >= 0.6) insights.push("休日にまとめてChatGPTを活用しています");
  if (summary.totals.messageCount >= 6 && summary.messageRatio.userPercentage >= 60) insights.push("質問を重ねながら対話を進める傾向があります");
  if (summary.totals.messageCount >= 6 && summary.messageRatio.assistantPercentage >= 65) insights.push("AIからの回答をじっくり読む傾向があります");
  return insights.slice(0, 3);
}

export function createWrappedSummary(input: ParsedExport): WrappedSummary {
  const basicMessages = input.messages.filter(isBasicMessage);
  const monthly = createMonthlyActivity(input.messages);
  const peak = monthly.peakTotalMonth;
  const dated = basicMessages.map((message) => message.createdAt).filter((value): value is number => value !== null && Number.isFinite(value));
  const totals = { ...input.stats };
  const total = totals.messageCount;
  const summary: WrappedSummary = {
    period: { startAt: dated.length ? Math.min(...dated) : null, endAt: dated.length ? Math.max(...dated) : null, monthCount: monthly.analyzedMonthCount },
    totals,
    peakMonth: peak ? { monthKey: peak.month, label: formatMonthlyActivityLabel(peak.month), totalMessageCount: peak.totalMessageCount, userMessageCount: peak.userMessageCount, assistantMessageCount: peak.assistantMessageCount, share: total > 0 ? peak.totalMessageCount / total : 0 } : null,
    peakUsage: peakUsage(input.messages),
    topWords: createFrequentWords(input.messages, 5).words,
    messageRatio: { user: totals.userMessageCount, assistant: totals.assistantMessageCount, userPercentage: total > 0 ? totals.userMessageCount / total * 100 : 0, assistantPercentage: total > 0 ? totals.assistantMessageCount / total * 100 : 0 },
    longestConversation: findLongestConversation(input),
    insights: [],
  };
  summary.insights = createWrappedInsights(summary, input.messages);
  return summary;
}
