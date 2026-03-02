import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";
import type { AIAnalysisResult } from "@/types/database";

const RATE_LIMIT_SECONDS = 300; // 5 minutes

const SYSTEM_PROMPT = `You are a senior process optimization consultant analyzing a business process map. Identify bottlenecks, redundancies, automation opportunities, and maturity improvement recommendations based on the step metrics provided.

Respond with a JSON object matching this exact schema:
{
  "bottlenecks": [{ "title": string, "description": string, "severity": "high"|"medium"|"low", "affected_step_ids": string[] }],
  "redundancies": [{ "title": string, "description": string, "severity": "high"|"medium"|"low", "affected_step_ids": string[] }],
  "automation_candidates": [{ "title": string, "description": string, "severity": "high"|"medium"|"low", "affected_step_ids": string[] }],
  "maturity_recommendations": [{ "title": string, "description": string, "severity": "high"|"medium"|"low", "affected_step_ids": string[] }]
}`;

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

  // Rate limit: reject if last analysis was < 5 minutes ago
  const settings = (workspace.settings ?? {}) as Record<string, unknown>;
  const lastAnalysisAt = settings.last_analysis_at as string | undefined;
  if (lastAnalysisAt) {
    const elapsedSeconds = (Date.now() - new Date(lastAnalysisAt).getTime()) / 1000;
    if (elapsedSeconds < RATE_LIMIT_SECONDS) {
      const retryAfterSeconds = Math.ceil(RATE_LIMIT_SECONDS - elapsedSeconds);
      return NextResponse.json(
        {
          data: null,
          error: { code: "rate_limited", message: `Analysis was run recently. Please wait ${retryAfterSeconds} seconds before trying again.` },
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
      "AI analysis requires an OpenRouter API key. Add OPENROUTER_API_KEY to your environment variables.",
      503
    );
  }

  // Fetch steps and sections in parallel
  const [{ data: steps }, { data: sections }] = await Promise.all([
    supabase.from("steps").select("*").eq("workspace_id", workspaceId),
    supabase.from("sections").select("*").eq("workspace_id", workspaceId),
  ]);

  // No steps — return empty analysis without calling the API
  if (!steps || steps.length === 0) {
    const emptyResult: AIAnalysisResult = {
      bottlenecks: [],
      redundancies: [],
      automation_candidates: [],
      maturity_recommendations: [],
    };
    return successResponse(emptyResult);
  }

  // Build user prompt: group steps by section
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
      lines.push(`- [${step.id}] ${step.name}`);
      lines.push(`  Status: ${step.status}, Executor: ${step.executor}`);
      lines.push(
        `  Maturity: ${step.maturity_score ?? "N/A"}/5 (target: ${step.target_maturity ?? "N/A"}/5)${maturityGap !== null && maturityGap > 0 ? `, gap: ${maturityGap}` : ""}`
      );
      if (step.time_minutes != null) lines.push(`  Time: ${step.time_minutes} min/run`);
      if (step.frequency_per_month != null) lines.push(`  Frequency: ${step.frequency_per_month}x/month`);
      if (step.effort_score != null) lines.push(`  Effort: ${step.effort_score}/5`);
      if (step.impact_score != null) lines.push(`  Impact: ${step.impact_score}/5`);
      if (step.step_type) lines.push(`  Type: ${step.step_type}`);
    }
    lines.push("");
  }

  if (unsectionedSteps.length > 0) {
    lines.push("## Unsectioned Steps");
    for (const step of unsectionedSteps) {
      lines.push(`- [${step.id}] ${step.name} (${step.status}, executor: ${step.executor})`);
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

  let result: AIAnalysisResult;
  try {
    result = JSON.parse(content) as AIAnalysisResult;
  } catch {
    return errorResponse("parse_error", "Failed to parse AI response as JSON", 502);
  }

  // Cache result in workspace settings (preserves other settings keys)
  const isoDate = new Date().toISOString();
  await supabase
    .from("workspaces")
    .update({
      settings: { ...settings, last_analysis: result, last_analysis_at: isoDate },
    })
    .eq("id", workspaceId);

  // Fire-and-forget activity log
  void logActivity({
    supabase,
    workspace_id: workspaceId,
    user_id: user.id,
    action: "created",
    entity_type: "ai_analysis",
    entity_id: workspaceId,
    entity_name: workspace.name,
  });

  return successResponse(result);
}
