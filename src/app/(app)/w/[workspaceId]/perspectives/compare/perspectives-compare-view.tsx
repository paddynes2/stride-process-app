"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAnnotations } from "@/lib/api/client";
import type { Perspective, PerspectiveAnnotation } from "@/types/database";
import type { ElementInfo, ComparisonRow, SummaryStats } from "./export-pdf";

const DIVERGENCE_THRESHOLD = 2;

interface PerspectivesCompareViewProps {
  workspaceId: string;
  workspaceName: string;
  perspectives: Perspective[];
  elementMap: Record<string, ElementInfo>;
}

export function PerspectivesCompareView({
  workspaceId,
  workspaceName,
  perspectives,
  elementMap,
}: PerspectivesCompareViewProps) {
  const [perspAId, setPerspAId] = React.useState<string>("");
  const [perspBId, setPerspBId] = React.useState<string>("");
  const [annotationsA, setAnnotationsA] = React.useState<PerspectiveAnnotation[]>([]);
  const [annotationsB, setAnnotationsB] = React.useState<PerspectiveAnnotation[]>([]);
  const [loadingA, setLoadingA] = React.useState(false);
  const [loadingB, setLoadingB] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (!perspAId) {
      setAnnotationsA([]);
      return;
    }
    setLoadingA(true);
    fetchAnnotations(perspAId)
      .then(setAnnotationsA)
      .catch(() => setAnnotationsA([]))
      .finally(() => setLoadingA(false));
  }, [perspAId]);

  React.useEffect(() => {
    if (!perspBId) {
      setAnnotationsB([]);
      return;
    }
    setLoadingB(true);
    fetchAnnotations(perspBId)
      .then(setAnnotationsB)
      .catch(() => setAnnotationsB([]))
      .finally(() => setLoadingB(false));
  }, [perspBId]);

  const perspA = perspectives.find((p) => p.id === perspAId) ?? null;
  const perspB = perspectives.find((p) => p.id === perspBId) ?? null;

  const comparisonRows = React.useMemo<ComparisonRow[]>(() => {
    if (!perspAId || !perspBId) return [];

    const mapA = new Map<string, PerspectiveAnnotation>();
    const mapB = new Map<string, PerspectiveAnnotation>();
    for (const a of annotationsA) mapA.set(a.annotatable_id, a);
    for (const b of annotationsB) mapB.set(b.annotatable_id, b);

    const allIds = new Set([...mapA.keys(), ...mapB.keys()]);
    return [...allIds].map((id) => {
      const annA = mapA.get(id) ?? null;
      const annB = mapB.get(id) ?? null;
      const element = elementMap[id];
      const divergence =
        annA?.rating != null && annB?.rating != null
          ? Math.abs(annA.rating - annB.rating)
          : null;
      const isDivergent = divergence !== null && divergence >= DIVERGENCE_THRESHOLD;
      return { id, element, annA, annB, divergence, isDivergent };
    });
  }, [perspAId, perspBId, annotationsA, annotationsB, elementMap]);

  const summaryStats = React.useMemo<SummaryStats | null>(() => {
    if (!perspAId || !perspBId) return null;

    const ratingsA = annotationsA.filter((a) => a.rating != null).map((a) => a.rating!);
    const ratingsB = annotationsB.filter((b) => b.rating != null).map((b) => b.rating!);
    const avgRatingA =
      ratingsA.length > 0 ? ratingsA.reduce((s, r) => s + r, 0) / ratingsA.length : null;
    const avgRatingB =
      ratingsB.length > 0 ? ratingsB.reduce((s, r) => s + r, 0) / ratingsB.length : null;

    const top3 = [...comparisonRows]
      .filter((r) => r.divergence !== null)
      .sort((a, b) => (b.divergence ?? 0) - (a.divergence ?? 0))
      .slice(0, 3);

    return {
      countA: annotationsA.length,
      countB: annotationsB.length,
      avgRatingA,
      avgRatingB,
      divergenceCount: comparisonRows.filter((r) => r.isDivergent).length,
      top3,
    };
  }, [perspAId, perspBId, annotationsA, annotationsB, comparisonRows]);

  const handleExportPdf = React.useCallback(async () => {
    if (!perspA || !perspB) return;
    setExporting(true);
    try {
      const { exportPerspectivesComparisonPdf } = await import("./export-pdf");
      exportPerspectivesComparisonPdf({
        workspaceName,
        perspAName: perspA.name,
        perspBName: perspB.name,
        summaryStats,
        comparisonRows,
      });
    } catch (err) {
      console.error("Perspective comparison PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [perspA, perspB, workspaceName, summaryStats, comparisonRows]);

  // Empty state: need at least 2 perspectives
  if (perspectives.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-surface)]">
          <Eye className="w-6 h-6 text-[var(--text-tertiary)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            Perspective comparison requires at least 2 perspectives
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md">
            Create two or more perspectives with annotations to compare stakeholder viewpoints
            across your workspace elements.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = loadingA || loadingB;
  const hasSelection = Boolean(perspAId && perspBId);
  const canExport = hasSelection && !isLoading && comparisonRows.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          Perspective Comparison
        </h1>
        <button
          onClick={handleExportPdf}
          disabled={exporting || !canExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius)] bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export comparison as PDF"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          Export PDF
        </button>
      </div>

      {/* Perspective selectors */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Perspective A</span>
          <select
            value={perspAId}
            onChange={(e) => setPerspAId(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-[var(--radius)] bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
          >
            <option value="">Select perspective…</option>
            {perspectives
              .filter((p) => p.id !== perspBId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        <span className="text-sm text-[var(--text-tertiary)]">vs</span>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Perspective B</span>
          <select
            value={perspBId}
            onChange={(e) => setPerspBId(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-[var(--radius)] bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
          >
            <option value="">Select perspective…</option>
            {perspectives
              .filter((p) => p.id !== perspAId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {!hasSelection ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Eye className="w-8 h-8 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              Select two perspectives above to compare their annotations
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-[var(--text-tertiary)] animate-spin" />
          </div>
        ) : comparisonRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Eye className="w-8 h-8 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              No annotations found in the selected perspectives.
            </p>
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-6">
            {summaryStats && perspA && perspB && (
              <SummaryStatsPanel
                perspA={perspA}
                perspB={perspB}
                stats={summaryStats}
                workspaceId={workspaceId}
              />
            )}
            {perspA && perspB && (
              <ComparisonTable
                rows={comparisonRows}
                perspA={perspA}
                perspB={perspB}
                workspaceId={workspaceId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Summary Stats Panel                                                         */
/* -------------------------------------------------------------------------- */

function SummaryStatsPanel({
  perspA,
  perspB,
  stats,
  workspaceId,
}: {
  perspA: Perspective;
  perspB: Perspective;
  stats: SummaryStats;
  workspaceId: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
      <div className="grid grid-cols-2 gap-4">
        {/* Perspective A stats */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--accent-blue)]">{perspA.name}</span>
          <div className="flex gap-6">
            <StatItem label="Annotations" value={stats.countA} />
            {stats.avgRatingA != null && (
              <StatItem label="Avg Rating" value={stats.avgRatingA.toFixed(1)} />
            )}
          </div>
        </div>

        {/* Perspective B stats */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--brand)]">{perspB.name}</span>
          <div className="flex gap-6">
            <StatItem label="Annotations" value={stats.countB} />
            {stats.avgRatingB != null && (
              <StatItem label="Avg Rating" value={stats.avgRatingB.toFixed(1)} />
            )}
          </div>
        </div>
      </div>

      {/* Divergence summary */}
      <div className="flex items-start gap-8 pt-3 border-t border-[var(--border-subtle)]">
        <StatItem
          label="Divergences"
          value={stats.divergenceCount}
          color={stats.divergenceCount > 0 ? "#F59E0B" : undefined}
        />
        {stats.top3.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
              Top Divergent Elements
            </span>
            <div className="flex flex-wrap gap-2">
              {stats.top3.map((row) => {
                const name = row.element?.name ?? row.id.slice(0, 8);
                const tabId = row.element?.tab_id;
                return tabId ? (
                  <Link
                    key={row.id}
                    href={`/w/${workspaceId}/${tabId}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] text-[var(--text-primary)] hover:bg-[rgba(245,158,11,0.2)] transition-colors"
                  >
                    {name}
                    <span className="text-[#F59E0B] font-semibold">({row.divergence})</span>
                  </Link>
                ) : (
                  <span
                    key={row.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] text-[var(--text-primary)]"
                  >
                    {name}
                    <span className="text-[#F59E0B] font-semibold">({row.divergence})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat Item                                                                   */
/* -------------------------------------------------------------------------- */

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
        {label}
      </span>
      <span
        className="text-xl font-bold text-[var(--text-primary)]"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Comparison Table                                                             */
/* -------------------------------------------------------------------------- */

function ComparisonTable({
  rows,
  perspA,
  perspB,
  workspaceId,
}: {
  rows: ComparisonRow[];
  perspA: Perspective;
  perspB: Perspective;
  workspaceId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-tertiary)]">
              Element
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-tertiary)]">
              Type
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--accent-blue)]">
              {perspA.name} — Note
            </th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-[var(--accent-blue)]">
              Rating
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--brand)]">
              {perspB.name} — Note
            </th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-[var(--brand)]">
              Rating
            </th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-[var(--text-tertiary)]">
              Gap
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-[var(--border-subtle)] last:border-0",
                row.isDivergent ? "bg-[var(--bg-app)]" : "bg-[var(--bg-app)]",
              )}
              style={row.isDivergent ? { backgroundColor: "rgba(245, 158, 11, 0.08)" } : undefined}
            >
              <td className="px-4 py-2.5">
                {row.element?.tab_id ? (
                  <Link
                    href={`/w/${workspaceId}/${row.element.tab_id}`}
                    className="font-medium text-[var(--accent-blue)] hover:underline"
                  >
                    {row.element.name}
                  </Link>
                ) : (
                  <span className="font-medium text-[var(--text-primary)]">
                    {row.element?.name ?? `(${row.id.slice(0, 8)}\u2026)`}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {row.element?.type ?? "\u2014"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-[220px]">
                {row.annA?.content ? (
                  <span className="line-clamp-2">{row.annA.content}</span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">{"—"}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-center">
                {row.annA?.rating != null ? (
                  <span className="font-semibold text-[var(--accent-blue)]">
                    {row.annA.rating}
                  </span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">{"—"}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-[220px]">
                {row.annB?.content ? (
                  <span className="line-clamp-2">{row.annB.content}</span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">{"—"}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-center">
                {row.annB?.rating != null ? (
                  <span className="font-semibold text-[var(--brand)]">{row.annB.rating}</span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">{"—"}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-center">
                {row.divergence !== null ? (
                  <span
                    className={cn("font-semibold", row.isDivergent && "text-[#F59E0B]")}
                    style={!row.isDivergent ? { color: "var(--text-tertiary)" } : undefined}
                  >
                    {row.divergence}
                  </span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">{"—"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
