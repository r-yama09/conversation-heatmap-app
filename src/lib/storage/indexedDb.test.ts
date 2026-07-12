import { describe, expect, it } from "vitest";
import type { NormalizedConversation, NormalizedMessage } from "@/lib/chatgpt-export/types";
import { mergeStorageDataset, openDatabase, toParsedExport } from "./indexedDb";
import type { StorageConversationInput, StorageDataset } from "./types";

function conversation(conversationId: string, title = `Title ${conversationId}`, createdAt: number | null = 100, updatedAt: number | null = 200): NormalizedConversation {
  return { conversationId, title, createdAt, updatedAt, messageCount: 0, userMessageCount: 0, assistantMessageCount: 0 };
}

function message(conversationId: string, messageId: string, role: NormalizedMessage["role"], text: string, createdAt: number | null): NormalizedMessage {
  return { conversationId, messageId, title: "not stored on message", role, text, createdAt };
}

function input(conversations: NormalizedConversation[], messages: NormalizedMessage[]): StorageConversationInput {
  return { conversations, messages };
}

function saveOnce(dataset: StorageDataset, next: StorageConversationInput): StorageDataset {
  return mergeStorageDataset(dataset, next).dataset;
}

describe("IndexedDB storage merge model", () => {
  it("reports a clear error when IndexedDB is unavailable", async () => {
    if (typeof indexedDB !== "undefined") return;
    await expect(openDatabase()).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("handles empty data without creating records", () => {
    const result = mergeStorageDataset({ conversations: [] }, input([], []));
    expect(result).toEqual({
      dataset: { conversations: [] },
      importedConversationCount: 0,
      addedConversationCount: 0,
      updatedConversationCount: 0,
      unchangedConversationCount: 0,
    });
  });

  it("adds conversations and counts all normalized roles as stored messages", () => {
    const next = input([conversation("a")], [
      message("a", "u-1", "user", "hello", 20),
      message("a", "a-1", "assistant", "answer", 30),
      message("a", "s-1", "system", "system note", null),
      message("a", "t-1", "tool", "tool result", 40),
      message("a", "x-1", "unknown", "unknown role", 50),
    ]);
    const result = mergeStorageDataset({ conversations: [] }, next);
    const loaded = toParsedExport(result.dataset);
    expect(result.addedConversationCount).toBe(1);
    expect(result.dataset.conversations[0].messages).toHaveLength(5);
    expect(loaded.stats).toEqual({ conversationCount: 1, messageCount: 2, userMessageCount: 1, assistantMessageCount: 1 });
    expect(loaded.messages.map((item) => item.role)).toEqual(["user", "assistant", "tool", "unknown", "system"]);
  });

  it("does not duplicate an identical re-import and reports unchanged", () => {
    const next = input([conversation("a")], [message("a", "m-1", "user", "same", 10)]);
    const first = mergeStorageDataset({ conversations: [] }, next);
    const second = mergeStorageDataset(first.dataset, next);
    expect(second.dataset).toEqual(first.dataset);
    expect(second.importedConversationCount).toBe(1);
    expect(second.addedConversationCount).toBe(0);
    expect(second.updatedConversationCount).toBe(0);
    expect(second.unchangedConversationCount).toBe(1);
  });

  it("adds a new conversation without changing existing records", () => {
    const first = mergeStorageDataset({ conversations: [] }, input([conversation("a")], [message("a", "m-1", "user", "one", 10)]));
    const second = mergeStorageDataset(first.dataset, input([conversation("b")], [message("b", "m-2", "assistant", "two", 20)]));
    expect(second.dataset.conversations.map((item) => item.conversationId)).toEqual(["a", "b"]);
    expect(second.addedConversationCount).toBe(1);
    expect(second.updatedConversationCount).toBe(0);
    expect(second.unchangedConversationCount).toBe(0);
  });

  it("merges a new message into an existing conversation", () => {
    const first = mergeStorageDataset({ conversations: [] }, input([conversation("a")], [message("a", "m-1", "user", "one", 10)]));
    const second = mergeStorageDataset(first.dataset, input([conversation("a")], [
      message("a", "m-1", "user", "one", 10),
      message("a", "m-2", "assistant", "two", 20),
    ]));
    expect(second.dataset.conversations[0].messages.map((item) => item.messageId)).toEqual(["m-1", "m-2"]);
    expect(second.updatedConversationCount).toBe(1);
    expect(second.dataset.conversations[0].messageCount).toBe(2);
  });

  it("replaces changed content for the same messageId", () => {
    const first = mergeStorageDataset({ conversations: [] }, input([conversation("a")], [message("a", "m-1", "user", "old", 10)]));
    const second = mergeStorageDataset(first.dataset, input([conversation("a")], [message("a", "m-1", "user", "new", 10)]));
    expect(second.dataset.conversations[0].messages).toHaveLength(1);
    expect(second.dataset.conversations[0].messages[0].text).toBe("new");
    expect(second.updatedConversationCount).toBe(1);
  });

  it("preserves missing title and dates and keeps deterministic ordering", () => {
    const dataset = saveOnce({ conversations: [] }, input([
      conversation("b", "", null, null),
      conversation("a"),
    ], [
      message("b", "b-null", "user", "unknown date", null),
      message("a", "a-late", "assistant", "late", 30),
      message("a", "a-early", "user", "early", 10),
    ]));
    const loaded = toParsedExport(dataset);
    expect(loaded.conversations.map((item) => item.conversationId)).toEqual(["a", "b"]);
    expect(loaded.messages.map((item) => item.messageId)).toEqual(["a-early", "a-late", "b-null"]);
    expect(loaded.conversations[1]).toMatchObject({ conversationId: "b", title: "", createdAt: null, updatedAt: null });
  });

  it("does not duplicate repeated messageIds within one import", () => {
    const result = mergeStorageDataset({ conversations: [] }, input([conversation("a")], [
      message("a", "m-1", "user", "old", 10),
      message("a", "m-1", "user", "latest", 10),
    ]));
    expect(result.dataset.conversations[0].messages).toHaveLength(1);
    expect(result.dataset.conversations[0].messages[0].text).toBe("latest");
  });
});
