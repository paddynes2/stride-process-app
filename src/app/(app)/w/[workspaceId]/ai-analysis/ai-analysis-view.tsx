"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, AlertCircle, KeyRound, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeProcess } from "@/lib/api/client";
import type { AIAnalysisResult, AIInsight } from "@/types/database";

const SEVERITY_CONFIG: Record<AIInsight["severity"], { label: string; className: string }> = {
  high: { label: "High", className: "bg-[#EF4444]/15 text-[#EF4444]" },
  medium: { label: "Medium", className: "bg-[#EAB308]/15 text-[#EAB308]" },
  low: { label: "Low", className: "bg-[#22C55E]/15 text-[#22C55E]" },
};

const RATE_LIMIT_RE = /Please wait (\d+) seconds/;

type AnalysisState =
  | { type: "idle"; result: AIAnalysisResult | null }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "not_configured" }
  | { type: "rate_limited"; retryAfterSeconds: number };

interface StepInfo {
  name: string;
  tabId: string;
}

interface AIAnalysisViewProps {
  workspaceId: string;
  stepMap: Record<string, StepInfo>;
  initialAnalysis: AIAnalysisResult | null;
  lastAnalysisAt: string | null;
  hasSteps: boolean;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function classifyError(err: unknown): AnalysisState {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("OPENROUTER_API_KEY") || msg.includes("OpenRouter API key")) {
    return { type: "not_configured" };
  }
  const rateMatch = RATE_LIMIT_RE.exec(msg);
  if (rateMatch) {
    return { type: "rate_limited", retryAfterSeconds: parseInt(rateMatch[1], 10) };
  }
  return { type: "error", message: msg };
}

function SeverityBadge({ severity }: { severity: AIInsight["severity"] }) {
  const conf = SEVERITY_CONFIG[severity];
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-sm font-medium shrink-0", conf.className)}>
      {conf.label}
    </span>
  );
}

