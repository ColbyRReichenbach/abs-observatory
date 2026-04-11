import { formatContextWindow } from "@/lib/copilot-context";
import { buildCopilotPrompt } from "@/lib/server/ai/prompts/copilot";
import type { SurfaceRunner } from "@/lib/server/ai/orchestrator";
import { resolveToolResults } from "@/lib/server/ai-tools";

export const runCopilotSurface: SurfaceRunner = async (params) => {
  const toolResults = await resolveToolResults(params.context);
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
    };
  }

  const prompt = buildCopilotPrompt(
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

  const response = await params.openaiClient.responses.create({
    model: params.modelName,
    temperature: 0.2,
    input: prompt,
  });

  return {
    answer: response.output_text?.trim() || "No answer generated.",
    confidence,
    citations: toolResults.map((tool) => tool.toolName),
    toolResults,
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  };
};
