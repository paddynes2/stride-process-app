"use client";

import * as React from "react";
import { X, Trash2, Clock, Repeat, Gauge, Target, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RichTextEditor } from "./rich-text-editor";
import { VideoEmbed } from "./video-embed";
import {
  updateStep,
  deleteStep as apiDeleteStep,
  fetchTeams,
  fetchStepRoles,
  createStepRole,
  deleteStepRole,
} from "@/lib/api/client";
import type { TeamWithRoles, StepRoleWithDetails } from "@/lib/api/client";
import type { Step, StepStatus, ExecutorType } from "@/types/database";
import { toast } from "sonner";

const STATUSES: { value: StepStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "testing", label: "Testing" },
  { value: "live", label: "Live" },
  { value: "archived", label: "Archived" },
];

const MATURITY_LEVELS = [
  { value: 1, label: "1 — Initial", color: "#EF4444" },
  { value: 2, label: "2 — Developing", color: "#F97316" },
  { value: 3, label: "3 — Defined", color: "#EAB308" },
  { value: 4, label: "4 — Managed", color: "#84CC16" },
  { value: 5, label: "5 — Optimized", color: "#22C55E" },
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

  React.useEffect(() => {
    setName(step.name);
  }, [step.id, step.name]);

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

  const assignedRoleIds = new Set(stepRoles.map((sr) => sr.role_id));

  const handleAssignRole = async (roleId: string) => {
    try {
      const created = await createStepRole({ step_id: step.id, role_id: roleId });
      setStepRoles((prev) => [...prev, created]);
    } catch {
      toast.error("Failed to assign role");
    }
  };

  const handleRemoveRole = async (stepRoleId: string) => {
    try {
      await deleteStepRole(stepRoleId);
      setStepRoles((prev) => prev.filter((sr) => sr.id !== stepRoleId));
    } catch {
      toast.error("Failed to remove role");
    }
  };

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      const updated = await updateStep(step.id, { [field]: value });
      onUpdate(updated);
    } catch {
      toast.error(`Failed to update ${field}`);
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
    } catch {
      toast.error("Failed to delete step");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Step Details
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
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

        {/* Assigned Roles */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
            <Users className="h-3 w-3" />
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

        <Separator />

        {/* Time & Frequency */}
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

        {step.time_minutes && step.frequency_per_month ? (() => {
          const monthlyHours = (step.time_minutes * step.frequency_per_month) / 60;
          const rolesWithRate = stepRoles.filter((sr) => sr.role.hourly_rate != null);
          const avgRate = rolesWithRate.length > 0
            ? rolesWithRate.reduce((sum, sr) => sum + Number(sr.role.hourly_rate), 0) / rolesWithRate.length
            : null;
          const monthlyCost = avgRate != null ? monthlyHours * avgRate : null;
          return (
            <div className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-surface-hover)] rounded-[var(--radius-sm)] p-2 space-y-1">
              <div>
                Monthly time: <strong className="text-[var(--text-secondary)]">{monthlyHours.toFixed(1)}h</strong> / month
              </div>
              {monthlyCost != null && (
                <div>
                  Monthly cost: <strong className="text-[var(--text-secondary)]">${monthlyCost.toFixed(2)}</strong> / month
                  <span className="text-[var(--text-quaternary)] ml-1">(avg ${avgRate!.toFixed(2)}/hr)</span>
                </div>
              )}
            </div>
          );
        })() : null}

        <Separator />

        {/* Maturity Score */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
            <Gauge className="h-3 w-3" />
            Current Maturity
          </label>
          <div className="flex gap-1">
            {MATURITY_LEVELS.map((m) => (
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
              {MATURITY_LEVELS.find((m) => m.value === step.maturity_score)?.label}
            </p>
          )}
        </div>

        {/* Target Maturity */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
            <Target className="h-3 w-3" />
            Target Maturity
          </label>
          <div className="flex gap-1">
            {MATURITY_LEVELS.map((m) => (
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
              {MATURITY_LEVELS.find((m) => m.value === step.target_maturity)?.label}
            </p>
          )}
        </div>

        {/* Gap indicator */}
        {step.maturity_score && step.target_maturity && (
          <div className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-surface-hover)] rounded-[var(--radius-sm)] p-2">
            Gap: <strong className={step.target_maturity - step.maturity_score > 0 ? "text-[#F97316]" : "text-[#22C55E]"}>
              {step.target_maturity - step.maturity_score > 0 ? `+${step.target_maturity - step.maturity_score}` : step.target_maturity - step.maturity_score === 0 ? "On target" : String(step.target_maturity - step.maturity_score)}
            </strong>
            {step.target_maturity - step.maturity_score > 0 && " levels to improve"}
          </div>
        )}

        <Separator />

        {/* Notes */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Notes
          </label>
          <RichTextEditor
            content={step.notes ?? ""}
            onChange={(html) => handleFieldUpdate("notes", html)}
          />
        </div>

        <Separator />

        {/* Video */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Video
          </label>
          <VideoEmbed
            url={step.video_url}
            onChange={(url) => handleFieldUpdate("video_url", url)}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Step
        </Button>
      </div>
    </div>
  );
}
