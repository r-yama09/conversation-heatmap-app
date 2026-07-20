import { describe, expect, it } from "vitest";
import type { NormalizedConversation, NormalizedMessage } from "@/lib/chatgpt-export/types";
import { filterConversations } from "./conversationFilters";

function conversation(id: string, title: string, createdAt: number | null): NormalizedConversation {
  return { conversationId: id, title, createdAt, updatedAt: createdAt, messageCount: 2, userMessageCount: 1, assistantMessageCount: 1 };
}

function message(conversationId: string, role: NormalizedMessage["role"], text: string): NormalizedMessage {
  return { conversationId, messageId: `${conversationId}-${role}`, title: "", role, text, createdAt: null };
}

const conversations = [
  conversation("first", "朝の計画", Date.parse("2025-01-05T01:00:00Z") / 1000),
  conversation("second", "夜の振り返り", Date.parse("2025-02-10T01:00:00Z") / 1000),
  conversation("third", "週末メモ", null),
];
const messages = [
  message("first", "user", "TypeScriptの計画を立てる"),
  message("first", "assistant", "小さく始めましょう"),
  message("second", "user", "読書の記録"),
  message("second", "assistant", "次の本を提案します"),
  message("third", "system", "検索対象外"),
];

describe("filterConversations", () => {
  it("matches titles, user text, and assistant text case-insensitively", () => {
    expect(filterConversations(conversations, messages, { query: "朝の", startDate: "", endDate: "" }).conversations.map((item) => item.conversationId)).toEqual(["first"]);
    expect(filterConversations(conversations, messages, { query: "TYPESCRIPT", startDate: "", endDate: "" }).conversations.map((item) => item.conversationId)).toEqual(["first"]);
    expect(filterConversations(conversations, messages, { query: "小さく", startDate: "", endDate: "" }).conversations.map((item) => item.conversationId)).toEqual(["first"]);
  });

  it("trims the query and returns all conversations for an empty query", () => {
    expect(filterConversations(conversations, messages, { query: "  読書  ", startDate: "", endDate: "" }).conversations.map((item) => item.conversationId)).toEqual(["second"]);
    expect(filterConversations(conversations, messages, { query: "   ", startDate: "", endDate: "" }).conversations).toEqual(conversations);
  });

  it("supports start-only, end-only, and inclusive date ranges in Japan time", () => {
    expect(filterConversations(conversations, messages, { query: "", startDate: "2025-01-05", endDate: "" }).conversations.map((item) => item.conversationId)).toEqual(["first", "second"]);
    expect(filterConversations(conversations, messages, { query: "", startDate: "", endDate: "2025-01-05" }).conversations.map((item) => item.conversationId)).toEqual(["first"]);
    expect(filterConversations(conversations, messages, { query: "", startDate: "2025-01-05", endDate: "2025-02-10" }).conversations.map((item) => item.conversationId)).toEqual(["first", "second"]);
  });

  it("reports invalid ranges and keeps the original order", () => {
    expect(filterConversations(conversations, messages, { query: "", startDate: "2025-03-01", endDate: "2025-02-01" }).error).toContain("開始日");
    expect(filterConversations(conversations, messages, { query: "", startDate: "2025-02-30", endDate: "" }).error).toContain("正しい日付");
    expect(filterConversations([conversations[1], conversations[0]], messages, { query: "", startDate: "", endDate: "" }).conversations.map((item) => item.conversationId)).toEqual(["second", "first"]);
  });

  it("excludes conversations without a date when a date filter is active", () => {
    expect(filterConversations(conversations, messages, { query: "", startDate: "2025-01-01", endDate: "2025-12-31" }).conversations.map((item) => item.conversationId)).toEqual(["first", "second"]);
  });
});
