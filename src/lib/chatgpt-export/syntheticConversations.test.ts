import { describe, expect, it } from "vitest";
import { parseChatGptExport, parseChatGptExportAsync } from "./parser";
import { createSyntheticConversations } from "./syntheticConversations";

describe("synthetic large conversation fixtures", () => {
  it.each([100, 1_000])("keeps deterministic async results for %i conversations", async (conversationCount) => {
    const first = createSyntheticConversations({ conversationCount });
    const second = createSyntheticConversations({ conversationCount });
    const progress: number[] = [];
    const asyncResult = await parseChatGptExportAsync(first, { batchSize: 25, onProgress: (item) => progress.push(item.percentage) });
    expect(second).toEqual(first);
    expect(asyncResult).toMatchObject({ aborted: false, result: parseChatGptExport(second) });
    expect(asyncResult.result.stats).toEqual({ conversationCount, messageCount: conversationCount * 2, userMessageCount: conversationCount, assistantMessageCount: conversationCount });
    expect(progress).toEqual([...progress].sort((left, right) => left - right));
    expect(progress.at(-1)).toBe(100);
    expect(progress.every((item) => item >= 0 && item <= 100)).toBe(true);
  });

  it("stops a fictional large input at a chunk boundary without later progress", async () => {
    const controller = new AbortController();
    const processed: number[] = [];
    const asyncResult = await parseChatGptExportAsync(createSyntheticConversations({ conversationCount: 100 }), { batchSize: 10, signal: controller.signal, onProgress: (item) => { processed.push(item.processedConversations); if (item.processedConversations === 30) controller.abort(); } });
    expect(asyncResult.aborted).toBe(true);
    expect(asyncResult.result.stats).toEqual({ conversationCount: 30, messageCount: 60, userMessageCount: 30, assistantMessageCount: 30 });
    expect(processed).toEqual([0, 10, 20, 30]);
  });
});
