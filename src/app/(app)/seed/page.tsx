"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  createWorkspace,
  createTab,
  createSection,
  createStep,
  updateStep,
  createConnection,
  createTeam,
  createRole,
  createPerson,
  updateRole,
  createStepRole,
  createTool,
  createToolSection,
  createStepTool,
  createStage,
  createTouchpoint,
  updateTouchpoint,
  createTouchpointConnection,
  createPerspective,
  createAnnotation,
  createComment,
  createTask,
  createRunbook,
  createColoringRule,
  createImprovementIdea,
} from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogEntry {
  message: string;
  status: "pending" | "done" | "error";
}

// ---------------------------------------------------------------------------
// Seed data constants
// ---------------------------------------------------------------------------

const WORKSPACE_NAME = "Acme Corp — Customer Onboarding";

const PROCESS_STEPS = [
  // Section 1: Lead Qualification
  { name: "Receive Inbound Lead", status: "live", executor: "automation", time_minutes: 2, frequency_per_month: 200, maturity_score: 5, target_maturity: 5, effort_score: 1, impact_score: 3 },
  { name: "Enrich Lead Data (CRM)", status: "live", executor: "ai_agent", time_minutes: 5, frequency_per_month: 200, maturity_score: 4, target_maturity: 5, effort_score: 2, impact_score: 4 },
  { name: "Score & Qualify Lead", status: "in_progress", executor: "person", time_minutes: 15, frequency_per_month: 200, maturity_score: 3, target_maturity: 5, effort_score: 3, impact_score: 5 },
  { name: "Route to Sales Rep", status: "live", executor: "automation", time_minutes: 1, frequency_per_month: 150, maturity_score: 4, target_maturity: 5, effort_score: 1, impact_score: 3 },

  // Section 2: Discovery & Proposal
  { name: "Schedule Discovery Call", status: "live", executor: "person", time_minutes: 10, frequency_per_month: 120, maturity_score: 4, target_maturity: 4, effort_score: 2, impact_score: 3 },
  { name: "Conduct Needs Assessment", status: "in_progress", executor: "person", time_minutes: 45, frequency_per_month: 100, maturity_score: 3, target_maturity: 5, effort_score: 4, impact_score: 5 },
  { name: "Draft Proposal", status: "draft", executor: "person", time_minutes: 90, frequency_per_month: 80, maturity_score: 2, target_maturity: 4, effort_score: 4, impact_score: 5 },
  { name: "Internal Review & Pricing", status: "testing", executor: "person", time_minutes: 30, frequency_per_month: 80, maturity_score: 3, target_maturity: 4, effort_score: 3, impact_score: 4 },
  { name: "Send Proposal to Client", status: "live", executor: "automation", time_minutes: 5, frequency_per_month: 80, maturity_score: 4, target_maturity: 5, effort_score: 1, impact_score: 3 },

  // Section 3: Contract & Setup
  { name: "Negotiate Terms", status: "in_progress", executor: "person", time_minutes: 60, frequency_per_month: 50, maturity_score: 2, target_maturity: 4, effort_score: 5, impact_score: 5 },
  { name: "Generate Contract (DocuSign)", status: "live", executor: "automation", time_minutes: 5, frequency_per_month: 40, maturity_score: 5, target_maturity: 5, effort_score: 1, impact_score: 3 },
  { name: "Client Signs Contract", status: "live", executor: "empty", time_minutes: 0, frequency_per_month: 40, maturity_score: 4, target_maturity: 4, effort_score: 1, impact_score: 5 },
  { name: "Provision Account", status: "testing", executor: "automation", time_minutes: 10, frequency_per_month: 40, maturity_score: 3, target_maturity: 5, effort_score: 3, impact_score: 4 },
  { name: "Assign Customer Success Manager", status: "live", executor: "person", time_minutes: 15, frequency_per_month: 40, maturity_score: 4, target_maturity: 4, effort_score: 2, impact_score: 4 },

  // Section 4: Onboarding & Training
  { name: "Send Welcome Kit", status: "live", executor: "automation", time_minutes: 5, frequency_per_month: 40, maturity_score: 5, target_maturity: 5, effort_score: 1, impact_score: 3 },
  { name: "Schedule Kickoff Meeting", status: "live", executor: "person", time_minutes: 10, frequency_per_month: 40, maturity_score: 4, target_maturity: 4, effort_score: 2, impact_score: 4 },
  { name: "Conduct Kickoff", status: "in_progress", executor: "person", time_minutes: 60, frequency_per_month: 40, maturity_score: 3, target_maturity: 5, effort_score: 4, impact_score: 5 },
  { name: "Data Migration", status: "draft", executor: "person", time_minutes: 120, frequency_per_month: 30, maturity_score: 2, target_maturity: 4, effort_score: 5, impact_score: 5 },
  { name: "Platform Training Sessions", status: "in_progress", executor: "person", time_minutes: 90, frequency_per_month: 30, maturity_score: 3, target_maturity: 5, effort_score: 4, impact_score: 5 },
  { name: "Go-Live Checklist Review", status: "draft", executor: "person", time_minutes: 30, frequency_per_month: 30, maturity_score: 2, target_maturity: 4, effort_score: 3, impact_score: 4 },
] as const;

