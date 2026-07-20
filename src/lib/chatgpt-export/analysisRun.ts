/** Tracks one in-flight browser analysis without relying on delayed React state. */
export class AnalysisRunGate {
  private nextRunId = 0;
  private activeRunId: number | null = null;

  begin(): number | null {
    if (this.activeRunId !== null) return null;
    const runId = this.nextRunId + 1;
    this.nextRunId = runId;
    this.activeRunId = runId;
    return runId;
  }

  isCurrent(runId: number): boolean { return this.activeRunId === runId; }

  finish(runId: number): void {
    if (this.activeRunId === runId) this.activeRunId = null;
  }

  invalidate(): void {
    this.nextRunId += 1;
    this.activeRunId = null;
  }
}

export function canSaveAnalysisResult({ hasResult, isPartial, isAnalysisActive, isBusy }: {
  hasResult: boolean;
  isPartial: boolean;
  isAnalysisActive: boolean;
  isBusy: boolean;
}): boolean {
  return hasResult && !isPartial && !isAnalysisActive && !isBusy;
}
