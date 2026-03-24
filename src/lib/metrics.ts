export const METRIC_DICTIONARY: Record<string, string> = {
  overturn_rate: "used_successful / (used_successful + used_failed)",
  challenge_volume: "Total ABS challenges (successful + failed)",
  burn_rate_early: "Challenges used through inning 5",
  defensive_challenges_against: "Challenges initiated by opponent against your defense",
};

export const ALLOWED_VIEWS = [
  "mart_abs_events_enriched",
  "mart_team_abs_daily",
  "mart_umpire_abs_daily",
  "mart_game_abs_timeline",
] as const;