const SECTIONS = [
  { name: "Lead Qualification", stepRange: [0, 3] as const },
  { name: "Discovery & Proposal", stepRange: [4, 8] as const },
  { name: "Contract & Setup", stepRange: [9, 13] as const },
  { name: "Onboarding & Training", stepRange: [14, 19] as const },
];

const TEAMS = [
  {
    name: "Sales",
    roles: [
      { name: "SDR (Sales Development Rep)", rate: 35, people: ["Alex Kim", "Jordan Lee"] },
      { name: "Account Executive", rate: 65, people: ["Sam Rivera", "Morgan Chen"] },
      { name: "Sales Manager", rate: 85, people: ["Taylor Brooks"] },
    ],
  },
  {
    name: "Customer Success",
    roles: [
      { name: "CSM (Customer Success Manager)", rate: 55, people: ["Casey Nguyen", "Riley Patel"] },
      { name: "Onboarding Specialist", rate: 45, people: ["Jamie Walsh", "Avery Thompson"] },
    ],
  },
  {
    name: "Operations",
    roles: [
      { name: "RevOps Analyst", rate: 50, people: ["Drew Martinez"] },
      { name: "Data Migration Engineer", rate: 70, people: ["Quinn Zhao"] },
    ],
  },
  {
    name: "Legal & Finance",
    roles: [
      { name: "Contract Specialist", rate: 60, people: ["Sage Müller"] },
    ],
  },
];

const TOOLS = [
  { name: "Salesforce CRM", vendor: "Salesforce", category: "CRM", cost: 150, status: "active" as const },
  { name: "HubSpot Marketing Hub", vendor: "HubSpot", category: "Marketing", cost: 800, status: "active" as const },
  { name: "DocuSign", vendor: "DocuSign", category: "E-Signature", cost: 45, status: "active" as const },
  { name: "Slack", vendor: "Slack", category: "Communication", cost: 12.50, status: "active" as const },
  { name: "Notion", vendor: "Notion", category: "Knowledge Base", cost: 10, status: "active" as const },
  { name: "Loom", vendor: "Loom", category: "Video", cost: 15, status: "active" as const },
  { name: "Calendly", vendor: "Calendly", category: "Scheduling", cost: 16, status: "active" as const },
  { name: "Zoom", vendor: "Zoom", category: "Video Conferencing", cost: 20, status: "active" as const },
  { name: "Stripe Billing", vendor: "Stripe", category: "Payments", cost: 0, status: "active" as const },
  { name: "Jira", vendor: "Atlassian", category: "Project Mgmt", cost: 10, status: "considering" as const },
  { name: "Intercom", vendor: "Intercom", category: "Support", cost: 74, status: "considering" as const },
  { name: "Gong", vendor: "Gong", category: "Revenue Intel", cost: 100, status: "considering" as const },
  { name: "Legacy CRM (Pipedrive)", vendor: "Pipedrive", category: "CRM", cost: 49, status: "cancelled" as const },
];

