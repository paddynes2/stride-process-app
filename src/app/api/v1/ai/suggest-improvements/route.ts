import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

const RATE_LIMIT_SECONDS = 300; // 5 minutes

type AISuggestionCategory = "process" | "technology" | "people" | "governance";

interface AISuggestion {
  title: string;
  description: string;
  affected_step_ids: string[];
  estimated_impact: string;
  category: AISuggestionCategory;
}

const SYSTEM_PROMPT = `You are a senior process improvement consultant analyzing a business process map. Generate specific, actionable improvement suggestions grounded in the step data provided.

Respond with a JSON object matching this exact schema:
{
  "suggestions": [
    {
      "title": "string (include quantified impact where data allows, e.g. 'Automate Invoice Processing (45min × 20/month = $1,500/month)')",
      "description": "string (2-3 sentences: what to do and why it matters)",
      "affected_step_ids": ["actual-step-uuid-1", "actual-step-uuid-2"],
      "estimated_impact": "string (e.g. 'Saves 15 hours/month, reduces error rate ~40%')",
      "category": "process|technology|people|governance"
    }
  ]
}

Rules:
- Each suggestion MUST reference actual step IDs from the process map (use the UUIDs in brackets)
- Quantify time/cost savings where step data (time_minutes, frequency_per_month) is available
- Be concrete and specific — avoid generic advice like "improve your processes"
- category meanings: process=flow/sequence/handoff improvements, technology=tool/automation, people=training/role clarity, governance=policy/approval changes
- Aim for 3-8 high-value, distinct suggestions`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id: workspaceId } = body;

  if (!workspaceId) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  // Fetch workspace — implicit RLS check + rate limit settings
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (workspaceError || !workspace) {
    return errorResponse("not_found", "Workspace not found", 404);
  }

  // Rate limit: reject if last suggestions were < 5 minutes ago
  const settings = (workspace.settings ?? {}) as Record<string, unknown>;
  const lastSuggestionsAt = settings.last_suggestions_at as string | undefined;
  if (lastSuggestionsAt) {
    const elapsedSeconds = (Date.now() - new Date(lastSuggestionsAt).getTime()) / 1000;
    if (elapsedSeconds < RATE_LIMIT_SECONDS) {
      const retryAfterSeconds = Math.ceil(RATE_LIMIT_SECONDS - elapsedSeconds);
      return NextResponse.json(
        {
          data: null,
          error: { code: "rate_limited", message: `Suggestions were generated recently. Please wait ${retryAfterSeconds} seconds before trying again.` },
          retry_after_seconds: retryAfterSeconds,
        },
        { status: 429 }
      );
    }
  }

  // Check API key — server-only, no NEXT_PUBLIC_ prefix
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "ai_not_configured",
      "AI suggestions require an OpenRouter API key. Add OPENROUTER_API_KEY to your environment variables.",
      503
    );
  }

  // Fetch steps and sections in parallel
  const [{ data: steps }, { data: sections }] = await Promise.all([
    supabase.from("steps").select("*").eq("workspace_id", workspaceId),
    supabase.from("sections").select("*").eq("workspace_id", workspaceId),
  ]);

  // No steps — return empty suggestions without calling the API
  if (!steps || steps.length === 0) {
    return successResponse([]);
  }

  // Build user prompt: group steps by section, include metrics
  const sectionMap = new Map((sections ?? []).map(s => [s.id, s.name as string]));
  const stepsBySection = new Map<string, typeof steps>();
  const unsectionedSteps: typeof steps = [];

  for (const step of steps) {
    if (step.section_id) {
      if (!stepsBySection.has(step.section_id)) {
        stepsBySection.set(step.section_id, []);
      }
      stepsBySection.get(step.section_id)!.push(step);
    } else {
      unsectionedSteps.push(step);
    }
  }

  const lines: string[] = ["# Process Map\n"];

  for (const [sectionId, sectionSteps] of stepsBySection) {
    lines.push(`## Section: ${sectionMap.get(sectionId) ?? sectionId}`);
    for (const step of sectionSteps) {
      const maturityGap =
        step.target_maturity != null && step.maturity_score != null
          ? step.target_maturity - step.maturity_score
          : null;
      const monthlyMinutes =
        step.time_minutes != null && step.frequency_per_month != null
          ? step.time_minutes * step.frequency_per_month
          : null;
      lines.push(`- [${step.id}] ${step.name}`);
      lines.push(`  Status: ${step.status}, Executor: ${step.executor}`);
      lines.push(
        `  Maturity: ${step.maturity_score ?? "N/A"}/5 (target: ${step.target_maturity ?? "N/A"}/5)${maturityGap !== null && maturityGap > 0 ? `, gap: ${maturityGap}` : ""}`
      );
      if (step.time_minutes != null) lines.push(`  Time: ${step.time_minutes} min/run`);
      if (step.frequency_per_month != null) lines.push(`  Frequency: ${step.frequency_per_month}x/month`);
      if (monthlyMinutes != null) lines.push(`  Monthly effort: ${monthlyMinutes} min/month`);
      if (step.effort_score != null) lines.push(`  Effort score: ${step.effort_score}/5`);
      if (step.impact_score != null) lines.push(`  Impact score: ${step.impact_score}/5`);
      if (step.step_type) lines.push(`  Type: ${step.step_type}`);
    }
    lines.push("");
  }

  if (unsectionedSteps.length > 0) {
    lines.push("## Unsectioned Steps");
    for (const step of unsectionedSteps) {
      const monthlyMinutes =
        step.time_minutes != null && step.frequency_per_month != null
          ? step.time_minutes * step.frequency_per_month
          : null;
      lines.push(`- [${step.id}] ${step.name} (${step.status}, executor: ${step.executor})`);
      if (step.time_minutes != null) lines.push(`  Time: ${step.time_minutes} min/run`);
      if (step.frequency_per_month != null) lines.push(`  Frequency: ${step.frequency_per_month}x/month`);
      if (monthlyMinutes != null) lines.push(`  Monthly effort: ${monthlyMinutes} min/month`);
    }
  }

  const userPrompt = lines.join("\n");

  // Call OpenRouter with DeepSeek
  const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat-v3-0324",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!openRouterRes.ok) {
    const errorText = await openRouterRes.text();
    return errorResponse("upstream_error", `OpenRouter API error: ${errorText}`, 502);
  }

  const openRouterData = await openRouterRes.json() as { choices: Array<{ message: { content: string } }> };
  const content = openRouterData.choices?.[0]?.message?.content;

  if (!content) {
    return errorResponse("upstream_error", "OpenRouter returned an empty response", 502);
  }

  let parsed: { suggestions: AISuggestion[] };
  try {
    parsed = JSON.parse(content) as { suggestions: AISuggestion[] };
  } catch {
    return errorResponse("parse_error", "Failed to parse AI response as JSON", 502);
  }

  // Store rate-limit timestamp in workspace settings (preserves other settings keys)
  const isoDate = new Date().toISOString();
  await supabase
    .from("workspaces")
    .update({
      settings: { ...settings, last_suggestions_at: isoDate },
    })
    .eq("id", workspaceId);

  return successResponse(parsed.suggestions ?? []);
}
