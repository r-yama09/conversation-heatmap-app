import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseChatGptExport } from "../chatgpt-export/parser";
import type { NormalizedMessage } from "@/lib/chatgpt-export/types";
import { createFrequentWords } from "./frequentWords";

function message(role: NormalizedMessage["role"], text: string, messageId: string): NormalizedMessage {
  return { conversationId: "fictional", messageId, title: "Fictional", role, text, createdAt: 1 };
}

describe("createFrequentWords", () => {
  it("counts only user messages and tracks occurrences separately from messages", () => {
    const result = createFrequentWords([
      message("user", "React React 開発", "user-1"),
      message("assistant", "React", "assistant-1"),
      message("system", "React", "system-1"),
      message("tool", "React", "tool-1"),
    ]);
    expect(result.words.find((word) => word.token === "react")).toEqual({ token: "react", count: 2, messageCount: 1 });
    expect(result.analyzedMessageCount).toBe(1);
    expect(result.matchedMessageCount).toBe(1);
    expect(result.excludedMessageCount).toBe(0);
  });

  it("normalizes NFKC text and English case while excluding URLs, numbers, and stop words", () => {
    const result = createFrequentWords([message("user", "ＡＰＩ api 123 https://example.invalid です 開発", "user-1")]);
    expect(result.words.map((word) => word.token)).toContain("api");
    expect(result.words.map((word) => word.token)).toContain("開発");
    expect(result.words.map((word) => word.token)).not.toContain("123");
    expect(result.words.map((word) => word.token)).not.toContain("です");
    expect(result.words.map((word) => word.token)).not.toContain("example");
  });

  it("uses deterministic tie ordering and respects the limit", () => {
    const input = [message("user", "beta alpha gamma", "user-1"), message("user", "beta alpha", "user-2")];
    const result = createFrequentWords(input, 2);
    expect(result.words).toEqual([
      { token: "alpha", count: 2, messageCount: 2 },
      { token: "beta", count: 2, messageCount: 2 },
    ]);
  });

  it("reports empty and tokenless user messages without throwing", () => {
    const result = createFrequentWords([message("user", "", "empty"), message("user", "123 !!!", "excluded")]);
    expect(result).toEqual({ words: [], analyzedMessageCount: 2, matchedMessageCount: 0, excludedMessageCount: 2 });
    expect(createFrequentWords([])).toEqual({ words: [], analyzedMessageCount: 0, matchedMessageCount: 0, excludedMessageCount: 0 });
  });

  it("handles fictional sample data without changing parser behavior", () => {
    const sample = JSON.parse(readFileSync(new URL("../../../public/sample-conversations.json", import.meta.url), "utf8")) as unknown;
    const parsed = parseChatGptExport(sample);
    const result = createFrequentWords(parsed.messages);
    expect(result.analyzedMessageCount).toBe(parsed.stats.userMessageCount);
    expect(result.words.length).toBeLessThanOrEqual(20);
  });
});