const TOOL_SECTIONS_DATA = [
  { name: "Core Sales Stack", tools: [0, 1, 6, 7] },
  { name: "Contract & Billing", tools: [2, 8] },
  { name: "Collaboration", tools: [3, 4, 5] },
  { name: "Under Evaluation", tools: [9, 10, 11] },
];

// Step index → tool indices
const STEP_TOOL_ASSIGNMENTS: Record<number, number[]> = {
  0: [1], // Receive Lead → HubSpot
  1: [0, 1], // Enrich Lead → Salesforce, HubSpot
  2: [0], // Score Lead → Salesforce
  3: [0], // Route → Salesforce
  4: [6, 7], // Schedule Discovery → Calendly, Zoom
  5: [7, 5], // Needs Assessment → Zoom, Loom
  6: [4], // Draft Proposal → Notion
  8: [0, 3], // Send Proposal → Salesforce, Slack
  10: [2], // Generate Contract → DocuSign
  12: [0], // Provision Account → Salesforce
  14: [3, 4], // Welcome Kit → Slack, Notion
  15: [6], // Schedule Kickoff → Calendly
  16: [7, 5], // Kickoff → Zoom, Loom
  18: [7, 5], // Training → Zoom, Loom
};

// Step index → role indices (flat across all teams)
const STEP_ROLE_ASSIGNMENTS: Record<number, number[]> = {
  0: [0], // SDR
  1: [0, 5], // SDR, RevOps
  2: [0, 1], // SDR, AE
  3: [5], // RevOps
  4: [1], // AE
  5: [1], // AE
  6: [1], // AE
  7: [1, 2], // AE, Sales Mgr
  8: [1], // AE
  9: [1, 7], // AE, Contract Specialist
  10: [7], // Contract Specialist
  12: [5, 6], // RevOps, Data Migration
  13: [2, 3], // Sales Mgr, CSM
  14: [4], // Onboarding Specialist
  15: [3], // CSM
  16: [3, 4], // CSM, Onboarding
  17: [6], // Data Migration
  18: [4], // Onboarding
  19: [3, 4], // CSM, Onboarding
};

const JOURNEY_STAGES = [
  { name: "Awareness", desc: "Prospect first learns about Acme", channel: "Marketing", owner: "Marketing Team" },
  { name: "Evaluation", desc: "Prospect evaluates our solution vs alternatives", channel: "Sales", owner: "Sales Team" },
  { name: "Purchase", desc: "Contract negotiation and signing", channel: "Sales + Legal", owner: "Account Executive" },
  { name: "Onboarding", desc: "First 30 days after signing", channel: "CS", owner: "CSM" },
  { name: "Adoption", desc: "Regular product usage and value realization", channel: "CS + Product", owner: "CSM" },
];

const JOURNEY_TOUCHPOINTS = [
  { stage: 0, name: "Visit Website", sentiment: "positive", pain: 1, gain: 3, emotion: "Curious" },
  { stage: 0, name: "Read Case Study", sentiment: "positive", pain: 1, gain: 4, emotion: "Interested" },
  { stage: 0, name: "Download Whitepaper", sentiment: "neutral", pain: 2, gain: 3, emotion: "Evaluating" },
  { stage: 1, name: "First Sales Call", sentiment: "positive", pain: 2, gain: 4, emotion: "Hopeful" },
  { stage: 1, name: "Product Demo", sentiment: "positive", pain: 1, gain: 5, emotion: "Excited" },
  { stage: 1, name: "Pricing Discussion", sentiment: "negative", pain: 4, gain: 3, emotion: "Anxious about cost" },
  { stage: 1, name: "Reference Check", sentiment: "positive", pain: 2, gain: 4, emotion: "Reassured" },
  { stage: 2, name: "Contract Review", sentiment: "negative", pain: 4, gain: 2, emotion: "Frustrated by legal" },
  { stage: 2, name: "Sign Contract", sentiment: "positive", pain: 1, gain: 5, emotion: "Committed" },
  { stage: 3, name: "Welcome Email", sentiment: "positive", pain: 1, gain: 3, emotion: "Excited to start" },
  { stage: 3, name: "Kickoff Call", sentiment: "positive", pain: 2, gain: 4, emotion: "Motivated" },
  { stage: 3, name: "Data Migration", sentiment: "negative", pain: 5, gain: 3, emotion: "Overwhelmed" },
  { stage: 3, name: "First Training Session", sentiment: "neutral", pain: 3, gain: 4, emotion: "Learning curve" },
  { stage: 4, name: "First Solo Usage", sentiment: "neutral", pain: 3, gain: 3, emotion: "Uncertain" },
  { stage: 4, name: "Achieve First Milestone", sentiment: "positive", pain: 1, gain: 5, emotion: "Accomplished!" },
  { stage: 4, name: "Monthly Business Review", sentiment: "positive", pain: 2, gain: 4, emotion: "Confident" },
] as const;

