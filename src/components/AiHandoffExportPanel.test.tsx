import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ParsedExport } from "@/lib/chatgpt-export/types";
import AiHandoffExportPanel, { getAiHandoffPanelState } from "./AiHandoffExportPanel";

const result: ParsedExport = {
  conversations: [],
  messages: [],
  stats: { conversationCount: 0, messageCount: 0, userMessageCount: 0, assistantMessageCount: 0 },
};

describe("AiHandoffExportPanel states", () => {
  it("keeps the empty state in the shared content layout and disables downloading", () => {
    const markup = renderToStaticMarkup(<AiHandoffExportPanel result={null} isPartial={false} />);

    expect(markup).toContain('data-state="empty"');
    expect(markup).toContain('class="ai-handoff-content"');
    expect(markup).toContain('class="ai-handoff-availability"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('ai-handoff-availability ai-handoff-privacy-note');
  });

  it("keeps ready and partial states in the same content layout with an enabled download", () => {
    for (const isPartial of [false, true]) {
      const markup = renderToStaticMarkup(<AiHandoffExportPanel result={result} isPartial={isPartial} />);
      expect(markup).toContain('class="ai-handoff-content"');
      expect(markup).not.toContain('disabled=""');
      expect(markup).toContain('aria-disabled="false"');
    }
  });

  it("classifies empty, ready, partial, and success states deterministically", () => {
    expect(getAiHandoffPanelState(false, false, false)).toBe("empty");
    expect(getAiHandoffPanelState(true, false, false)).toBe("ready");
    expect(getAiHandoffPanelState(true, true, false)).toBe("partial");
    expect(getAiHandoffPanelState(true, false, true)).toBe("success");
  });
});
