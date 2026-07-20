import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { parseChatGptExportAsync } from "./parser";
import { createSyntheticConversations } from "./syntheticConversations";

describe.runIf(process.env.RUN_LARGE_LOG_TESTS === "1")("10,000 conversation load test", () => {
  it("reports local-only counts and elapsed time", async () => {
    const startedAt = performance.now();
    const result = await parseChatGptExportAsync(createSyntheticConversations({ conversationCount: 10_000 }), { batchSize: 25 });
    const elapsedMs = Math.round(performance.now() - startedAt);
    console.info(`[large-log] conversations=${result.result.stats.conversationCount} messages=${result.result.stats.messageCount} elapsedMs=${elapsedMs}`);
    expect(result).toMatchObject({ aborted: false, result: { stats: { conversationCount: 10_000, messageCount: 20_000 } } });
  }, 30_000);
});
