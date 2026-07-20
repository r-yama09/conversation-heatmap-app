import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseChatGptExport } from "../chatgpt-export/parser";
import type { NormalizedConversation, NormalizedMessage, ParsedExport } from "../chatgpt-export/types";
import { createWrappedInsights, createWrappedSummary } from "./wrappedSummary";

function unix(year: number, month: number, day: number, hour = 12): number {
  return Date.UTC(year, month - 1, day, hour) / 1000;
}

function message(role: NormalizedMessage["role"], createdAt: number | null, conversationId = "conversation-a", messageId = `${role}-${createdAt}`, text = "テスト文"): NormalizedMessage {
  return { conversationId, messageId, title: conversationId, role, text, createdAt };
}

function parsed(messages: NormalizedMessage[], conversations?: NormalizedConversation[]): ParsedExport {
  const ids = Array.from(new Set(messages.map((item) => item.conversationId)));
  const records = conversations ?? ids.map((conversationId) => ({ conversationId, title: conversationId, createdAt: null, updatedAt: null, messageCount: 0, userMessageCount: 0, assistantMessageCount: 0 }));
  const userMessageCount = messages.filter((item) => item.role === "user").length;
  const assistantMessageCount = messages.filter((item) => item.role === "assistant").length;
  return { conversations: records, messages, stats: { conversationCount: records.length, messageCount: userMessageCount + assistantMessageCount, userMessageCount, assistantMessageCount } };
}

describe("createWrappedSummary", () => {
  it("handles empty input without NaN or Infinity", () => {
    const result = createWrappedSummary(parsed([], []));
    expect(result.period).toEqual({ startAt: null, endAt: null, monthCount: 0 });
    expect(result.peakMonth).toBeNull();
    expect(result.messageRatio).toEqual({ user: 0, assistant: 0, userPercentage: 0, assistantPercentage: 0 });
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
  });

  it("keeps basic totals, ratio, top words, and only basic roles", () => {
    const result = createWrappedSummary(parsed([
      message("user", unix(2024, 1, 1), "a", "u1", "React React"),
      message("assistant", unix(2024, 1, 1), "a", "a1"),
      message("system", unix(2024, 1, 1), "a", "s1"),
      message("tool", unix(2024, 1, 1), "a", "t1"),
      message("unknown", unix(2024, 1, 1), "a", "x1"),
    ]));
    expect(result.totals).toEqual({ conversationCount: 1, messageCount: 2, userMessageCount: 1, assistantMessageCount: 1 });
    expect(result.messageRatio.userPercentage).toBe(50);
    expect(result.topWords).toEqual([{ token: "react", count: 2, messageCount: 1 }]);
  });

  it("uses Tokyo month boundaries and picks the oldest tied peak month", () => {
    const result = createWrappedSummary(parsed([
      message("user", unix(2024, 1, 31, 15), "jan", "jan"),
      message("user", unix(2024, 2, 2, 1), "feb", "feb"),
    ]));
    expect(result.period.monthCount).toBe(1);
    expect(result.peakMonth).toMatchObject({ monthKey: "2024-02", totalMessageCount: 2 });

    const tied = createWrappedSummary(parsed([message("user", unix(2024, 1, 1), "jan"), message("user", unix(2024, 2, 1), "feb")]));
    expect(tied.peakMonth?.monthKey).toBe("2024-01");
  });

  it("selects weekday, hour, pair, and daypart deterministically", () => {
    const result = createWrappedSummary(parsed([
      message("user", unix(2023, 12, 31, 15), "a", "monday-0"),
      message("user", unix(2023, 12, 31, 15), "a", "monday-0-2"),
      message("user", unix(2024, 1, 1, 15), "b", "tuesday-0"),
      message("user", unix(2024, 1, 1, 21), "b", "tuesday-6"),
    ]));
    expect(result.peakUsage).toMatchObject({ weekday: 0, hour: 0, daypart: "深夜", messageCount: 2 });
  });

  it("returns null usage and safe ratio for user-only and assistant-only data", () => {
    const userOnly = createWrappedSummary(parsed([message("user", null)]));
    expect(userOnly.messageRatio).toMatchObject({ user: 1, assistant: 0, userPercentage: 100, assistantPercentage: 0 });
    expect(userOnly.peakUsage).toMatchObject({ weekday: null, hour: null, daypart: null, messageCount: 0 });
    const assistantOnly = createWrappedSummary(parsed([message("assistant", null)]));
    expect(assistantOnly.messageRatio).toMatchObject({ userPercentage: 0, assistantPercentage: 100 });
  });

  it("finds the longest conversation with all specified tie breakers and fallback title", () => {
    const conversations: NormalizedConversation[] = [
      { conversationId: "z", title: "", createdAt: unix(2024, 1, 2), updatedAt: null, messageCount: 0, userMessageCount: 0, assistantMessageCount: 0 },
      { conversationId: "a", title: "A", createdAt: unix(2024, 1, 1), updatedAt: null, messageCount: 0, userMessageCount: 0, assistantMessageCount: 0 },
    ];
    const result = createWrappedSummary(parsed([
      message("user", unix(2024, 1, 2), "z", "z1", "あいう"),
      message("assistant", unix(2024, 1, 2), "z", "z2", "えお"),
      message("user", unix(2024, 1, 1), "a", "a1", "あいうえ"),
      message("assistant", unix(2024, 1, 1), "a", "a2", "お"),
    ], conversations));
    expect(result.longestConversation).toMatchObject({ conversationId: "a", title: "A", messageCount: 2, characterCount: 5 });
  });

  it("generates deterministic, evidence-based insights", () => {
    const messages = Array.from({ length: 6 }, (_, index) => message("user", unix(2024, 1, 1, 11), "a", `u${index}`));
    const first = createWrappedSummary(parsed(messages));
    expect(first.insights).toContain("夜にじっくり考えるタイプです");
    expect(createWrappedSummary(parsed(messages))).toEqual(first);
    expect(createWrappedInsights({ totals: first.totals, peakUsage: first.peakUsage, messageRatio: first.messageRatio }, [])).toEqual(["質問を重ねながら対話を進める傾向があります"]);
  });

  it("handles all unknown dates and the fictional sample without changing parser behavior", () => {
    const unknownDates = createWrappedSummary(parsed([message("user", null), message("assistant", null)]));
    expect(unknownDates.period).toEqual({ startAt: null, endAt: null, monthCount: 0 });
    const sample = JSON.parse(readFileSync(new URL("../../../public/sample-conversations.json", import.meta.url), "utf8")) as unknown;
    const source = parseChatGptExport(sample);
    expect(() => createWrappedSummary(source)).not.toThrow();
    expect(createWrappedSummary(source).totals).toEqual(source.stats);
  });
});
