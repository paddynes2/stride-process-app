"use client";

import * as React from "react";
import {
  Users,
  Plus,
  Trash2,
  ChevronRight,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  createRole,
  updateRole,
  deleteRole,
  createPerson,
  updatePerson,
  deletePerson,
  type TeamWithRoles,
} from "@/lib/api/client";
import type { Person } from "@/types/database";

interface TeamsViewProps {
  workspaceId: string;
  initialTeams: TeamWithRoles[];
}

export function TeamsView({ workspaceId, initialTeams }: TeamsViewProps) {
  const [teams, setTeams] = React.useState<TeamWithRoles[]>(initialTeams);
  const [expandedTeams, setExpandedTeams] = React.useState<Set<string>>(
    () => new Set(initialTeams.map((t) => t.id))
  );
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const data = await fetchTeams(workspaceId);
    setTeams(data);
  }, [workspaceId]);

  const toggleExpand = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleAddTeam = async () => {
    setLoading(true);
    try {
      const team = await createTeam({ workspace_id: workspaceId, name: "New Team" });
      setExpandedTeams((prev) => new Set(prev).add(team.id));
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    await deleteTeam(teamId);
    await refresh();
  };

  const handleUpdateTeamName = async (teamId: string, name: string) => {
    if (!name.trim()) return;
    await updateTeam(teamId, { name: name.trim() });
    await refresh();
  };

  const handleAddRole = async (teamId: string) => {
    await createRole({ team_id: teamId, name: "New Role" });
    await refresh();
  };

  const handleDeleteRole = async (roleId: string) => {
    await deleteRole(roleId);
    await refresh();
  };

  const handleUpdateRoleName = async (roleId: string, name: string) => {
    if (!name.trim()) return;
    await updateRole(roleId, { name: name.trim() });
    await refresh();
  };

  const handleUpdateRoleRate = async (roleId: string, value: string) => {
    const rate = parseFloat(value);
    if (isNaN(rate) || rate < 0) return;
    await updateRole(roleId, { hourly_rate: rate });
    await refresh();
  };

  const handleAddPerson = async (roleId: string) => {
    await createPerson({ role_id: roleId, name: "New Person" });
    await refresh();
  };

  const handleDeletePerson = async (personId: string) => {
    await deletePerson(personId);
    await refresh();
  };

  const handleUpdatePersonName = async (personId: string, name: string) => {
    if (!name.trim()) return;
    await updatePerson(personId, { name: name.trim() });
    await refresh();
  };

  const handleUpdatePersonEmail = async (personId: string, email: string) => {
    await updatePerson(personId, { email: email.trim() || null });
    await refresh();
  };

  // Summary stats
  const totalRoles = teams.reduce((sum, t) => sum + t.roles.length, 0);
  const ratesWithValues = teams.flatMap((t) =>
    t.roles.filter((r) => r.hourly_rate != null).map((r) => r.hourly_rate!)
  );
  const avgRate =
    ratesWithValues.length > 0
      ? ratesWithValues.reduce((a, b) => a + b, 0) / ratesWithValues.length
      : 0;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[var(--text-tertiary)]" />
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
              Teams
            </h1>
          </div>
          <Button onClick={handleAddTeam} disabled={loading} size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add Team
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Teams" value={teams.length} />
          <SummaryCard label="Roles" value={totalRoles} />
          <SummaryCard
            label="Avg Hourly Rate"
            value={avgRate > 0 ? `$${avgRate.toFixed(0)}` : "—"}
          />
        </div>

        {/* Team list */}
        {teams.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
            <Users className="h-8 w-8 text-[var(--text-quaternary)] mx-auto mb-3" />
            <p className="text-[14px] text-[var(--text-secondary)] mb-1">
              No teams yet
            </p>
            <p className="text-[12px] text-[var(--text-quaternary)] mb-4">
              Create teams and roles to assign hourly rates for process costing
            </p>
            <Button onClick={handleAddTeam} disabled={loading} size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Team
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                expanded={expandedTeams.has(team.id)}
                onToggle={() => toggleExpand(team.id)}
                onUpdateName={(name) => handleUpdateTeamName(team.id, name)}
                onDelete={() => handleDeleteTeam(team.id)}
                onAddRole={() => handleAddRole(team.id)}
                onDeleteRole={handleDeleteRole}
                onUpdateRoleName={handleUpdateRoleName}
                onUpdateRoleRate={handleUpdateRoleRate}
                onAddPerson={handleAddPerson}
                onDeletePerson={handleDeletePerson}
                onUpdatePersonName={handleUpdatePersonName}
                onUpdatePersonEmail={handleUpdatePersonEmail}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
        {label}
      </div>
      <div className="text-[24px] font-semibold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team Card
// ---------------------------------------------------------------------------

interface TeamCardProps {
  team: TeamWithRoles;
  expanded: boolean;
  onToggle: () => void;
  onUpdateName: (name: string) => void;
  onDelete: () => void;
  onAddRole: () => void;
  onDeleteRole: (roleId: string) => void;
  onUpdateRoleName: (roleId: string, name: string) => void;
  onUpdateRoleRate: (roleId: string, value: string) => void;
  onAddPerson: (roleId: string) => void;
  onDeletePerson: (personId: string) => void;
  onUpdatePersonName: (personId: string, name: string) => void;
  onUpdatePersonEmail: (personId: string, email: string) => void;
}

function TeamCard({
  team,
  expanded,
  onToggle,
  onUpdateName,
  onDelete,
  onAddRole,
  onDeleteRole,
  onUpdateRoleName,
  onUpdateRoleRate,
  onAddPerson,
  onDeletePerson,
  onUpdatePersonName,
  onUpdatePersonEmail,
}: TeamCardProps) {
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(team.name);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setNameValue(team.name);
  }, [team.name]);

  React.useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const commitName = () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue.trim() !== team.name) {
      onUpdateName(nameValue.trim());
    } else {
      setNameValue(team.name);
    }
  };

  const peopleCount = team.roles.reduce((sum, r) => sum + r.people.length, 0);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      {/* Team header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onToggle}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${team.name}`}
          className="flex items-center justify-center h-6 w-6 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] rounded-[var(--radius-sm)]"
        >
          <ChevronRight
            className="h-4 w-4 transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : undefined }}
          />
        </button>

        {editingName ? (
          <Input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setNameValue(team.name);
                setEditingName(false);
              }
            }}
            className="h-7 max-w-[200px] text-[14px]"
            aria-label="Team name"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-[14px] font-semibold text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors"
          >
            {team.name}
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto text-[11px] text-[var(--text-quaternary)]">
          <span>
            {team.roles.length} role{team.roles.length !== 1 ? "s" : ""}
          </span>
          <span>&middot;</span>
          <span>
            {peopleCount} {peopleCount !== 1 ? "people" : "person"}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          className="text-[var(--text-quaternary)] hover:text-[var(--error)]"
          aria-label={`Delete ${team.name} team`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Roles (expanded) */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
          {team.roles.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-[12px] text-[var(--text-quaternary)] mb-2">
                No roles yet
              </p>
              <Button onClick={onAddRole} variant="ghost" size="sm">
                <Plus className="h-3 w-3" />
                Add Role
              </Button>
            </div>
          ) : (
            <>
              {/* Roles header */}
              <div className="grid grid-cols-[1fr_120px_80px_36px] items-center px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                <span className="pl-6">Role</span>
                <span>Hourly Rate</span>
                <span>People</span>
                <span />
              </div>
              {team.roles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  onUpdateName={(name) => onUpdateRoleName(role.id, name)}
                  onUpdateRate={(value) => onUpdateRoleRate(role.id, value)}
                  onDelete={() => onDeleteRole(role.id)}
                  onAddPerson={() => onAddPerson(role.id)}
                  onDeletePerson={onDeletePerson}
                  onUpdatePersonName={onUpdatePersonName}
                  onUpdatePersonEmail={onUpdatePersonEmail}
                />
              ))}
              <div className="px-4 py-2 border-t border-[var(--border-subtle)]">
                <Button onClick={onAddRole} variant="ghost" size="sm">
                  <Plus className="h-3 w-3" />
                  Add Role
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role Row
// ---------------------------------------------------------------------------

