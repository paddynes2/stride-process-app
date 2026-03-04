import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

const RATE_LIMIT_SECONDS = 300; // 5 minutes

const SYSTEM_PROMPT = `You are a senior management consultant writing an executive gap analysis summary. Your writing is precise, data-driven, and action-oriented — the kind of narrative that would appear in a McKinsey or BCG process improvement report.

Write 2–4 paragraphs that synthesize the gap analysis data into a professional narrative. Cover:
1. Overall maturity posture and headline finding
2. The most critical gaps by section and severity
3. Strategic implications and recommended focus areas
4. A closing statement on expected impact if gaps are addressed

Do not use bullet points. Write in flowing prose. Be specific — reference actual step names, section names, and gap sizes from the data provided.`;

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

  // Rate limit: reject if last narrative was < 5 minutes ago
  const settings = (workspace.settings ?? {}) as Record<string, unknown>;
  const lastNarrativeAt = settings.last_gap_narrative_at as string | undefined;
  if (lastNarrativeAt) {
    const elapsedSeconds = (Date.now() - new Date(lastNarrativeAt).getTime()) / 1000;
    if (elapsedSeconds < RATE_LIMIT_SECONDS) {
      const retryAfterSeconds = Math.ceil(RATE_LIMIT_SECONDS - elapsedSeconds);
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "rate_limited",
            message: `Narrative was generated recently. Please wait ${retryAfterSeconds} seconds before trying again.`,
          },
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

  // Only steps with both current and target maturity set
  const gapSteps = (steps ?? []).filter(
    (s) => s.maturity_score != null && s.target_maturity != null
  );

  if (gapSteps.length === 0) {
    return successResponse(
      "No gap data is available yet. Set current and target maturity scores on your process steps to enable gap narrative generation."
    );
  }

  // Build prompt: group steps by section with gap data
  const sectionMap = new Map((sections ?? []).map((s) => [s.id, s.name as string]));
  const stepsBySection = new Map<string, typeof gapSteps>();
  const unsectionedSteps: typeof gapSteps = [];

  for (const step of gapSteps) {
    if (step.section_id) {
      if (!stepsBySection.has(step.section_id)) {
        stepsBySection.set(step.section_id, []);
      }
      stepsBySection.get(step.section_id)!.push(step);
    } else {
      unsectionedSteps.push(step);
    }
  }

  const totalGap = gapSteps.reduce(
    (sum, s) => sum + (s.target_maturity! - s.maturity_score!),
    0
  );
  const avgGap = totalGap / gapSteps.length;
  const stepsWithGap = gapSteps.filter(
    (s) => s.target_maturity! - s.maturity_score! > 0
  ).length;

  const lines: string[] = [
    `# Gap Analysis Data for ${workspace.name}`,
    ``,
    `## Summary Statistics`,
    `- Total steps with maturity scores: ${gapSteps.length}`,
    `- Steps below target maturity: ${stepsWithGap}`,
    `- Average gap: ${avgGap.toFixed(2)}`,
    ``,
    `## Steps by Section`,
    ``,
  ];

  for (const [sectionId, sectionSteps] of stepsBySection) {
    lines.push(`### Section: ${sectionMap.get(sectionId) ?? sectionId}`);
    for (const step of sectionSteps) {
      const gap = step.target_maturity! - step.maturity_score!;
      lines.push(
        `- ${step.name}: current maturity ${step.maturity_score}/5, target ${step.target_maturity}/5, gap ${gap > 0 ? `+${gap}` : gap}`
      );
    }
    lines.push("");
  }

  if (unsectionedSteps.length > 0) {
    lines.push("### Unsectioned Steps");
    for (const step of unsectionedSteps) {
      const gap = step.target_maturity! - step.maturity_score!;
      lines.push(
        `- ${step.name}: current maturity ${step.maturity_score}/5, target ${step.target_maturity}/5, gap ${gap > 0 ? `+${gap}` : gap}`
      );
    }
  }

  const userPrompt = lines.join("\n");

  // Call OpenRouter with DeepSeek — no response_format (natural text prose)
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
    }),
  });

  if (!openRouterRes.ok) {
    const errorText = await openRouterRes.text();
    return errorResponse("upstream_error", `OpenRouter API error: ${errorText}`, 502);
  }

  const openRouterData = await openRouterRes.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const narrative = openRouterData.choices?.[0]?.message?.content;

  if (!narrative) {
    return errorResponse("upstream_error", "OpenRouter returned an empty response", 502);
  }

  // Store rate-limit timestamp in workspace settings (preserves other settings keys)
  const isoDate = new Date().toISOString();
  await supabase
    .from("workspaces")
    .update({
      settings: { ...settings, last_gap_narrative_at: isoDate },
    })
    .eq("id", workspaceId);

  return successResponse(narrative);
}
