"use client";

import * as React from "react";
import { Paintbrush, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createColoringRule, updateColoringRule, deleteColoringRule } from "@/lib/api/client";
import type { ColoringRule, CriteriaType } from "@/types/database";
import { toastError } from "@/lib/api/toast-helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ColoringPanelProps {
  workspaceId: string;
  rules: ColoringRule[];
  onRulesChange: (rules: ColoringRule[]) => void;
}

const CRITERIA_OPTIONS: { value: CriteriaType; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "executor", label: "Executor" },
  { value: "step_type", label: "Step Type" },
  { value: "maturity_below", label: "Maturity Below" },
  { value: "maturity_above", label: "Maturity Above" },
  { value: "has_role", label: "Has Role" },
];

const CRITERIA_VALUE_HINTS: Record<CriteriaType, string> = {
  status: "draft, in_progress, testing, live, archived",
  executor: "person, automation, ai_agent",
  step_type: "any step type value",
  has_role: "role ID (not evaluated visually)",
  maturity_below: "1–5",
  maturity_above: "1–5",
};

interface AddFormState {
  name: string;
  color: string;
  criteria_type: CriteriaType;
  criteria_value: string;
}

const DEFAULT_ADD_FORM: AddFormState = {
  name: "",
  color: "#14B8A6",
  criteria_type: "status",
  criteria_value: "",
};

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function ColoringPanel({ workspaceId, rules, onRulesChange }: ColoringPanelProps) {
  const [addForm, setAddForm] = React.useState<AddFormState>(DEFAULT_ADD_FORM);
  const [addSaving, setAddSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<{
    name: string;
    color: string;
    criteria_type: CriteriaType;
    criteria_value: string;
  }>({ name: "", color: "#14B8A6", criteria_type: "status", criteria_value: "" });
  const [editSaving, setEditSaving] = React.useState(false);

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      toastError("Rule name is required");
      return;
    }
    if (!addForm.criteria_value.trim()) {
      toastError("Criteria value is required");
      return;
    }
    if (!HEX_REGEX.test(addForm.color)) {
      toastError("Invalid color. Use format #RRGGBB");
      return;
    }
    setAddSaving(true);
    try {
      const rule = await createColoringRule({
        workspace_id: workspaceId,
        name: addForm.name.trim(),
        color: addForm.color,
        criteria_type: addForm.criteria_type,
        criteria_value: addForm.criteria_value.trim(),
        position: rules.length,
      });
      onRulesChange([...rules, rule]);
      setAddForm(DEFAULT_ADD_FORM);
      toast.success("Rule added");
    } catch (err) {
      toastError("Failed to add rule", { error: err });
    } finally {
      setAddSaving(false);
    }
  };

  const handleToggleActive = async (rule: ColoringRule) => {
    try {
      const updated = await updateColoringRule(rule.id, { is_active: !rule.is_active });
      onRulesChange(rules.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      toastError("Failed to update rule", { error: err });
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteColoringRule(ruleId);
      onRulesChange(rules.filter((r) => r.id !== ruleId));
      if (editingId === ruleId) setEditingId(null);
      toast.success("Rule deleted");
    } catch (err) {
      toastError("Failed to delete rule", { error: err });
    }
  };

  const handleEditStart = (rule: ColoringRule) => {
    setEditingId(rule.id);
    setEditForm({
      name: rule.name,
      color: rule.color,
      criteria_type: rule.criteria_type,
      criteria_value: rule.criteria_value,
    });
  };

  const handleEditSave = async (ruleId: string) => {
    if (!editForm.name.trim()) {
      toastError("Rule name is required");
      return;
    }
    if (!HEX_REGEX.test(editForm.color)) {
      toastError("Invalid color. Use format #RRGGBB");
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateColoringRule(ruleId, {
        name: editForm.name.trim(),
        color: editForm.color,
        criteria_type: editForm.criteria_type,
        criteria_value: editForm.criteria_value.trim(),
      });
      onRulesChange(rules.map((r) => (r.id === updated.id ? updated : r)));
      setEditingId(null);
    } catch (err) {
      toastError("Failed to save rule", { error: err });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="w-[280px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
        <Paintbrush className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">Coloring Rules</span>
        <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">
          {rules.length} rule{rules.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Rules list */}
      <div className="max-h-[240px] overflow-y-auto">
        {rules.length === 0 && (
          <p className="text-[11px] text-[var(--text-tertiary)] px-3 py-3 text-center">No rules yet</p>
        )}
        {(rules ?? []).map((rule) => (
          <div key={rule.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
            {editingId === rule.id ? (
              /* Edit mode */
              <div className="px-3 py-2 space-y-1.5">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
                  placeholder="Rule name"
                />
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={HEX_REGEX.test(editForm.color) ? editForm.color : "#14B8A6"}
                    onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                    className="h-7 w-8 rounded border border-[var(--border-subtle)] bg-transparent cursor-pointer p-0.5 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={editForm.color}
                    onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                    className="flex-1 bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
                    placeholder="#14B8A6"
                  />
                </div>
                <select
                  value={editForm.criteria_type}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, criteria_type: e.target.value as CriteriaType }))
                  }
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
                >
                  {CRITERIA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editForm.criteria_value}
                  onChange={(e) => setEditForm((f) => ({ ...f, criteria_value: e.target.value }))}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
                  placeholder={CRITERIA_VALUE_HINTS[editForm.criteria_type]}
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => handleEditSave(rule.id)}
                    disabled={editSaving}
                    className="flex-1"
                  >
                    <Check className="h-3 w-3" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                    className="flex-1"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <div className="flex items-center gap-2 px-3 py-2 group">
                {/* Color swatch */}
                <div
                  className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-[var(--border-subtle)]"
                  style={{ backgroundColor: rule.color }}
                />
                {/* Rule info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{rule.name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                    {rule.criteria_type}: {rule.criteria_value}
                  </p>
                </div>
                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(rule)}
                  className={cn(
                    "relative w-7 h-4 rounded-full flex-shrink-0 transition-colors",
                    rule.is_active ? "bg-[var(--accent-blue)]" : "bg-[var(--border-default)]"
                  )}
                  aria-label={rule.is_active ? "Disable rule" : "Enable rule"}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                      rule.is_active ? "left-3.5" : "left-0.5"
                    )}
                  />
                </button>
                {/* Edit button */}
                <button
                  onClick={() => handleEditStart(rule)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-opacity"
                  aria-label="Edit rule"
                >
                  <Paintbrush className="h-3 w-3" />
                </button>
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-tertiary)] hover:text-red-400 transition-opacity"
                  aria-label="Delete rule"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new rule form */}
      <div className="border-t border-[var(--border-subtle)] px-3 py-2 space-y-1.5">
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
          Add Rule
        </p>
        <input
          type="text"
          value={addForm.name}
          onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          placeholder="Rule name"
        />
        <div className="flex gap-1.5">
          <input
            type="color"
            value={HEX_REGEX.test(addForm.color) ? addForm.color : "#14B8A6"}
            onChange={(e) => setAddForm((f) => ({ ...f, color: e.target.value }))}
            className="h-7 w-8 rounded border border-[var(--border-subtle)] bg-transparent cursor-pointer p-0.5 flex-shrink-0"
          />
          <input
            type="text"
            value={addForm.color}
            onChange={(e) => setAddForm((f) => ({ ...f, color: e.target.value }))}
            className="flex-1 bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
            placeholder="#14B8A6"
          />
        </div>
        <select
          value={addForm.criteria_type}
          onChange={(e) =>
            setAddForm((f) => ({ ...f, criteria_type: e.target.value as CriteriaType }))
          }
          className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
        >
          {CRITERIA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={addForm.criteria_value}
          onChange={(e) => setAddForm((f) => ({ ...f, criteria_value: e.target.value }))}
          className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          placeholder={CRITERIA_VALUE_HINTS[addForm.criteria_type]}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <Button size="sm" onClick={handleAdd} disabled={addSaving} className="w-full">
          <Plus className="h-3.5 w-3.5" />
          {addSaving ? "Saving…" : "Save Rule"}
        </Button>
      </div>
    </div>
  );
}
