import type { ParsedExport } from "@/lib/chatgpt-export/types";
import { createFrequentWords } from "./frequentWords";
import { createWeekdayHourHeatmap } from "./heatmap";
import { createMonthlyActivity } from "./monthlyActivity";
import type { AiHandoffJson, AiHandoffUsageSummary, AiHandoffWrappedSummary } from "./types";
import { createWrappedSummary } from "./wrappedSummary";

const TIME_ZONE = "Asia/Tokyo" as const;

export type CreateAiHandoffJsonOptions = {
  generatedAt?: string;
  isPartial?: boolean;
};

function safeIsoFromUnixSeconds(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function usageSummary(input: ParsedExport): AiHandoffUsageSummary {
  const heatmap = createWeekdayHourHeatmap(input.messages);
  return {
    peakUsage: createWrappedSummary(input).peakUsage,
    weekdayMessageCounts: Array.from({ length: 7 }, (_, weekday) => ({
      weekday: weekday as AiHandoffUsageSummary["weekdayMessageCounts"][number]["weekday"],
      messageCount: heatmap.cells.slice(weekday * 24, weekday * 24 + 24).reduce((total, cell) => total + cell.count, 0),
    })),
    hourMessageCounts: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      messageCount: heatmap.cells.filter((cell) => cell.hour === hour).reduce((total, cell) => total + cell.count, 0),
    })),
    includedUserMessageCount: heatmap.includedMessageCount,
    excludedUnknownDateUserMessageCount: heatmap.excludedMessageCount,
  };
}

function handoffWrappedSummary(input: ParsedExport): AiHandoffWrappedSummary {
  const wrapped = createWrappedSummary(input);
  const { longestConversation, ...withoutLongestConversation } = wrapped;
  return {
    ...withoutLongestConversation,
    longestConversation: longestConversation ? {
      title: longestConversation.title,
      messageCount: longestConversation.messageCount,
      userMessageCount: longestConversation.userMessageCount,
      assistantMessageCount: longestConversation.assistantMessageCount,
      characterCount: longestConversation.characterCount,
      startedAt: longestConversation.startedAt,
    } : null,
  };
}

export function createAiHandoffJson(input: ParsedExport, options: CreateAiHandoffJsonOptions = {}): AiHandoffJson {
  const wrapped = handoffWrappedSummary(input);
  return {
    meta: {
      schemaVersion: "0.1",
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      timeZone: TIME_ZONE,
      period: {
        startAt: safeIsoFromUnixSeconds(wrapped.period.startAt),
        endAt: safeIsoFromUnixSeconds(wrapped.period.endAt),
        monthCount: wrapped.period.monthCount,
      },
      conversationCount: wrapped.totals.conversationCount,
      messageCount: wrapped.totals.messageCount,
      isPartial: options.isPartial ?? false,
    },
    summary: {
      usage: usageSummary(input),
      monthlyActivity: createMonthlyActivity(input.messages),
      frequentWords: createFrequentWords(input.messages, 5),
      wrapped,
    },
    compare: {
      status: "not_compared",
      reason: "比較対象期間は未選択のため、期間比較はまだ集計していません。",
      baseline: null,
      comparison: null,
    },
    todo: [
      "比較対象期間を選択していないため、期間比較は未集計です。",
      "会話本文を含めない追加分析項目は未定義です。",
    ],
    instruction: "このJSONは会話本文を含まないローカル集計結果です。数値の傾向を分析し、未比較項目と途中結果の有無を踏まえて回答してください。",
  };
}

export function serializeAiHandoffJson(input: ParsedExport, options: CreateAiHandoffJsonOptions = {}): string {
  return JSON.stringify(createAiHandoffJson(input, options), null, 2);
}
