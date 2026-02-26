"use client";

import * as React from "react";
import { User, Plus, Trash2, Mail, Briefcase, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchTeams,
  createPerson,
  updatePerson,
  deletePerson,
  type TeamWithRoles,
} from "@/lib/api/client";
import type { Person } from "@/types/database";

interface FlatPerson extends Person {
  roleName: string;
  roleId: string;
  teamName: string;
}

interface PeopleViewProps {
  workspaceId: string;
  initialTeams: TeamWithRoles[];
}

function flattenPeople(teams: TeamWithRoles[]): FlatPerson[] {
  const people: FlatPerson[] = [];
  for (const team of teams) {
    for (const role of team.roles) {
      for (const person of role.people) {
        people.push({
          ...person,
          roleName: role.name,
          roleId: role.id,
          teamName: team.name,
        });
      }
    }
  }
  return people.sort((a, b) => a.name.localeCompare(b.name));
}

function getRoles(teams: TeamWithRoles[]): { id: string; name: string; teamName: string }[] {
  const roles: { id: string; name: string; teamName: string }[] = [];
  for (const team of teams) {
    for (const role of team.roles) {
      roles.push({ id: role.id, name: role.name, teamName: team.name });
    }
  }
  return roles;
}

export function PeopleView({ workspaceId, initialTeams }: PeopleViewProps) {
  const [teams, setTeams] = React.useState<TeamWithRoles[]>(initialTeams);
  const [loading, setLoading] = React.useState(false);
  const [addingToRole, setAddingToRole] = React.useState<string | null>(null);

  const people = React.useMemo(() => flattenPeople(teams), [teams]);
  const roles = React.useMemo(() => getRoles(teams), [teams]);
  const teamCount = new Set(people.map((p) => p.teamName)).size;

  const refresh = React.useCallback(async () => {
    const data = await fetchTeams(workspaceId);
    setTeams(data);
  }, [workspaceId]);

  const handleAddPerson = async (roleId: string) => {
    setLoading(true);
    try {
      await createPerson({ role_id: roleId, name: "New Person" });
      await refresh();
    } finally {
      setLoading(false);
      setAddingToRole(null);
    }
  };

  const handleUpdateName = async (personId: string, name: string) => {
    if (!name.trim()) return;
    await updatePerson(personId, { name: name.trim() });
    await refresh();
  };

  const handleUpdateEmail = async (personId: string, email: string) => {
    await updatePerson(personId, { email: email.trim() || null });
    await refresh();
  };

  const handleDelete = async (personId: string) => {
    if (!confirm("Delete this person? This action cannot be undone.")) return;
    await deletePerson(personId);
    await refresh();
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-[var(--text-tertiary)]" />
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
              People
            </h1>
          </div>
          {roles.length > 0 ? (
            <div className="relative">
              <Button
                onClick={() => setAddingToRole(addingToRole ? null : "__open")}
                disabled={loading}
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Person
              </Button>
              {addingToRole === "__open" && (
                <RolePickerDropdown
                  roles={roles}
                  onSelect={(roleId) => handleAddPerson(roleId)}
                  onClose={() => setAddingToRole(null)}
                />
              )}
            </div>
          ) : null}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="People" value={people.length} />
          <SummaryCard label="Roles" value={roles.length} />
          <SummaryCard label="Teams" value={teamCount} />
        </div>

        {/* People table */}
        {people.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
            <User className="h-8 w-8 text-[var(--text-quaternary)] mx-auto mb-3" />
            <p className="text-[14px] text-[var(--text-secondary)] mb-1">
              No people yet
            </p>
            <p className="text-[12px] text-[var(--text-quaternary)] mb-4">
              {roles.length === 0
                ? "Create teams and roles first, then add people to roles"
                : "Add people to your team roles to track who does what"}
            </p>
            {roles.length > 0 && (
              <div className="relative inline-block">
                <Button
                  onClick={() => setAddingToRole(addingToRole ? null : "__open")}
                  disabled={loading}
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Person
                </Button>
                {addingToRole === "__open" && (
                  <RolePickerDropdown
                    roles={roles}
                    onSelect={(roleId) => handleAddPerson(roleId)}
                    onClose={() => setAddingToRole(null)}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_140px_140px_36px] items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Team</span>
              <span />
            </div>
            {people.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                onUpdateName={(name) => handleUpdateName(person.id, name)}
                onUpdateEmail={(email) => handleUpdateEmail(person.id, email)}
                onDelete={() => handleDelete(person.id)}
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
// Person Row
// ---------------------------------------------------------------------------

interface PersonRowProps {
  person: FlatPerson;
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
    <div className="grid grid-cols-[1fr_1fr_140px_140px_36px] items-center px-4 py-2 border-t border-[var(--border-subtle)] hover:bg-[var(--bg-row-hover)] transition-colors">
      {/* Name */}
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
          className="h-6 max-w-[200px] text-[12px]"
          aria-label="Person name"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="text-[13px] text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors truncate text-left flex items-center gap-2"
        >
          <User className="h-3.5 w-3.5 text-[var(--text-quaternary)] shrink-0" />
          {person.name}
        </button>
      )}

      {/* Email */}
      <div className="flex items-center gap-1.5">
        <Mail className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" />
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
      </div>

      {/* Role */}
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] truncate">
        <Briefcase className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" />
        <span className="truncate">{person.roleName}</span>
      </div>

      {/* Team */}
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] truncate">
        <Users className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" />
        <span className="truncate">{person.teamName}</span>
      </div>

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

// ---------------------------------------------------------------------------
// Role Picker Dropdown
// ---------------------------------------------------------------------------

interface RolePickerDropdownProps {
  roles: { id: string; name: string; teamName: string }[];
  onSelect: (roleId: string) => void;
  onClose: () => void;
}

function RolePickerDropdown({ roles, onSelect, onClose }: RolePickerDropdownProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="Select a role"
      className="absolute right-0 top-full mt-1 z-50 w-64 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg py-1 max-h-60 overflow-y-auto"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        Select a role
      </div>
      {roles.map((role) => (
        <button
          key={role.id}
          role="option"
          aria-selected={false}
          onClick={() => onSelect(role.id)}
          className="w-full text-left px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-row-hover)] transition-colors flex items-center justify-between"
        >
          <span className="truncate">{role.name}</span>
          <span className="text-[11px] text-[var(--text-tertiary)] ml-2 shrink-0">
            {role.teamName}
          </span>
        </button>
      ))}
    </div>
  );
}
