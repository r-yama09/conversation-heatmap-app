import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createWeekdayHourHeatmap } from "@/lib/analytics/heatmap";
import WeekdayHourHeatmap from "./WeekdayHourHeatmap";

describe("WeekdayHourHeatmap keyboard navigation", () => {
  it("keeps cell labels available without making all 168 cells tabbable", () => {
    const base = createWeekdayHourHeatmap([]);
    const heatmap = {
      ...base,
      maxCount: 3,
      cells: base.cells.map((cell, index) => index === 0 ? { ...cell, count: 3 } : cell),
    };
    const markup = renderToStaticMarkup(<WeekdayHourHeatmap heatmap={heatmap} isPartial={false} />);

    expect(markup).toContain("role=\"region\"");
    expect(markup).toContain("tabindex=\"0\"");
    expect((markup.match(/tabindex=\"0\"/g) ?? []).length).toBe(1);
    expect(markup).not.toContain("<span tabindex=\"0\"");
    expect(markup).toContain(`aria-label="月曜日 0時台 3件"`);
    expect(markup).toContain(`aria-label="日曜日 23時台 0件"`);
    expect(markup).toContain("表の行・列ナビゲーション");
    expect(markup).toContain('scope="col"');
    expect(markup).toContain('scope="row"');
  });
});
