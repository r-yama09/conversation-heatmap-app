import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseChatGptExport } from "../chatgpt-export/parser";
import type { NormalizedConversation, NormalizedMessage, ParsedExport } from "../chatgpt-export/types";
import { createAiHandoffJson, serializeAiHandoffJson } from "./aiHandoff";

const GENERATED_AT = "2026-07-20T00:00:00.000Z";

function message(role: NormalizedMessage["role"], text: string, createdAt: number | null, conversationId = "conversation-1"): NormalizedMessage {
  return { conversationId, messageId: `${conversationId}-${role}-${createdAt}`, title: "無題の会話", role, text, createdAt };
}

function parsed(messages: NormalizedMessage[], conversations: NormalizedConversation[] = []): ParsedExport {
  const records = conversations.length ? conversations : Array.from(new Set(messages.map((item) => item.conversationId))).map((conversationId) => ({ conversationId, title: "無題の会話", createdAt: null, updatedAt: null, messageCount: 0, userMessageCount: 0, assistantMessageCount: 0 }));
  const userMessageCount = messages.filter((item) => item.role === "user").length;
  const assistantMessageCount = messages.filter((item) => item.role === "assistant").length;
  return { conversations: records, messages, stats: { conversationCount: records.length, messageCount: userMessageCount + assistantMessageCount, userMessageCount, assistantMessageCount } };
}

describe("createAiHandoffJson", () => {
  it("creates the required v0.1 schema with partial state and no comparison", () => {
    const source = parsed([message("user", "分析を進める", Date.UTC(2024, 0, 1) / 1000), message("assistant", "了解しました", Date.UTC(2024, 0, 1, 1) / 1000)]);
    const result = createAiHandoffJson(source, { generatedAt: GENERATED_AT, isPartial: true });
    expect(result.meta).toMatchObject({ schemaVersion: "0.1", generatedAt: GENERATED_AT, timeZone: "Asia/Tokyo", conversationCount: 1, messageCount: 2, isPartial: true });
    expect(result).toHaveProperty("summary.usage");
    expect(result).toHaveProperty("summary.monthlyActivity");
    expect(result).toHaveProperty("summary.frequentWords");
    expect(result).toHaveProperty("summary.wrapped");
    expect(result.compare).toEqual({ status: "not_compared", reason: "比較対象期間は未選択のため、期間比較はまだ集計していません。", baseline: null, comparison: null });
    expect(result.todo.length).toBeGreaterThan(0);
  });

  it("excludes full message bodies, message arrays, filenames, paths, and conversation ids", () => {
    const source = parsed([message("user", "this complete private message must not appear", Date.UTC(2024, 0, 1) / 1000, "private-conversation-id")]);
    const json = serializeAiHandoffJson(source, { generatedAt: GENERATED_AT });
    expect(json).not.toContain("this complete private message must not appear");
    expect(json).not.toContain("private-conversation-id");
    expect(json).not.toContain("conversations.json");
    expect(json).not.toMatch(/"messages"\s*:/);
    expect(json).not.toMatch(/"text"\s*:/);
    expect(json).not.toMatch(/"fileName"\s*:/);
    expect(json).not.toMatch(/"path"\s*:/);
  });

  it("is deterministic when generatedAt is supplied", () => {
    const source = parsed([message("user", "React 開発", Date.UTC(2024, 0, 1) / 1000)]);
    expect(serializeAiHandoffJson(source, { generatedAt: GENERATED_AT })).toBe(serializeAiHandoffJson(source, { generatedAt: GENERATED_AT }));
  });

  it("handles empty, missing-date, user-only, and assistant-only data without non-finite output", () => {
    const empty = parsed([], []);
    expect(createAiHandoffJson(empty, { generatedAt: GENERATED_AT }).meta.period).toEqual({ startAt: null, endAt: null, monthCount: 0 });
    const mixed = parsed([message("user", "質問", null), message("assistant", "回答", null)]);
    expect(JSON.stringify(createAiHandoffJson(mixed, { generatedAt: GENERATED_AT }))).not.toMatch(/NaN|Infinity|undefined/);
    expect(createAiHandoffJson(parsed([message("user", "質問", null)]), { generatedAt: GENERATED_AT }).meta.messageCount).toBe(1);
    expect(createAiHandoffJson(parsed([message("assistant", "回答", null)]), { generatedAt: GENERATED_AT }).meta.messageCount).toBe(1);
  });

  it("accepts the fictional sample and keeps summary totals aligned", () => {
    const sample = JSON.parse(readFileSync(new URL("../../../public/sample-conversations.json", import.meta.url), "utf8")) as unknown;
    const source = parseChatGptExport(sample);
    const result = createAiHandoffJson(source, { generatedAt: GENERATED_AT });
    expect(result.meta.conversationCount).toBe(source.stats.conversationCount);
    expect(result.meta.messageCount).toBe(source.stats.messageCount);
    expect(result.summary.frequentWords.words.length).toBeLessThanOrEqual(5);
  });
});
