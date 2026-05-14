import { formatContextWindow } from "@/lib/copilot-context";
import { buildResponsesInput } from "@/lib/server/ai/prompts/base";
import { buildCopilotPromptMessages } from "@/lib/server/ai/prompts/copilot";
import type { SurfaceRunner } from "@/lib/server/ai/orchestrator";
import { resolveToolResults } from "@/lib/server/ai-tools";

function selectGlobalCopilotTools(message: string, context: Parameters<typeof resolveToolResults>[0]) {
  if (context && context.scope !== "global") return undefined;

  const normalized = message.toLowerCase();
  const preferredToolNames = new Set<string>();
  const mentionsLiveSlate = /\b(today|tonight|live|current|right now|in progress|slate|game|games|score|inning)\b/.test(
    normalized,
  );
  const mentionsTeamSignal =
    /\b(team|teams|club|clubs|leader|leaders|most|least|challenge|challenges|overturn|overturns|surplus|usage|selective|low-value|high-value)\b/.test(
      normalized,
    );
  const mentionsUmpireSignal = /\b(umpire|umpires|official|officials|plate|watch|risk|zone)\b/.test(normalized);
  const mentionsMomentSignal = /\b(moment|moments|call|calls|pitch|pitches|overturned|confirmed|recent|latest|controversial|borderline|trend|trends|story|signal)\b/.test(
    normalized,
  );

  if (mentionsLiveSlate) preferredToolNames.add("get_live_games");
  if (mentionsMomentSignal || mentionsLiveSlate) preferredToolNames.add("get_home_challenge_moments");
  if (mentionsTeamSignal) preferredToolNames.add("get_home_team_leaderboard");
  if (mentionsUmpireSignal) preferredToolNames.add("get_home_umpire_leaderboard");

  return preferredToolNames.size > 0 ? [...preferredToolNames] : undefined;
}

export const runCopilotSurface: SurfaceRunner = async (params) => {
  const toolResults = await resolveToolResults(params.context, {
    preferredToolNames: selectGlobalCopilotTools(params.message, params.context),
  });
  const confidence = toolResults.length >= 3 ? "high" : "medium";

  if (!params.openaiClient) {
    const answer = `Scope: ${formatContextWindow(params.context)}. Question: ${params.message}. I found ${toolResults.length} baseball data sources for this context, but live AI synthesis is unavailable because OPENAI_API_KEY is not configured.`;
    return {
      answer,
      confidence,
      citations: toolResults.map((tool) => tool.toolName),
      toolResults,
      usage: {
        inputTokens: Math.ceil(params.message.length / 4),
        outputTokens: Math.ceil(answer.length / 4),
      },
      trace: {
        provider: "template",
        modelName: "local_fallback",
        requestEnvelope: {
          surface: params.surface,
          message: params.message,
          context: params.context ?? null,
          toolNames: toolResults.map((tool) => tool.toolName),
        },
        responseEnvelope: {
          finalAnswer: answer,
          source: "openai_unavailable_fallback",
        },
      },
    };
  }

  const promptMessages = buildCopilotPromptMessages(
    {
      audienceMode: params.audienceMode,
      taskFamily: params.taskFamily,
      terminologyAppendix: params.terminologyAppendix,
    },
    `Context: ${formatContextWindow(params.context)}
Recent conversation:
${params.transcript || "No prior turns."}
User question: ${params.message}
Tool results: ${JSON.stringify(toolResults).slice(0, 18000)}`,
  );

  const input = buildResponsesInput(promptMessages);
  const response = await params.openaiClient.responses.create({
    model: params.modelName,
    temperature: 0.2,
    input,
  });
  const rawOutputText = response.output_text?.trim() || "";

  return {
    answer: rawOutputText || "No answer generated.",
    confidence,
    citations: toolResults.map((tool) => tool.toolName),
    toolResults,
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
    trace: {
      provider: "openai",
      modelName: params.modelName,
      requestEnvelope: {
        input,
        temperature: 0.2,
      },
      responseEnvelope: {
        responseId: response.id ?? null,
        status: response.status ?? null,
        rawOutputText,
        usage: response.usage ?? null,
      },
    },
  };
};