const PERSPECTIVES = [
  { name: "Leadership", color: "#3B82F6" },
  { name: "Frontline Sales", color: "#F59E0B" },
  { name: "Customer Voice", color: "#10B981" },
];

const COMMENTS = [
  { stepIdx: 2, content: "This step takes way too long. We need automated lead scoring.", category: "pain_point" as const },
  { stepIdx: 2, content: "Decision: implement ML-based lead scoring by Q3.", category: "decision" as const },
  { stepIdx: 6, content: "Proposal templates would save 50% of time here.", category: "idea" as const },
  { stepIdx: 9, content: "Legal review bottleneck — average 8 business days.", category: "pain_point" as const },
  { stepIdx: 17, content: "Data migration is our #1 customer complaint.", category: "pain_point" as const },
  { stepIdx: 17, content: "Idea: Build a self-service import wizard.", category: "idea" as const },
  { stepIdx: 18, content: "Note: New hires need to shadow 3 sessions before leading.", category: "note" as const },
  { stepIdx: 13, content: "Question: Should CSM assignment be based on industry vertical or account size?", category: "question" as const },
];

const IMPROVEMENT_IDEAS = [
  { title: "Automate Lead Scoring with ML", desc: "Replace manual lead scoring with predictive model. Estimated 15 min/lead saved × 200/month = 50 hours/month.", priority: "critical" as const, status: "approved" as const, stepIdx: 2 },
  { title: "Build Proposal Template Library", desc: "Pre-built templates by industry vertical. Could cut proposal time from 90min to 30min.", priority: "high" as const, status: "in_progress" as const, stepIdx: 6 },
  { title: "Self-Service Data Migration Tool", desc: "Customer-facing import wizard to reduce migration engineering time by 70%.", priority: "high" as const, status: "proposed" as const, stepIdx: 17 },
  { title: "Contract Automation with AI Review", desc: "AI-powered contract clause review to accelerate legal turnaround from 8 days to 2.", priority: "critical" as const, status: "proposed" as const, stepIdx: 9 },
  { title: "Video Onboarding Library", desc: "Replace live training with async video library. Scale onboarding without adding headcount.", priority: "medium" as const, status: "approved" as const, stepIdx: 18 },
  { title: "Integrate Gong for Call Intelligence", desc: "Auto-capture discovery call insights, surface risks, and coach reps.", priority: "medium" as const, status: "proposed" as const, stepIdx: 5 },
  { title: "Consolidate CRM to Salesforce", desc: "Retire Pipedrive and migrate remaining legacy accounts. $588/yr savings.", priority: "low" as const, status: "completed" as const, stepIdx: null },
  { title: "Add NPS Survey at Day 30", desc: "Automated NPS touchpoint 30 days post-onboarding to catch early churn signals.", priority: "medium" as const, status: "proposed" as const, stepIdx: null },
];

const COLORING_RULES = [
  { name: "Draft steps", color: "#F59E0B", criteria_type: "status" as const, criteria_value: "draft" },
  { name: "Automated steps", color: "#3B82F6", criteria_type: "executor" as const, criteria_value: "automation" },
  { name: "AI-powered steps", color: "#8B5CF6", criteria_type: "executor" as const, criteria_value: "ai_agent" },
  { name: "Low maturity (<3)", color: "#EF4444", criteria_type: "maturity_below" as const, criteria_value: "3" },
];

