import { describe, expect, it } from "vitest";
import { parseChatGptExport } from "./parser";
import { ChatGptExportParseError } from "./types";

type Role = "user" | "assistant" | "system" | "tool";

function message(role: Role | undefined, parts: unknown[] = ["text"], createTime?: number) {
  return {
    author: role ? { role } : undefined,
    content: { parts },
    ...(createTime === undefined ? {} : { create_time: createTime }),
  };
}

describe("parseChatGptExport", () => {
  it("restores the current_node path in chronological order and excludes inactive branches", () => {
    const result = parseChatGptExport([{ id: "active-path", title: "Fictional active path", current_node: "assistant-2", mapping: {
      root: { parent: null, message: null },
      "user-1": { parent: "root", message: message("user", ["first"], 10) },
      "assistant-1": { parent: "user-1", message: message("assistant", ["second"], 20) },
      "inactive-assistant": { parent: "user-1", message: message("assistant", ["inactive"], 21) },
      "user-2": { parent: "assistant-1", message: message("user", ["third"], 30) },
      "assistant-2": { parent: "user-2", message: message("assistant", ["fourth"], 40) },
    } }]);

    expect(result.messages.map((item) => item.text)).toEqual(["first", "second", "third", "fourth"]);
    expect(result.messages.map((item) => item.createdAt)).toEqual([10, 20, 30, 40]);
    expect(result.messages.some((item) => item.text === "inactive")).toBe(false);
    expect(result.stats).toEqual({ conversationCount: 1, messageCount: 4, userMessageCount: 2, assistantMessageCount: 2 });
  });

  it("keeps system and tool messages normalized while excluding them and inactive branches from statistics", () => {
    const result = parseChatGptExport([{ id: "roles", current_node: "assistant", mapping: {
      root: { parent: null, message: null },
      system: { parent: "root", message: message("system", ["fictional instruction"], 1) },
      user: { parent: "system", message: message("user", ["question"], 2) },
      tool: { parent: "user", message: message("tool", ["fictional tool output"], 3) },
      assistant: { parent: "tool", message: message("assistant", ["answer"], 4) },
      inactive: { parent: "user", message: message("assistant", ["unused answer"], 5) },
    } }]);

    expect(result.messages.map((item) => item.role)).toEqual(["system", "user", "tool", "assistant"]);
    expect(result.messages.map((item) => item.text)).not.toContain("unused answer");
    expect(result.conversations[0]).toMatchObject({ messageCount: 2, userMessageCount: 1, assistantMessageCount: 1 });
    expect(result.stats).toEqual({ conversationCount: 1, messageCount: 2, userMessageCount: 1, assistantMessageCount: 1 });
  });

  it("excludes empty, missing, and non-displayable messages", () => {
    const result = parseChatGptExport([{ id: "empty-messages", mapping: {
      valid: { message: message("user", ["visible"], 1) },
      emptyString: { message: message("assistant", [""], 2) },
      emptyParts: { message: message("assistant", [], 3) },
      missingContent: { message: { author: { role: "assistant" }, create_time: 4 } },
      nonTextParts: { message: message("assistant", [null, 42], 5) },
      nullMessage: { message: null },
    } }]);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ role: "user", text: "visible" });
    expect(result.stats).toEqual({ conversationCount: 1, messageCount: 1, userMessageCount: 1, assistantMessageCount: 0 });
  });

  it("stops safely when parent references form a cycle", () => {
    const result = parseChatGptExport([{ id: "cycle", current_node: "assistant", mapping: {
      assistant: { parent: "user", message: message("assistant", ["answer"], 2) },
      user: { parent: "assistant", message: message("user", ["question"], 1) },
    } }]);

    expect(result.messages.map((item) => item.role)).toEqual(["user", "assistant"]);
    expect(result.stats.messageCount).toBe(2);
  });

  it("falls back to all nodes when current_node is absent or points outside mapping", () => {
    const parseFallback = (currentNode?: string) => parseChatGptExport([{ id: "fallback", ...(currentNode === undefined ? {} : { current_node: currentNode }), mapping: {
      later: { message: message("assistant", ["later"], 20) },
      earlier: { message: message("user", ["earlier"], 10) },
    } }]);

    expect(parseFallback().messages.map((item) => item.text)).toEqual(["earlier", "later"]);
    expect(parseFallback("not-in-mapping").messages.map((item) => item.text)).toEqual(["earlier", "later"]);
  });

  it("stops safely and retains the reachable node when a current_node parent is missing", () => {
    const result = parseChatGptExport([{ id: "broken-parent", current_node: "orphan", mapping: {
      orphan: { parent: "missing-parent", message: message("assistant", ["reachable"], 1) },
    } }]);

    expect(result.messages.map((item) => item.text)).toEqual(["reachable"]);
    expect(result.stats).toEqual({ conversationCount: 1, messageCount: 1, userMessageCount: 0, assistantMessageCount: 1 });
  });

  it("handles minimal and malformed conversation data without crashing", () => {
    const result = parseChatGptExport([
      { id: "empty-mapping", mapping: {} },
      { id: "missing-author", mapping: { unknown: { message: message(undefined, ["kept"]) } } },
    ]);

    expect(result.conversations).toHaveLength(2);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ role: "unknown", createdAt: null });
    expect(result.stats).toEqual({ conversationCount: 2, messageCount: 0, userMessageCount: 0, assistantMessageCount: 0 });
    expect(() => parseChatGptExport([])).toThrow(ChatGptExportParseError);
  });
});
