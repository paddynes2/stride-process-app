"use client";

import * as React from "react";
import { X, Trash2, Clock, Repeat, Gauge, Target, Plus, Users, Zap, TrendingUp, Lightbulb, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((mod) => ({ default: mod.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] animate-pulse" />
    ),
  }
);
import { VideoEmbed } from "./video-embed";
import {
  updateStep,
  deleteStep as apiDeleteStep,
  fetchTeams,
  fetchStepRoles,
  createStepRole,
  deleteStepRole,
  createImprovementIdea,
  fetchStepToolsByStep,
  createStepTool,
  deleteStepTool,
  fetchTools,
} from "@/lib/api/client";
import type { TeamWithRoles, StepRoleWithDetails, StepToolWithTool } from "@/lib/api/client";
import type { Step, StepStatus, ExecutorType, ValueType, ImprovementPriority, Tool } from "@/types/database";
import { useWorkspace } from "@/lib/context/workspace-context";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";
import { MATURITY_LEVELS } from "@/lib/maturity";

const STATUSES: { value: StepStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "testing", label: "Testing" },
  { value: "live", label: "Live" },
  { value: "archived", label: "Archived" },
];

const MATURITY_OPTIONS = MATURITY_LEVELS.map((m) => ({
  value: m.level,
  label: `${m.level} — ${m.label}`,
  color: m.color,
}));

const SCORE_OPTIONS = [
  { value: 1, label: "Very Low" },
  { value: 2, label: "Low" },
  { value: 3, label: "Medium" },
  { value: 4, label: "High" },
  { value: 5, label: "Very High" },
];

const EXECUTORS: { value: ExecutorType; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "automation", label: "Automation" },
  { value: "ai_agent", label: "AI Agent" },
  { value: "empty", label: "Unassigned" },
];

