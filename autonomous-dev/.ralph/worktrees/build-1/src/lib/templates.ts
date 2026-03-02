import type { TemplateData } from "@/types/database";

export interface StarterTemplate {
  name: string;
  description: string;
  category: string;
  template_data: TemplateData;
}

const STEP_SPACING = 200;
const STEP_Y = 60;

function makeSteps(names: string[]): TemplateData["steps"] {
  return names.map((name, i) => ({
    name,
    position_x: 50 + i * STEP_SPACING,
    position_y: STEP_Y,
  }));
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: "Customer Onboarding",
    description: "Standard onboarding flow for new customers",
    category: "Customer Success",
    template_data: {
      section: { name: "Customer Onboarding" },
      steps: makeSteps([
        "Send welcome email",
        "Schedule kickoff call",
        "Provide access credentials",
        "Complete product training",
        "Confirm go-live readiness",
      ]),
      connections: [],
      step_roles: [],
    },
  },
  {
    name: "Support Ticket",
    description: "Process for handling incoming support requests",
    category: "Support",
    template_data: {
      section: { name: "Support Ticket" },
      steps: makeSteps([
        "Receive ticket",
        "Triage and categorize",
        "Investigate issue",
        "Resolve or escalate",
        "Close and follow up",
      ]),
      connections: [],
      step_roles: [],
    },
  },
  {
    name: "Content Creation",
    description: "Workflow for producing and publishing content",
    category: "Marketing",
    template_data: {
      section: { name: "Content Creation" },
      steps: makeSteps([
        "Ideation and brief",
        "Research and outline",
        "Draft content",
        "Review and edit",
        "Publish and distribute",
      ]),
      connections: [],
      step_roles: [],
    },
  },
  {
    name: "Lead Nurturing",
    description: "Sequence for moving leads through the sales funnel",
    category: "Sales",
    template_data: {
      section: { name: "Lead Nurturing" },
      steps: makeSteps([
        "Qualify lead",
        "Send initial outreach",
        "Follow up with resources",
        "Schedule discovery call",
        "Move to opportunity",
      ]),
      connections: [],
      step_roles: [],
    },
  },
];
