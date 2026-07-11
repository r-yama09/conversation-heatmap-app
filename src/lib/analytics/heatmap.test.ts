import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createWeekdayHourHeatmap } from "./heatmap";
import type { NormalizedMessage } from "@/lib/chatgpt-export/types";
import { parseChatGptExport } from "../chatgpt-export/parser";

function message(role: NormalizedMessage["role"], createdAt: number | null, messageId = `${role}-${createdAt}`): NormalizedMessage { return { conversationId: "fictional", messageId, title: "Fictional", role, text: "text", createdAt }; }

describe("createWeekdayHourHeatmap", () => {
  it("always creates 168 cells for empty input", () => { const result = createWeekdayHourHeatmap([]); expect(result.cells).toHaveLength(168); expect(result.maxCount).toBe(0); expect(result.includedMessageCount).toBe(0); });
  it("counts only user messages and excludes unknown timestamps", () => {
    const result = createWeekdayHourHeatmap([message("user", 0, "user"), message("assistant", 0), message("system", 0), message("tool", 0), message("unknown", 0), message("user", null, "missing-date")]);
    expect(result.includedMessageCount).toBe(1); expect(result.excludedMessageCount).toBe(1); expect(result.cells.reduce((total, cell) => total + cell.count, 0)).toBe(1);
  });
  it("uses Asia/Tokyo across UTC date boundaries and orders Sunday last", () => {
    const result = createWeekdayHourHeatmap([message("user", Date.UTC(2024, 0, 7, 15, 0, 0) / 1000, "monday-midnight"), message("user", Date.UTC(2024, 0, 7, 14, 0, 0) / 1000, "sunday-late")]);
    expect(result.cells[0]).toMatchObject({ weekday: 0, hour: 0, count: 1 }); expect(result.cells[6 * 24 + 23]).toMatchObject({ weekday: 6, hour: 23, count: 1 });
  });
  it("calculates max count, stable output, and included totals", () => {
    const input = [message("user", 0, "one"), message("user", 0, "two"), message("user", 3600, "three")]; const first = createWeekdayHourHeatmap(input);
    expect(first.maxCount).toBe(2); expect(first.cells.reduce((total, cell) => total + cell.count, 0)).toBe(first.includedMessageCount); expect(createWeekdayHourHeatmap(input)).toEqual(first);
  });

  it("keeps the fictional sample parser statistics and heatmap totals aligned", () => {
    const sample = JSON.parse(readFileSync(new URL("../../../public/sample-conversations.json", import.meta.url), "utf8")) as unknown;
    const parsed = parseChatGptExport(sample);
    const result = createWeekdayHourHeatmap(parsed.messages);
    expect(parsed.stats).toEqual({ conversationCount: 4, messageCount: 11, userMessageCount: 6, assistantMessageCount: 5 });
    expect(result.cells).toHaveLength(168);
    expect(result.cells.reduce((total, cell) => total + cell.count, 0)).toBe(result.includedMessageCount);
    expect(result.includedMessageCount + result.excludedMessageCount).toBe(parsed.stats.userMessageCount);
    expect(result.timeZone).toBe("Asia/Tokyo");
  });
});