interface StepDetailPanelProps {
  step: Step;
  workspaceId: string;
  onUpdate: (step: Step) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function StepDetailPanel({ step, workspaceId, onUpdate, onDelete, onClose }: StepDetailPanelProps) {
  const [name, setName] = React.useState(step.name);
  const nameTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const [stepRoles, setStepRoles] = React.useState<StepRoleWithDetails[]>([]);
  const [teams, setTeams] = React.useState<TeamWithRoles[]>([]);
  const [stepTools, setStepTools] = React.useState<StepToolWithTool[]>([]);
  const [allTools, setAllTools] = React.useState<Tool[]>([]);
  const [showImprovDialog, setShowImprovDialog] = React.useState(false);
  const [improvTitle, setImprovTitle] = React.useState("");
  const [improvDesc, setImprovDesc] = React.useState("");
  const [improvPriority, setImprovPriority] = React.useState<ImprovementPriority>("medium");
  const [improvSaving, setImprovSaving] = React.useState(false);
  const [portalSteps, setPortalSteps] = React.useState<Step[]>([]);
  const { tabs } = useWorkspace();

  React.useEffect(() => {
    setName(step.name);
  }, [step.id, step.name]);

  // Fetch steps for the linked tab (portal link target dropdown)
  React.useEffect(() => {
    if (!step.link_to_tab_id) {
      setPortalSteps([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/v1/steps?workspace_id=${workspaceId}&tab_id=${step.link_to_tab_id}`)
      .then((res) => res.json())
      .then((json) => { if (!cancelled && json.data) setPortalSteps(json.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [step.link_to_tab_id, workspaceId]);

  // Fetch assigned roles when step changes
  React.useEffect(() => {
    let cancelled = false;
    fetchStepRoles(step.id)
      .then((roles) => { if (!cancelled) setStepRoles(roles); })
      .catch(() => { /* silently fail — roles section just stays empty */ });
    return () => { cancelled = true; };
  }, [step.id]);

  // Fetch all teams+roles for the dropdown
  React.useEffect(() => {
    let cancelled = false;
    fetchTeams(workspaceId)
      .then((t) => { if (!cancelled) setTeams(t); })
      .catch(() => { /* silently fail — dropdown stays empty */ });
    return () => { cancelled = true; };
  }, [workspaceId]);

  // Fetch assigned tools when step changes
  React.useEffect(() => {
    let cancelled = false;
    fetchStepToolsByStep(step.id)
      .then((tools) => { if (!cancelled) setStepTools(tools); })
      .catch(() => { /* silently fail — tools section just stays empty */ });
    return () => { cancelled = true; };
  }, [step.id]);

  // Fetch all workspace tools for the dropdown
  React.useEffect(() => {
    let cancelled = false;
    fetchTools(workspaceId)
      .then((t) => { if (!cancelled) setAllTools(t); })
      .catch(() => { /* silently fail — dropdown stays empty */ });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const assignedRoleIds = new Set(stepRoles.map((sr) => sr.role_id));
  const assignedToolIds = new Set(stepTools.map((st) => st.tool.id));

  const handleAssignRole = async (roleId: string) => {
    try {
      const created = await createStepRole({ step_id: step.id, role_id: roleId });
      setStepRoles((prev) => [...prev, created]);
    } catch (err) {
      toastError("Failed to assign role", { error: err, retry: () => handleAssignRole(roleId) });
    }
  };

  const handleRemoveRole = async (stepRoleId: string) => {
    try {
      await deleteStepRole(stepRoleId);
      setStepRoles((prev) => prev.filter((sr) => sr.id !== stepRoleId));
    } catch (err) {
      toastError("Failed to remove role", { error: err });
    }
  };

  const handleAssignTool = async (toolId: string) => {
    try {
      const created = await createStepTool({ step_id: step.id, tool_id: toolId });
      setStepTools((prev) => [...prev, created]);
    } catch (err) {
      toastError("Failed to assign tool", { error: err, retry: () => handleAssignTool(toolId) });
    }
  };

  const handleRemoveTool = async (stepToolId: string) => {
    try {
      await deleteStepTool(stepToolId);
      setStepTools((prev) => prev.filter((st) => st.id !== stepToolId));
    } catch (err) {
      toastError("Failed to remove tool", { error: err });
    }
  };

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      const updated = await updateStep(step.id, { [field]: value });
      onUpdate(updated);
    } catch (err) {
      toastError(`Failed to update ${field}`, { error: err, retry: () => handleFieldUpdate(field, value) });
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    clearTimeout(nameTimeoutRef.current);
    nameTimeoutRef.current = setTimeout(() => {
      if (newName.trim()) handleFieldUpdate("name", newName.trim());
    }, 500);
  };

  const handleDelete = async () => {
    try {
      await apiDeleteStep(step.id);
      onDelete(step.id);
      toast.success("Step deleted");
    } catch (err) {
      toastError("Failed to delete step", { error: err });
    }
  };

  const handleOpenImprovDialog = () => {
    setImprovTitle("");
    setImprovDesc("");
    setImprovPriority("medium");
    setShowImprovDialog(true);
  };

  const handleAddImprovement = async () => {
    if (!improvTitle.trim()) {
      toastError("Title is required");
      return;
    }
    setImprovSaving(true);
    try {
      await createImprovementIdea({
        workspace_id: workspaceId,
        title: improvTitle.trim(),
        description: improvDesc.trim() || undefined,
        priority: improvPriority,
        linked_step_id: step.id,
      });
      toast.success("Improvement added");
      setShowImprovDialog(false);
    } catch (err) {
      toastError("Failed to add improvement", { error: err });
    } finally {
      setImprovSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Step Details
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-5">
        {/* Name */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Step name"
          />
        </div>

        {/* Status */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleFieldUpdate("status", s.value)}
                className="transition-all"
              >
                <Badge
                  variant={s.value as "draft" | "in_progress" | "testing" | "live" | "archived"}
                  className={step.status === s.value ? "ring-1 ring-[var(--text-tertiary)]" : "opacity-50 hover:opacity-80"}
                >
                  {s.label}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Step Type */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Type
          </label>
          <Input
            value={step.step_type ?? ""}
            onChange={(e) => handleFieldUpdate("step_type", e.target.value || null)}
            placeholder="e.g., Review, Approval, Data Entry"
          />
        </div>

        {/* Executor */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Executor
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EXECUTORS.map((ex) => (
              <button
                key={ex.value}
                onClick={() => handleFieldUpdate("executor", ex.value)}
                className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border transition-all ${
                  step.executor === ex.value
                    ? "bg-[var(--bg-surface-active)] border-[var(--border-default)] text-[var(--text-primary)]"
                    : "bg-transparent border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Sections */}
        <CollapsibleSection
          title="Assignments"
          icon={Users}
          badge={(() => {
            const parts: string[] = [];
            if (stepRoles.length > 0) parts.push(`${stepRoles.length} role${stepRoles.length !== 1 ? "s" : ""}`);
            if (stepTools.length > 0) parts.push(`${stepTools.length} tool${stepTools.length !== 1 ? "s" : ""}`);
            return parts.join(" · ") || undefined;
          })()}
        >
          {/* Assigned Roles */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              Assigned Roles
            </label>
            {stepRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {stepRoles.map((sr) => (
                  <Badge key={sr.id} variant="outline" className="gap-1 max-w-none">
                    <span className="truncate">{sr.role.name}</span>
                    <span className="text-[var(--text-quaternary)]">·</span>
                    <span className="text-[var(--text-quaternary)] truncate">{sr.role.team.name}</span>
                    <button
                      onClick={() => handleRemoveRole(sr.id)}
                      className="ml-0.5 hover:text-[var(--error)] transition-colors"
                      aria-label={`Remove ${sr.role.name} role`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border border-dashed border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-all"
                >
                  <Plus className="h-3 w-3" />
                  Assign Role
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[240px] overflow-y-auto">
                {teams.length === 0 && (
                  <DropdownMenuLabel>No teams — create teams first</DropdownMenuLabel>
                )}
                {teams.map((team, teamIdx) => (
                  <React.Fragment key={team.id}>
                    {teamIdx > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel>{team.name}</DropdownMenuLabel>
                    {team.roles.length === 0 && (
                      <DropdownMenuItem disabled>No roles in this team</DropdownMenuItem>
                    )}
                    {team.roles.map((role) => {
                      const isAssigned = assignedRoleIds.has(role.id);
                      return (
                        <DropdownMenuItem
                          key={role.id}
                          disabled={isAssigned}
                          onSelect={() => { if (!isAssigned) handleAssignRole(role.id); }}
                        >
                          <span className="flex-1 truncate">{role.name}</span>
                          {role.hourly_rate != null && (
                            <span className="text-[var(--text-quaternary)] text-[10px] ml-2">
                              ${role.hourly_rate}/hr
                            </span>
                          )}
                          {isAssigned && (
                            <span className="text-[var(--text-quaternary)] text-[10px] ml-1">✓</span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Assigned Tools */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              Assigned Tools
            </label>
            {allTools.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">
                No tools assigned.{" "}
                <Link href={`/w/${workspaceId}/tools`} className="text-[var(--accent-blue)] hover:underline">
                  Assign from Tools page →
                </Link>
              </p>
            ) : (
              <>
                {stepTools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {stepTools.map((st) => (
                      <Badge key={st.id} variant="outline" className="gap-1 max-w-none">
                        <span className="truncate">{st.tool.name}</span>
                        {st.tool.cost_per_month != null && (
                          <>
                            <span className="text-[var(--text-quaternary)]">·</span>
                            <span className="text-[var(--text-quaternary)] truncate">${st.tool.cost_per_month}/mo</span>
                          </>
                        )}
                        <button
                          onClick={() => handleRemoveTool(st.id)}
                          className="ml-0.5 hover:text-[var(--error)] transition-colors"
                          aria-label={`Remove ${st.tool.name} tool`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border border-dashed border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      Assign Tool
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[240px] overflow-y-auto">
                    {allTools.map((tool) => {
                      const isAssigned = assignedToolIds.has(tool.id);
                      return (
                        <DropdownMenuItem
                          key={tool.id}
                          disabled={isAssigned}
                          onSelect={() => { if (!isAssigned) handleAssignTool(tool.id); }}
                        >
                          <span className="flex-1 truncate">{tool.name}</span>
                          {tool.cost_per_month != null && (
                            <span className="text-[var(--text-quaternary)] text-[10px] ml-2">
                              ${tool.cost_per_month}/mo
                            </span>
                          )}
                          {isAssigned && (
                            <span className="text-[var(--text-quaternary)] text-[10px] ml-1">✓</span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Time & Cost"
          icon={Clock}
          badge={(() => {
            const toolMonthlyCost = stepTools.reduce((sum, st) => sum + (st.tool.cost_per_month ?? 0), 0);
            const hasTimeFreq = !!(step.time_minutes && step.frequency_per_month);
            const rolesWithRate = stepRoles.filter((sr) => sr.role.hourly_rate != null);
            const avgRate = rolesWithRate.length > 0
              ? rolesWithRate.reduce((sum, sr) => sum + Number(sr.role.hourly_rate), 0) / rolesWithRate.length
              : null;
            const monthlyHours = hasTimeFreq ? (step.time_minutes! * step.frequency_per_month!) / 60 : 0;
            const laborCost = (hasTimeFreq && avgRate != null) ? monthlyHours * avgRate : null;
            const totalCost = (laborCost ?? 0) + toolMonthlyCost;
            if (totalCost > 0) return `$${totalCost.toFixed(0)}/mo`;
            if (hasTimeFreq) return `${monthlyHours.toFixed(1)}h/mo`;
            return undefined;
          })()}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Clock className="h-3 w-3" />
                Minutes
              </label>
              <Input
                type="number"
                min={0}
                value={step.time_minutes ?? ""}
                onChange={(e) => handleFieldUpdate("time_minutes", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Repeat className="h-3 w-3" />
                Per Month
              </label>
              <Input
                type="number"
                min={0}
                value={step.frequency_per_month ?? ""}
                onChange={(e) => handleFieldUpdate("frequency_per_month", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="0"
              />
            </div>
          </div>

          {(() => {
            const hasTimeFreq = !!(step.time_minutes && step.frequency_per_month);
            const toolMonthlyCost = stepTools.reduce((sum, st) => sum + (st.tool.cost_per_month ?? 0), 0);
            const hasToolCost = toolMonthlyCost > 0;

            if (!hasTimeFreq && !hasToolCost) return null;

            const monthlyHours = hasTimeFreq ? (step.time_minutes! * step.frequency_per_month!) / 60 : 0;
            const rolesWithRate = stepRoles.filter((sr) => sr.role.hourly_rate != null);
            const avgRate = rolesWithRate.length > 0
              ? rolesWithRate.reduce((sum, sr) => sum + Number(sr.role.hourly_rate), 0) / rolesWithRate.length
              : null;
            const laborCost = (hasTimeFreq && avgRate != null) ? monthlyHours * avgRate : null;
            const totalCost = (laborCost ?? 0) + toolMonthlyCost;

            return (
              <div className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-surface-hover)] rounded-[var(--radius-sm)] p-2 space-y-1">
                {hasTimeFreq && (
                  <div>
                    Monthly time: <strong className="text-[var(--text-secondary)]">{monthlyHours.toFixed(1)}h</strong> / month
                  </div>
                )}
                {laborCost != null && (
                  <div>
                    Labor cost: <strong className="text-[var(--text-secondary)]">${laborCost.toFixed(2)}</strong> / month
                    <span className="text-[var(--text-quaternary)] ml-1">(avg ${avgRate!.toFixed(2)}/hr)</span>
                  </div>
                )}
                {hasToolCost && (
                  <div>
                    Tool cost: <strong className="text-[var(--text-secondary)]">${toolMonthlyCost.toFixed(2)}</strong> / month
                  </div>
                )}
                {(laborCost != null || hasToolCost) && (
                  <div className="border-t border-[var(--border-subtle)] pt-1 mt-1">
                    Total: <strong className="text-[var(--text-secondary)]">${totalCost.toFixed(2)}</strong> / month
                  </div>
                )}
              </div>
            );
          })()}
        </CollapsibleSection>

        <CollapsibleSection
          title="Maturity"
          icon={Gauge}
          badge={(() => {
            if (step.maturity_score && step.target_maturity) return `${step.maturity_score} → ${step.target_maturity}`;
            if (step.maturity_score) return `${step.maturity_score}`;
            return undefined;
          })()}
        >
          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Gauge className="h-3 w-3" />
              Current Maturity
            </label>
            <div className="flex gap-1">
              {MATURITY_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleFieldUpdate("maturity_score", step.maturity_score === m.value ? null : m.value)}
                  title={m.label}
                  className={`flex-1 h-8 rounded-[var(--radius-sm)] text-[12px] font-semibold border transition-all ${
                    step.maturity_score === m.value
                      ? "border-[var(--border-default)] text-white"
                      : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                  }`}
                  style={step.maturity_score === m.value ? { backgroundColor: m.color } : undefined}
                >
                  {m.value}
                </button>
              ))}
            </div>
            {step.maturity_score && (
              <p className="text-[10px] text-[var(--text-quaternary)] mt-1">
                {MATURITY_OPTIONS.find((m) => m.value === step.maturity_score)?.label}
              </p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Target className="h-3 w-3" />
              Target Maturity
            </label>
            <div className="flex gap-1">
              {MATURITY_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleFieldUpdate("target_maturity", step.target_maturity === m.value ? null : m.value)}
                  title={m.label}
                  className={`flex-1 h-8 rounded-[var(--radius-sm)] text-[12px] font-semibold border transition-all ${
                    step.target_maturity === m.value
                      ? "border-[var(--border-default)] text-white"
                      : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                  }`}
                  style={step.target_maturity === m.value ? { backgroundColor: m.color } : undefined}
                >
                  {m.value}
                </button>
              ))}
            </div>
            {step.target_maturity && (
              <p className="text-[10px] text-[var(--text-quaternary)] mt-1">
                {MATURITY_OPTIONS.find((m) => m.value === step.target_maturity)?.label}
              </p>
            )}
          </div>

          {step.maturity_score && step.target_maturity && (
            <div className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-surface-hover)] rounded-[var(--radius-sm)] p-2">
              Gap: <strong className={step.target_maturity - step.maturity_score > 0 ? "text-[#F97316]" : "text-[#22C55E]"}>
                {step.target_maturity - step.maturity_score > 0 ? `+${step.target_maturity - step.maturity_score}` : step.target_maturity - step.maturity_score === 0 ? "On target" : String(step.target_maturity - step.maturity_score)}
              </strong>
              {step.target_maturity - step.maturity_score > 0 && " levels to improve"}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Prioritization"
          icon={TrendingUp}
          badge={(() => {
            const parts: string[] = [];
            if (step.effort_score) parts.push(`E:${step.effort_score}`);
            if (step.impact_score) parts.push(`I:${step.impact_score}`);
            return parts.join(" ") || undefined;
          })()}
        >
          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Zap className="h-3 w-3" />
              Effort Score
            </label>
            <div className="flex gap-1">
              {SCORE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFieldUpdate("effort_score", step.effort_score === opt.value ? null : opt.value)}
                  title={opt.label}
                  className={`flex-1 h-8 rounded-[var(--radius-sm)] text-[12px] font-semibold border transition-all ${
                    step.effort_score === opt.value
                      ? "border-[#F97316] text-white"
                      : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                  }`}
                  style={step.effort_score === opt.value ? { backgroundColor: "#F97316" } : undefined}
                >
                  {opt.value}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-quaternary)] mt-1">1 = low effort, 5 = high effort</p>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <TrendingUp className="h-3 w-3" />
              Impact Score
            </label>
            <div className="flex gap-1">
              {SCORE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFieldUpdate("impact_score", step.impact_score === opt.value ? null : opt.value)}
                  title={opt.label}
                  className={`flex-1 h-8 rounded-[var(--radius-sm)] text-[12px] font-semibold border transition-all ${
                    step.impact_score === opt.value
                      ? "border-[var(--brand)] text-white"
                      : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                  }`}
                  style={step.impact_score === opt.value ? { backgroundColor: "var(--brand)" } : undefined}
                >
                  {opt.value}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-quaternary)] mt-1">1 = low impact, 5 = high impact</p>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Lightbulb className="h-3 w-3" />
              Value Type
            </label>
            <div className="flex gap-1">
              {([
                { value: "value_adding" as ValueType, label: "Value Adding", color: "#16A34A" },
                { value: "necessary_waste" as ValueType, label: "Necessary", color: "#D97706" },
                { value: "pure_waste" as ValueType, label: "Waste", color: "#DC2626" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFieldUpdate("value_type", step.value_type === opt.value ? null : opt.value)}
                  title={opt.label}
                  className={`flex-1 h-8 rounded-[var(--radius-sm)] text-[10px] font-semibold border transition-all ${
                    step.value_type === opt.value
                      ? "text-white"
                      : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                  }`}
                  style={step.value_type === opt.value ? { backgroundColor: opt.color, borderColor: opt.color } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-quaternary)] mt-1">Lean classification for cost analysis</p>
          </div>

          {/* Phase Override (P4) — only show when step has a gap */}
          {step.maturity_score != null && step.target_maturity != null && step.target_maturity > step.maturity_score && (
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Target className="h-3 w-3" />
                Roadmap Phase
                {step.phase_override != null && (
                  <span className="ml-1 px-1 py-0.5 text-[9px] rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]">override</span>
                )}
              </label>
              <div className="flex gap-1">
                {([
                  { value: 0, label: "Phase 0", sublabel: "Wk 1–2", color: "#16A34A" },
                  { value: 1, label: "Phase 1", sublabel: "Mo 1–3", color: "#3B82F6" },
                  { value: 2, label: "Phase 2", sublabel: "Mo 3–6", color: "#D97706" },
                ]).map((opt) => {
                  const isActive = step.phase_override === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleFieldUpdate("phase_override", isActive ? null : opt.value)}
                      title={`${opt.label} (${opt.sublabel})`}
                      className={`flex-1 h-8 rounded-[var(--radius-sm)] text-[10px] font-semibold border transition-all ${
                        isActive
                          ? "text-white"
                          : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                      }`}
                      style={isActive ? { backgroundColor: opt.color, borderColor: opt.color } : undefined}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[var(--text-quaternary)] mt-1">Override derived phase for the roadmap</p>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Portal Link"
          icon={ExternalLink}
          badge={step.link_to_tab_id ? tabs.find((t) => t.id === step.link_to_tab_id)?.name : undefined}
        >
          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
              Target Flow (Tab)
            </label>
            <select
              value={step.link_to_tab_id ?? ""}
              onChange={(e) => {
                const val = e.target.value || null;
                handleFieldUpdate("link_to_tab_id", val);
                if (!val) handleFieldUpdate("link_to_step_id", null);
              }}
              className="w-full h-8 px-2 text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-primary)] focus:border-[var(--border-focus)] outline-none"
            >
              <option value="">None</option>
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {step.link_to_tab_id && (
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
                Target Step (optional)
              </label>
              <select
                value={step.link_to_step_id ?? ""}
                onChange={(e) => handleFieldUpdate("link_to_step_id", e.target.value || null)}
                className="w-full h-8 px-2 text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-primary)] focus:border-[var(--border-focus)] outline-none"
              >
                <option value="">Any step</option>
                {portalSteps.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {step.link_to_tab_id && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                handleFieldUpdate("link_to_tab_id", null);
                handleFieldUpdate("link_to_step_id", null);
              }}
              className="w-full"
            >
              Clear Link
            </Button>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Notes & Media"
          icon={FileText}
          badge={(() => {
            const parts: string[] = [];
            if (step.notes) parts.push("Has notes");
            if (step.video_url) parts.push("Has video");
            return parts.join(" · ") || undefined;
          })()}
        >
          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
              Notes
            </label>
            <RichTextEditor
              content={step.notes ?? ""}
              onChange={(html) => handleFieldUpdate("notes", html)}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
              Video
            </label>
            <VideoEmbed
              url={step.video_url}
              onChange={(url) => handleFieldUpdate("video_url", url)}
            />
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)] space-y-2">
        <Button variant="secondary" size="sm" onClick={handleOpenImprovDialog} className="w-full">
          <Lightbulb className="h-3.5 w-3.5" />
          Add Improvement
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Step
        </Button>
      </div>

      <Dialog open={showImprovDialog} onOpenChange={setShowImprovDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogPrimitive.Title className="text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
              Add Improvement
            </DialogPrimitive.Title>
            <DialogDescription>Log an improvement idea for this step</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
                Title
              </label>
              <Input
                value={improvTitle}
                onChange={(e) => setImprovTitle(e.target.value)}
                placeholder="Describe the improvement..."
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
                Description
              </label>
              <Textarea
                value={improvDesc}
                onChange={(e) => setImprovDesc(e.target.value)}
                placeholder="Additional details (optional)"
                rows={3}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
                Priority
              </label>
              <select
                value={improvPriority}
                onChange={(e) => setImprovPriority(e.target.value as ImprovementPriority)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] text-[13px] bg-[var(--input-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-default)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowImprovDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddImprovement} disabled={improvSaving}>
              {improvSaving ? "Adding..." : "Add Improvement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