function InsightCard({
  insight,
  workspaceId,
  stepMap,
}: {
  insight: AIInsight;
  workspaceId: string;
  stepMap: Record<string, StepInfo>;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)]">
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-[13px] font-semibold text-[var(--text-primary)] flex-1 min-w-0 leading-snug">
          {insight.title}
        </span>
        <SeverityBadge severity={insight.severity} />
      </div>
      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-1.5">
        {insight.description}
      </p>
      {insight.affected_step_ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1">
          <span className="text-[10px] text-[var(--text-quaternary)]">Steps:</span>
          {insight.affected_step_ids.map((stepId) => {
            const info = stepMap[stepId];
            if (!info) return null;
            return (
              <Link
                key={stepId}
                href={`/w/${workspaceId}/${info.tabId}`}
                className="text-[11px] text-[var(--accent-blue)] hover:underline"
              >
                {info.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  title,
  insights,
  workspaceId,
  stepMap,
}: {
  title: string;
  insights: AIInsight[];
  workspaceId: string;
  stepMap: Record<string, StepInfo>;
}) {
  if (insights.length === 0) return null;
  return (
    <div>
      <h2 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">
        {title}
        <span className="ml-1.5 text-[11px] font-normal text-[var(--text-tertiary)]">
          {insights.length}
        </span>
      </h2>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <InsightCard
            key={i}
            insight={insight}
            workspaceId={workspaceId}
            stepMap={stepMap}
          />
        ))}
      </div>
    </div>
  );
}

export function AIAnalysisView({
  workspaceId,
  stepMap,
  initialAnalysis,
  lastAnalysisAt,
  hasSteps,
}: AIAnalysisViewProps) {
  const [state, setState] = React.useState<AnalysisState>({
    type: "idle",
    result: initialAnalysis,
  });
  const [lastAt, setLastAt] = React.useState<string | null>(lastAnalysisAt);
  const [countdown, setCountdown] = React.useState<number>(0);

  React.useEffect(() => {
    if (state.type !== "rate_limited") return;
    setCountdown(state.retryAfterSeconds);
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setState({ type: "idle", result: initialAnalysis });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state, initialAnalysis]);

  const handleRegenerate = async () => {
    setState({ type: "loading" });
    try {
      const result = await analyzeProcess(workspaceId);
      setLastAt(new Date().toISOString());
      setState({ type: "idle", result });
    } catch (err) {
      setState(classifyError(err));
    }
  };

  const currentResult = state.type === "idle" ? state.result : null;
  const isLoading = state.type === "loading";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--text-tertiary)]" />
            <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">AI Analysis</h1>
            {lastAt && state.type === "idle" && (
              <span className="text-[11px] text-[var(--text-tertiary)]">
                Last run {new Date(lastAt).toISOString().slice(0, 10)}
              </span>
            )}
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isLoading || !hasSteps || state.type === "rate_limited"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors",
              isLoading || !hasSteps || state.type === "rate_limited"
                ? "bg-[var(--bg-surface-active)] text-[var(--text-tertiary)] cursor-not-allowed"
                : "bg-[var(--accent-blue)] text-white hover:opacity-90"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            {isLoading ? "Analyzing…" : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {!hasSteps ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-8 w-8 text-[var(--text-quaternary)] mb-3" />
            <p className="text-[13px] text-[var(--text-secondary)]">
              No steps in this workspace yet
            </p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              Add steps to the canvas before running AI analysis.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-8 w-8 text-[var(--text-tertiary)] mb-3 animate-spin" />
            <p className="text-[13px] text-[var(--text-secondary)]">Analyzing your process…</p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              This may take 5–15 seconds
            </p>
          </div>
        ) : state.type === "not_configured" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <KeyRound className="h-8 w-8 text-[var(--text-quaternary)] mb-3" />
            <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">
              API key not configured
            </p>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              AI features require configuration. Contact your workspace administrator
              to enable AI analysis, or if you manage your own deployment, add{" "}
              <code className="text-[var(--text-primary)] bg-[var(--bg-surface-active)] px-1 rounded">
                OPENROUTER_API_KEY
              </code>{" "}
              to your environment variables.
            </p>
          </div>
        ) : state.type === "rate_limited" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-8 w-8 text-[var(--text-quaternary)] mb-3" />
            <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">
              Analysis rate limited
            </p>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Try again in {formatCountdown(countdown)}
            </p>
          </div>
        ) : state.type === "error" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-[#EF4444]/60 mb-3" />
            <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">
              Analysis failed
            </p>
            <p className="text-[12px] text-[var(--text-secondary)] mb-3 max-w-sm">
              {state.message}
            </p>
            <button
              onClick={handleRegenerate}
              className="text-[12px] text-[var(--accent-blue)] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : currentResult === null ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-8 w-8 text-[var(--text-quaternary)] mb-3" />
            <p className="text-[13px] text-[var(--text-secondary)]">No analysis yet</p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              Click{" "}
              <strong className="text-[var(--text-primary)]">Regenerate</strong>{" "}
              to run AI analysis on your process.
            </p>
          </div>
        ) : currentResult.bottlenecks.length === 0 &&
          currentResult.redundancies.length === 0 &&
          currentResult.automation_candidates.length === 0 &&
          currentResult.maturity_recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-8 w-8 text-[#22C55E]/60 mb-3" />
            <p className="text-[13px] text-[var(--text-secondary)]">No issues found</p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              Your process looks healthy — no bottlenecks, redundancies, or improvement
              opportunities were identified.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            <CategorySection
              title="Bottlenecks"
              insights={currentResult.bottlenecks}
              workspaceId={workspaceId}
              stepMap={stepMap}
            />
            <CategorySection
              title="Redundancies"
              insights={currentResult.redundancies}
              workspaceId={workspaceId}
              stepMap={stepMap}
            />
            <CategorySection
              title="Automation Candidates"
              insights={currentResult.automation_candidates}
              workspaceId={workspaceId}
              stepMap={stepMap}
            />
            <CategorySection
              title="Maturity Recommendations"
              insights={currentResult.maturity_recommendations}
              workspaceId={workspaceId}
              stepMap={stepMap}
            />
          </div>
        )}
      </div>
    </div>
  );
}