// ---------------------------------------------------------------------------
// Seed Page Component
// ---------------------------------------------------------------------------

export default function SeedPage() {
  const router = useRouter();
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);

  function log(message: string, status: LogEntry["status"] = "pending") {
    setLogs((prev) => [...prev, { message, status }]);
  }

  function updateLastLog(status: LogEntry["status"]) {
    setLogs((prev) => {
      const copy = [...prev];
      if (copy.length > 0) copy[copy.length - 1].status = status;
      return copy;
    });
  }

  async function runSeed() {
    setRunning(true);
    setLogs([]);

    try {
      // =====================================================================
      // 1. Create workspace
      // =====================================================================
      log("Creating workspace...");
      const ws = await createWorkspace({ name: WORKSPACE_NAME });
      setWorkspaceId(ws.id);
      updateLastLog("done");

      // =====================================================================
      // 2. Create process tab (first tab created by bootstrap_workspace)
      // We need to fetch tabs — the workspace should have a default tab
      // =====================================================================
      log("Creating process tab...");
      const processTab = await createTab({ workspace_id: ws.id, name: "Customer Onboarding Flow", canvas_type: "process" });
      updateLastLog("done");

      // =====================================================================
      // 3. Create sections
      // =====================================================================
      log("Creating 4 process sections...");
      const sectionIds: string[] = [];
      for (let i = 0; i < SECTIONS.length; i++) {
        const s = SECTIONS[i];
        const sec = await createSection({
          workspace_id: ws.id,
          tab_id: processTab.id,
          name: s.name,
          position_x: 50,
          position_y: 50 + i * 350,
        });
        // Make sections wider
        await fetch(`/api/v1/sections/${sec.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ width: 1400, height: 280, summary: `${s.name} — ${s.stepRange[1] - s.stepRange[0] + 1} steps` }),
        });
        sectionIds.push(sec.id);
      }
      updateLastLog("done");

      // =====================================================================
      // 4. Create steps
      // =====================================================================
      log("Creating 20 process steps with scores...");
      const stepIds: string[] = [];
      for (let i = 0; i < PROCESS_STEPS.length; i++) {
        const ps = PROCESS_STEPS[i];
        const sectionIdx = SECTIONS.findIndex((s) => i >= s.stepRange[0] && i <= s.stepRange[1]);
        const localIdx = i - SECTIONS[sectionIdx].stepRange[0];

        const step = await createStep({
          workspace_id: ws.id,
          tab_id: processTab.id,
          section_id: sectionIds[sectionIdx],
          name: ps.name,
          position_x: 80 + localIdx * 260,
          position_y: 80,
        });
        await updateStep(step.id, {
          status: ps.status as "draft" | "in_progress" | "testing" | "live" | "archived",
          executor: ps.executor as "person" | "automation" | "ai_agent" | "empty",
          time_minutes: ps.time_minutes,
          frequency_per_month: ps.frequency_per_month,
          maturity_score: ps.maturity_score,
          target_maturity: ps.target_maturity,
          effort_score: ps.effort_score,
          impact_score: ps.impact_score,
          notes: i === 17 ? "<p>Data migration is the most time-consuming step in our onboarding process. Currently requires a dedicated engineer for each client. We need to build a self-service tool.</p>" : undefined,
        });
        stepIds.push(step.id);
      }
      updateLastLog("done");

      // =====================================================================
      // 5. Create connections (linear flow within each section + cross-section)
      // =====================================================================
      log("Creating connections...");
      for (const sec of SECTIONS) {
        for (let i = sec.stepRange[0]; i < sec.stepRange[1]; i++) {
          await createConnection({
            workspace_id: ws.id,
            tab_id: processTab.id,
            source_step_id: stepIds[i],
            target_step_id: stepIds[i + 1],
          });
        }
      }
      // Cross-section: last step of section → first step of next section
      for (let s = 0; s < SECTIONS.length - 1; s++) {
        await createConnection({
          workspace_id: ws.id,
          tab_id: processTab.id,
          source_step_id: stepIds[SECTIONS[s].stepRange[1]],
          target_step_id: stepIds[SECTIONS[s + 1].stepRange[0]],
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 6. Create teams, roles, people
      // =====================================================================
      log("Creating 4 teams, 8 roles, 11 people...");
      const allRoleIds: string[] = [];
      for (const teamData of TEAMS) {
        const team = await createTeam({ workspace_id: ws.id, name: teamData.name });
        for (const roleData of teamData.roles) {
          const role = await createRole({ team_id: team.id, name: roleData.name });
          await updateRole(role.id, { hourly_rate: roleData.rate });
          allRoleIds.push(role.id);
          for (const personName of roleData.people) {
            await createPerson({ role_id: role.id, name: personName, email: `${personName.toLowerCase().replace(/\s+/g, ".")}@acme.com` });
          }
        }
      }
      updateLastLog("done");

      // =====================================================================
      // 7. Assign roles to steps
      // =====================================================================
      log("Assigning roles to steps...");
      for (const [stepIdxStr, roleIndices] of Object.entries(STEP_ROLE_ASSIGNMENTS)) {
        const stepIdx = Number(stepIdxStr);
        for (const roleIdx of roleIndices) {
          await createStepRole({ step_id: stepIds[stepIdx], role_id: allRoleIds[roleIdx] });
        }
      }
      updateLastLog("done");

      // =====================================================================
      // 8. Create tools
      // =====================================================================
      log("Creating 13 tools across 4 categories...");
      const toolIds: string[] = [];
      for (let i = 0; i < TOOLS.length; i++) {
        const t = TOOLS[i];
        const tool = await createTool({
          workspace_id: ws.id,
          name: t.name,
          vendor: t.vendor,
          category: t.category,
          cost_per_month: t.cost,
          status: t.status,
          position_x: 100 + (i % 4) * 220,
          position_y: 100 + Math.floor(i / 4) * 180,
        });
        toolIds.push(tool.id);
      }
      updateLastLog("done");

      // =====================================================================
      // 9. Create tool sections
      // =====================================================================
      log("Creating 4 tool sections...");
      for (let i = 0; i < TOOL_SECTIONS_DATA.length; i++) {
        const ts = TOOL_SECTIONS_DATA[i];
        await createToolSection({
          workspace_id: ws.id,
          name: ts.name,
          position_x: 50 + (i % 2) * 550,
          position_y: 50 + Math.floor(i / 2) * 450,
          width: 500,
          height: 380,
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 10. Assign tools to steps
      // =====================================================================
      log("Assigning tools to steps...");
      for (const [stepIdxStr, toolIndices] of Object.entries(STEP_TOOL_ASSIGNMENTS)) {
        const stepIdx = Number(stepIdxStr);
        for (const toolIdx of toolIndices) {
          await createStepTool({ step_id: stepIds[stepIdx], tool_id: toolIds[toolIdx] });
        }
      }
      updateLastLog("done");

      // =====================================================================
      // 11. Create journey tab with stages and touchpoints
      // =====================================================================
      log("Creating journey canvas with 5 stages and 16 touchpoints...");
      const journeyTab = await createTab({ workspace_id: ws.id, name: "Customer Journey", canvas_type: "journey" });
      const stageIds: string[] = [];
      for (let i = 0; i < JOURNEY_STAGES.length; i++) {
        const js = JOURNEY_STAGES[i];
        const stage = await createStage({
          workspace_id: ws.id,
          tab_id: journeyTab.id,
          name: js.name,
          position_x: 50 + i * 400,
          position_y: 50,
          width: 360,
          height: 600,
        });
        // Update description
        await fetch(`/api/v1/stages/${stage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: js.desc, channel: js.channel, owner: js.owner }),
        });
        stageIds.push(stage.id);
      }

      const touchpointIds: string[] = [];
      for (let i = 0; i < JOURNEY_TOUCHPOINTS.length; i++) {
        const tp = JOURNEY_TOUCHPOINTS[i];
        const stageIdx = tp.stage;
        // Count touchpoints already in this stage for Y positioning
        const countInStage = JOURNEY_TOUCHPOINTS.slice(0, i).filter((t) => t.stage === stageIdx).length;
        const touchpoint = await createTouchpoint({
          workspace_id: ws.id,
          tab_id: journeyTab.id,
          stage_id: stageIds[stageIdx],
          name: tp.name,
          position_x: 40,
          position_y: 80 + countInStage * 130,
        });
        await updateTouchpoint(touchpoint.id, {
          sentiment: tp.sentiment as "positive" | "neutral" | "negative",
          pain_score: tp.pain,
          gain_score: tp.gain,
          customer_emotion: tp.emotion,
          effort_score: Math.min(5, Math.ceil(tp.pain * 1.2)),
          impact_score: Math.min(5, tp.gain),
        });
        touchpointIds.push(touchpoint.id);
      }

      // Connect touchpoints sequentially
      for (let i = 0; i < touchpointIds.length - 1; i++) {
        await createTouchpointConnection({
          workspace_id: ws.id,
          tab_id: journeyTab.id,
          source_touchpoint_id: touchpointIds[i],
          target_touchpoint_id: touchpointIds[i + 1],
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 12. Create perspectives + annotations
      // =====================================================================
      log("Creating 3 perspectives with annotations...");
      const perspectiveIds: string[] = [];
      for (const p of PERSPECTIVES) {
        const persp = await createPerspective({ workspace_id: ws.id, name: p.name, color: p.color });
        perspectiveIds.push(persp.id);
      }

      // Leadership annotations on key steps
      const leadershipAnnotations = [
        { stepIdx: 2, content: "Critical bottleneck. Must automate by Q3.", rating: 2 },
        { stepIdx: 6, content: "Proposal quality is inconsistent across reps.", rating: 3 },
        { stepIdx: 9, content: "Legal review is our biggest time sink.", rating: 1 },
        { stepIdx: 17, content: "Data migration failures cause 40% of churn.", rating: 1 },
        { stepIdx: 18, content: "Training is good but doesn't scale.", rating: 3 },
      ];
      for (const ann of leadershipAnnotations) {
        await createAnnotation({ perspective_id: perspectiveIds[0], annotatable_type: "step", annotatable_id: stepIds[ann.stepIdx], content: ann.content, rating: ann.rating });
      }

      // Frontline Sales annotations
      const frontlineAnnotations = [
        { stepIdx: 2, content: "Manual scoring works fine for me. I know my territory.", rating: 4 },
        { stepIdx: 6, content: "I spend way too much time on proposals.", rating: 2 },
        { stepIdx: 9, content: "Legal never responds in time. I lose deals.", rating: 1 },
        { stepIdx: 5, content: "Discovery calls are where I add the most value.", rating: 5 },
        { stepIdx: 13, content: "CSM handoff is smooth. No complaints.", rating: 4 },
      ];
      for (const ann of frontlineAnnotations) {
        await createAnnotation({ perspective_id: perspectiveIds[1], annotatable_type: "step", annotatable_id: stepIds[ann.stepIdx], content: ann.content, rating: ann.rating });
      }

      // Customer Voice annotations on touchpoints
      const customerAnnotations = [
        { tpIdx: 4, content: "Demo was excellent. Very relevant to our use case.", rating: 5 },
        { tpIdx: 5, content: "Pricing felt opaque. Had to ask many questions.", rating: 2 },
        { tpIdx: 7, content: "Contract process was painful. Too many rounds.", rating: 1 },
        { tpIdx: 11, content: "Data migration was a nightmare. Took 3 weeks.", rating: 1 },
        { tpIdx: 14, content: "When we hit our first milestone, it all clicked.", rating: 5 },
      ];
      for (const ann of customerAnnotations) {
        await createAnnotation({ perspective_id: perspectiveIds[2], annotatable_type: "touchpoint", annotatable_id: touchpointIds[ann.tpIdx], content: ann.content, rating: ann.rating });
      }
      updateLastLog("done");

      // =====================================================================
      // 13. Create comments
      // =====================================================================
      log("Creating 8 comments across steps...");
      for (const c of COMMENTS) {
        await createComment({
          workspace_id: ws.id,
          commentable_type: "step",
          commentable_id: stepIds[c.stepIdx],
          content: c.content,
          category: c.category,
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 14. Create tasks on key steps
      // =====================================================================
      log("Creating tasks on key steps...");
      const taskSets: Array<{ stepIdx: number; tasks: string[] }> = [
        { stepIdx: 2, tasks: ["Define scoring criteria", "Evaluate ML vendors", "Build scoring model", "A/B test old vs new", "Roll out to all reps"] },
        { stepIdx: 6, tasks: ["Audit existing proposals", "Identify top 5 templates", "Build template library", "Train sales team"] },
        { stepIdx: 17, tasks: ["Document current migration process", "Design import wizard UI", "Build CSV parser", "Add validation rules", "Beta test with 3 clients", "Launch self-service migration"] },
      ];
      for (const ts of taskSets) {
        for (const title of ts.tasks) {
          await createTask({ workspace_id: ws.id, step_id: stepIds[ts.stepIdx], title });
        }
      }
      updateLastLog("done");

      // =====================================================================
      // 15. Create a runbook from the Contract & Setup section
      // =====================================================================
      log("Creating runbook from Contract & Setup section...");
      await createRunbook({ workspace_id: ws.id, section_id: sectionIds[2], name: "Acme Corp — Contract & Setup Runbook" });
      updateLastLog("done");

      // =====================================================================
      // 16. Create coloring rules
      // =====================================================================
      log("Creating 4 coloring rules...");
      for (let i = 0; i < COLORING_RULES.length; i++) {
        const cr = COLORING_RULES[i];
        await createColoringRule({
          workspace_id: ws.id,
          name: cr.name,
          color: cr.color,
          criteria_type: cr.criteria_type,
          criteria_value: cr.criteria_value,
          is_active: true,
          position: i,
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 17. Create improvement ideas
      // =====================================================================
      log("Creating 8 improvement ideas...");
      for (const idea of IMPROVEMENT_IDEAS) {
        await createImprovementIdea({
          workspace_id: ws.id,
          title: idea.title,
          description: idea.desc,
          priority: idea.priority,
          status: idea.status,
          linked_step_id: idea.stepIdx !== null ? stepIds[idea.stepIdx] : null,
        });
      }
      updateLastLog("done");

      log("Seed complete! Redirecting...", "done");
      setDone(true);

      // Redirect after a brief pause
      setTimeout(() => {
        router.push(`/w/${ws.id}/${processTab.id}`);
      }, 2000);
    } catch (err) {
      updateLastLog("error");
      log(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-8">
      <div className="w-full max-w-lg">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)] mb-2">
          Seed Demo Workspace
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mb-6">
          Creates a fully populated &ldquo;Acme Corp — Customer Onboarding&rdquo; workspace with
          20 process steps, 16 journey touchpoints, 4 teams, 13 tools, perspectives, comments,
          tasks, a runbook, coloring rules, and improvement ideas.
        </p>

        {!running && !done && (
          <button
            onClick={runSeed}
            className="px-6 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent-blue)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Create Demo Workspace
          </button>
        )}

        {logs.length > 0 && (
          <div className="mt-6 space-y-1.5 max-h-[400px] overflow-y-auto">
            {logs.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                {entry.status === "pending" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-blue)]" />
                ) : entry.status === "done" ? (
                  <span className="text-green-400">✓</span>
                ) : (
                  <span className="text-red-400">✗</span>
                )}
                <span
                  className={
                    entry.status === "error"
                      ? "text-red-400"
                      : entry.status === "done"
                        ? "text-[var(--text-secondary)]"
                        : "text-[var(--text-primary)]"
                  }
                >
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {done && workspaceId && (
          <p className="mt-4 text-[12px] text-[var(--text-tertiary)]">
            Redirecting to workspace...
          </p>
        )}
      </div>
    </div>
  );
}
