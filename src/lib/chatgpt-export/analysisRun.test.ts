import { describe, expect, it } from "vitest";
import { AnalysisRunGate, canSaveAnalysisResult } from "./analysisRun";

describe("AnalysisRunGate", () => {
  it("prevents duplicate starts until the active run finishes", () => {
    const gate = new AnalysisRunGate();
    const firstRun = gate.begin();
    expect(firstRun).toBe(1);
    expect(gate.begin()).toBeNull();
    gate.finish(firstRun!);
    expect(gate.begin()).toBe(2);
  });

  it("prevents invalidated work from updating a newer run", () => {
    const gate = new AnalysisRunGate();
    const firstRun = gate.begin();
    gate.invalidate();
    const secondRun = gate.begin();
    expect(gate.isCurrent(firstRun!)).toBe(false);
    expect(gate.isCurrent(secondRun!)).toBe(true);
    gate.finish(firstRun!);
    expect(gate.isCurrent(secondRun!)).toBe(true);
  });

  it("allows saving only for a completed, idle result", () => {
    expect(canSaveAnalysisResult({ hasResult: false, isPartial: false, isAnalysisActive: false, isBusy: false })).toBe(false);
    expect(canSaveAnalysisResult({ hasResult: true, isPartial: true, isAnalysisActive: false, isBusy: false })).toBe(false);
    expect(canSaveAnalysisResult({ hasResult: true, isPartial: false, isAnalysisActive: true, isBusy: false })).toBe(false);
    expect(canSaveAnalysisResult({ hasResult: true, isPartial: false, isAnalysisActive: false, isBusy: true })).toBe(false);
    expect(canSaveAnalysisResult({ hasResult: true, isPartial: false, isAnalysisActive: false, isBusy: false })).toBe(true);
  });
});