interface RoleRowProps {
  role: TeamWithRoles["roles"][number];
  onUpdateName: (name: string) => void;
  onUpdateRate: (value: string) => void;
  onDelete: () => void;
  onAddPerson: () => void;
  onDeletePerson: (personId: string) => void;
  onUpdatePersonName: (personId: string, name: string) => void;
  onUpdatePersonEmail: (personId: string, email: string) => void;
}

function RoleRow({ role, onUpdateName, onUpdateRate, onDelete, onAddPerson, onDeletePerson, onUpdatePersonName, onUpdatePersonEmail }: RoleRowProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(role.name);
  const [rateValue, setRateValue] = React.useState(
    role.hourly_rate != null ? String(role.hourly_rate) : ""
  );
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setNameValue(role.name);
  }, [role.name]);

  React.useEffect(() => {
    setRateValue(role.hourly_rate != null ? String(role.hourly_rate) : "");
  }, [role.hourly_rate]);

  React.useEffect(() => {
    if (editingName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editingName]);

  const commitName = () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue.trim() !== role.name) {
      onUpdateName(nameValue.trim());
    } else {
      setNameValue(role.name);
    }
  };

  const commitRate = () => {
    const trimmed = rateValue.trim();
    if (trimmed === "") {
      // Clear the rate
      if (role.hourly_rate != null) {
        onUpdateRate("0");
      }
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== role.hourly_rate) {
      onUpdateRate(trimmed);
    } else {
      setRateValue(role.hourly_rate != null ? String(role.hourly_rate) : "");
    }
  };

  return (
    <div className="border-t border-[var(--border-subtle)]">
      <div className="grid grid-cols-[1fr_120px_80px_36px] items-center px-4 py-2 hover:bg-[var(--bg-row-hover)] transition-colors">
        {/* Role name */}
        <div className="pl-6 flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${role.name}`}
            className="flex items-center justify-center h-6 w-6 text-[var(--text-quaternary)] hover:text-[var(--text-tertiary)] transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] rounded-[var(--radius-sm)]"
          >
            <ChevronRight
              className="h-3 w-3 transition-transform"
              style={{ transform: expanded ? "rotate(90deg)" : undefined }}
            />
          </button>
          <Briefcase className="h-3.5 w-3.5 text-[var(--text-quaternary)] shrink-0" />
          {editingName ? (
            <Input
              ref={nameRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setNameValue(role.name);
                  setEditingName(false);
                }
              }}
              className="h-6 max-w-[180px] text-[12px]"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-[13px] text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors truncate text-left"
            >
              {role.name}
            </button>
          )}
        </div>

        {/* Hourly rate */}
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" />
          <Input
            value={rateValue}
            onChange={(e) => setRateValue(e.target.value)}
            onBlur={commitRate}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRate();
            }}
            placeholder="0"
            type="number"
            min="0"
            step="0.01"
            className="h-6 w-[90px] text-[12px]"
            aria-label={`Hourly rate for ${role.name}`}
          />
        </div>

        {/* People count */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] transition-colors text-left"
        >
          {role.people.length}
        </button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          className="h-6 w-6 text-[var(--text-quaternary)] hover:text-[var(--error)]"
          aria-label={`Delete ${role.name} role`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* People (expanded) */}
      {expanded && (
        <div className="bg-[var(--bg-base)] border-t border-[var(--border-subtle)] ml-12 mr-4 mb-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          {role.people.length === 0 ? (
            <div className="px-4 py-3 text-center">
              <p className="text-[11px] text-[var(--text-quaternary)] mb-2">
                No people in this role
              </p>
              <Button onClick={onAddPerson} variant="ghost" size="sm">
                <Plus className="h-3 w-3" />
                Add Person
              </Button>
            </div>
          ) : (
            <>
              {/* People header */}
              <div className="grid grid-cols-[1fr_1fr_32px] items-center px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                <span>Name</span>
                <span>Email</span>
                <span />
              </div>
              {role.people.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  onUpdateName={(name) => onUpdatePersonName(person.id, name)}
                  onUpdateEmail={(email) => onUpdatePersonEmail(person.id, email)}
                  onDelete={() => onDeletePerson(person.id)}
                />
              ))}
              <div className="px-3 py-1.5 border-t border-[var(--border-subtle)]">
                <Button onClick={onAddPerson} variant="ghost" size="sm">
                  <Plus className="h-3 w-3" />
                  Add Person
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Person Row
// ---------------------------------------------------------------------------

