import { formatContextWindow } from "@/lib/copilot-context";
import { buildResponsesInput } from "@/lib/server/ai/prompts/base";
import { buildCopilotPromptMessages } from "@/lib/server/ai/prompts/copilot";
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
