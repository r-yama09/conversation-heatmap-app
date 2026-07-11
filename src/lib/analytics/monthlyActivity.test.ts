import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseChatGptExport } from "../chatgpt-export/parser";
import type { NormalizedMessage } from "@/lib/chatgpt-export/types";
import { createMonthlyActivity, formatMonthlyActivityLabel } from "./monthlyActivity";

function message(role: NormalizedMessage["role"], createdAt: number | null, conversationId = "conversation-1", messageId = `${role}-${createdAt}`): NormalizedMessage {
  return { conversationId, messageId, title: "Fictional", role, text: "fictional text", createdAt };
}

function utc(year: number, month: number, day: number, hour = 12): number {
  return Date.UTC(year, month - 1, day, hour) / 1000;
}

describe("createMonthlyActivity", () => {
  it("uses Asia/Tokyo month boundaries and returns Japanese labels", () => {
    const result = createMonthlyActivity([
      message("user", utc(2024, 1, 31, 15)),
      message("assistant", utc(2024, 2, 1, 0)),
    ]);
    expect(result.months.map((month) => month.month)).toEqual(["2024-02"]);
    expect(formatMonthlyActivityLabel("2024-02")).toContain("2024");
    expect(formatMonthlyActivityLabel("2024-02")).toContain("2月");
  });

  it("separates user and assistant counts and de-duplicates conversations per month", () => {
    const result = createMonthlyActivity([
      message("user", utc(2024, 1, 2), "conversation-1", "user-1"),
      message("assistant", utc(2024, 1, 3), "conversation-1", "assistant-1"),
      message("user", utc(2024, 1, 4), "conversation-2", "user-2"),
    ]);
    expect(result.months[0]).toEqual({ month: "2024-01", conversationCount: 2, userMessageCount: 2, assistantMessageCount: 1, totalMessageCount: 3 });
  });

  it("includes a conversation in every month where it has a dated message", () => {
    const result = createMonthlyActivity([
      message("user", utc(2024, 1, 31), "conversation-1", "user-jan"),
      message("assistant", utc(2024, 3, 1), "conversation-1", "assistant-mar"),
    ]);
    expect(result.months.map((month) => month.month)).toEqual(["2024-01", "2024-02", "2024-03"]);
    expect(result.months.map((month) => month.conversationCount)).toEqual([1, 0, 1]);
  });

  it("fills empty intermediate months and excludes unknown dates and non-basic roles", () => {
    const result = createMonthlyActivity([
      message("user", utc(2024, 1, 1)),
      message("assistant", utc(2024, 3, 1)),
      message("user", null, "conversation-2", "missing-user"),
      message("assistant", null, "conversation-2", "missing-assistant"),
      message("system", null, "conversation-3", "system"),
      message("tool", utc(2024, 2, 1), "conversation-4", "tool"),
      message("unknown", utc(2024, 2, 1), "conversation-5", "unknown"),
    ]);
    expect(result.months).toHaveLength(3);
    expect(result.months[1].totalMessageCount).toBe(0);
    expect(result.excludedUnknownDateCount).toBe(2);
    expect(result.datedMessageCount).toBe(2);
  });

  it("selects the oldest month on ties and handles empty or all-unknown input", () => {
    const tied = createMonthlyActivity([
      message("user", utc(2024, 1, 1), "jan"),
      message("user", utc(2024, 2, 1), "feb"),
    ]);
    expect(tied.peakTotalMonth?.month).toBe("2024-01");
    expect(tied.peakUserMonth?.month).toBe("2024-01");
    expect(createMonthlyActivity([])).toEqual({ months: [], peakTotalMonth: null, peakUserMonth: null, analyzedMonthCount: 0, datedMessageCount: 0, excludedUnknownDateCount: 0 });
    expect(createMonthlyActivity([message("user", null)])).toEqual({ months: [], peakTotalMonth: null, peakUserMonth: null, analyzedMonthCount: 0, datedMessageCount: 0, excludedUnknownDateCount: 1 });
  });

  it("is deterministic and accepts the fictional sample", () => {
    const sample = JSON.parse(readFileSync(new URL("../../../public/sample-conversations.json", import.meta.url), "utf8")) as unknown;
    const parsed = parseChatGptExport(sample);
    const first = createMonthlyActivity(parsed.messages);
    expect(createMonthlyActivity(parsed.messages)).toEqual(first);
    expect(() => createMonthlyActivity(parsed.messages)).not.toThrow();
  });
});