interface PersonRowProps {
  person: Person;
  onUpdateName: (name: string) => void;
  onUpdateEmail: (email: string) => void;
  onDelete: () => void;
}

function PersonRow({ person, onUpdateName, onUpdateEmail, onDelete }: PersonRowProps) {
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(person.name);
  const [emailValue, setEmailValue] = React.useState(person.email ?? "");
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setNameValue(person.name);
  }, [person.name]);

  React.useEffect(() => {
    setEmailValue(person.email ?? "");
  }, [person.email]);

  React.useEffect(() => {
    if (editingName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editingName]);

  const commitName = () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue.trim() !== person.name) {
      onUpdateName(nameValue.trim());
    } else {
      setNameValue(person.name);
    }
  };

  const commitEmail = () => {
    const trimmed = emailValue.trim();
    if (trimmed !== (person.email ?? "")) {
      onUpdateEmail(trimmed);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_1fr_32px] items-center px-3 py-1.5 border-t border-[var(--border-subtle)] hover:bg-[var(--bg-row-hover)] transition-colors">
      {/* Person name */}
      {editingName ? (
        <Input
          ref={nameRef}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName();
            if (e.key === "Escape") {
              setNameValue(person.name);
              setEditingName(false);
            }
          }}
          className="h-6 max-w-[160px] text-[12px]"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="text-[12px] text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors truncate text-left"
        >
          {person.name}
        </button>
      )}

      {/* Email */}
      <Input
        value={emailValue}
        onChange={(e) => setEmailValue(e.target.value)}
        onBlur={commitEmail}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitEmail();
        }}
        placeholder="email@example.com"
        type="email"
        className="h-6 text-[12px]"
        aria-label={`Email for ${person.name}`}
      />

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        className="h-6 w-6 text-[var(--text-quaternary)] hover:text-[var(--error)]"
        aria-label={`Delete ${person.name}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
