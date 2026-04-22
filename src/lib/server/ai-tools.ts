import {
  getGame,
  getGameChallenges,
  getGameLiveStatus,
  getHomeChallengeMoments,
  getLiveGames,
  getTeamAggression,
  getTeamChallengeScenarioMatrix,
  getTeamChallengeValueSummary,
  getTeamDecisionValueReport,
  getTeamInningEfficiency,
  getTeamSideSplits,
  getTeamSummary,
  getTeamTrend,
  getUmpireProfile,
  getUmpireSummary,
} from "@/lib/data";
import type { CopilotContext } from "@/lib/copilot-context";
import { getAllowedToolNames, sanitizeToolPayload } from "./ai-policy";

export type ToolResult = {
  toolName: string;
  payload: unknown;
};

function getEntityRange(range?: CopilotContext["range"]) {
  if (!range || range === "24h") return "season";
  return range;
}

export async function resolveToolResults(context?: CopilotContext): Promise<ToolResult[]> {
  const allowed = new Set(getAllowedToolNames(context));

  if (context?.scope === "game" && context.entityId) {
    const gamePk = Number(context.entityId);
    const [game, liveStatus, challenges] = await Promise.all([
      getGame(gamePk),
      getGameLiveStatus(gamePk),
      getGameChallenges(gamePk),
    ]);
    return [
      { toolName: "get_game_summary", payload: game },
      { toolName: "get_game_live_status", payload: liveStatus },
      { toolName: "get_game_challenges", payload: challenges.slice(-20) },
    ]
      .filter((tool) => allowed.has(tool.toolName))
      .map((tool) => ({ ...tool, payload: sanitizeToolPayload(tool.payload) }));
  }

  if (context?.scope === "team" && context.entityId) {
    const teamId = Number(context.entityId);
    const range = getEntityRange(context.range);
    const [summary, trend, inningEfficiency, sideSplits, aggression, challengeScenarioMatrix, challengeValueSummary, decisionValueReport] = await Promise.all([
      getTeamSummary(teamId, range),
      getTeamTrend(teamId, range),
      getTeamInningEfficiency(teamId, range),
      getTeamSideSplits(teamId, range),
      getTeamAggression(teamId, range),
      getTeamChallengeScenarioMatrix(teamId, range),
      getTeamChallengeValueSummary(teamId, range),
      getTeamDecisionValueReport(teamId, range),
    ]);
    return [
      { toolName: "get_team_summary", payload: summary },
      { toolName: "get_team_trend", payload: trend.slice(-10) },
      { toolName: "get_team_inning_efficiency", payload: inningEfficiency },
      { toolName: "get_team_side_splits", payload: sideSplits },
      { toolName: "get_team_aggression", payload: aggression },
      { toolName: "get_team_challenge_scenario_matrix", payload: challengeScenarioMatrix },
      { toolName: "get_team_challenge_value_summary", payload: challengeValueSummary },
      { toolName: "get_team_decision_value_report", payload: decisionValueReport },
    ]
      .filter((tool) => allowed.has(tool.toolName))
      .map((tool) => ({ ...tool, payload: sanitizeToolPayload(tool.payload) }));
  }

  if (context?.scope === "umpire" && context.entityId) {
    const umpireId = Number(context.entityId);
    const [summary, profile] = await Promise.all([getUmpireSummary(umpireId), getUmpireProfile(umpireId)]);
    return [
      { toolName: "get_umpire_summary", payload: summary },
      { toolName: "get_umpire_profile", payload: profile },
    ]
      .filter((tool) => allowed.has(tool.toolName))
      .map((tool) => ({ ...tool, payload: sanitizeToolPayload(tool.payload) }));
  }

  const [games, moments] = await Promise.all([getLiveGames(), getHomeChallengeMoments(8)]);
  return [
    { toolName: "get_live_games", payload: games.slice(0, 10) },
    { toolName: "get_home_challenge_moments", payload: moments },
  ]
    .filter((tool) => allowed.has(tool.toolName))
    .map((tool) => ({ ...tool, payload: sanitizeToolPayload(tool.payload) }));
}
