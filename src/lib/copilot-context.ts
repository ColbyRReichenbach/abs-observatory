export type CopilotContext = {
  scope: "global" | "game" | "team" | "umpire";
  entityId?: string;
  range?: string;
  gameStatus?: string;
};

export function inferCopilotContext(pathname: string, searchParams?: Record<string, string | undefined>): CopilotContext {
  const status = searchParams?.status;

  const gameMatch = pathname.match(/^\/game\/(\d+)/);
  if (gameMatch) {
    return { scope: "game", entityId: gameMatch[1], range: searchParams?.range, gameStatus: status };
  }
  const teamMatch = pathname.match(/^\/teams\/(\d+)/);
  if (teamMatch) {
    return { scope: "team", entityId: teamMatch[1], range: searchParams?.range };
  }
  const umpireMatch = pathname.match(/^\/umpires\/(\d+)/);
  if (umpireMatch) {
    return { scope: "umpire", entityId: umpireMatch[1], range: searchParams?.range };
  }
  return { scope: "global", range: searchParams?.range };
}

export function formatContextWindow(context?: CopilotContext): string {
  if (!context) return "Global ABS scope";
  if (context.scope === "game" && context.entityId) {
    return `Game ${context.entityId} scope${context.gameStatus ? ` (${context.gameStatus})` : ""}`;
  }
  if (context.scope === "team" && context.entityId) return `Team ${context.entityId} scope${context.range ? ` (${context.range})` : ""}`;
  if (context.scope === "umpire" && context.entityId) return `Umpire ${context.entityId} scope${context.range ? ` (${context.range})` : ""}`;
  return `Global ABS scope${context.range ? ` (${context.range})` : ""}`;
}

export function withContextPrompt(question: string, context?: CopilotContext): string {
  if (!context || context.scope === "global") return question;
  const contextNote = formatContextWindow(context);
  return `[Context: ${contextNote}] ${question}`;
}

