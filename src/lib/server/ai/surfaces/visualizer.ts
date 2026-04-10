import { formatContextWindow } from "@/lib/copilot-context";
import { buildVisualizerPrompt } from "@/lib/server/ai/prompts/visualizer";
import type { SurfaceRunner } from "@/lib/server/ai/orchestrator";
import { resolveToolResults } from "@/lib/server/ai-tools";

export const runVisualizerSurface: SurfaceRunner = async (params) => {
  const toolResults = await resolveToolResults(params.context);
  const confidence = toolResults.length >= 2 ? "medium" : "low";

  if (!params.openaiClient) {
    const answer =
      `Recommended chart: comparison view.\n\n` +
      `Why: live AI planning is unavailable, so this fallback stays generic.\n\n` +
      `Context: ${formatContextWindow(params.context)}.\n` +
      `Question: ${params.message}.`;
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

  const prompt = buildVisualizerPrompt(
    {
      audienceMode: params.audienceMode,
      taskFamily: params.taskFamily,
      terminologyAppendix: params.terminologyAppendix,
    },
    `Context: ${formatContextWindow(params.context)}
Recent conversation:
${params.transcript || "No prior turns."}
Planning request: ${params.message}
Tool results: ${JSON.stringify(toolResults).slice(0, 18000)}`,
  );

  const response = await params.openaiClient.responses.create({
    model: params.modelName,
    temperature: 0.2,
    input: prompt,
  });

  return {
    answer: response.output_text?.trim() || "No visualization plan generated.",
    confidence,
    citations: toolResults.map((tool) => tool.toolName),
    toolResults,
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  };
};
