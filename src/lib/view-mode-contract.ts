import type { ViewMode } from "@/lib/view-mode";

export type GameViewState = "pregame" | "live" | "final";

const HOME_PAGE_COPY = {
  fan: {
    heroDeck: "The home of MLB challenge intelligence.",
    summaryLabel: "story",
    teamsSectionTitle: "Team Personalities",
    umpiresSectionTitle: "Umpires in the Spotlight",
    topMomentEyebrow: "Today's Most Controversial Call",
    topMomentTitleFallback: "Slate settling",
  },
  org: {
    heroDeck: "League monitoring for ABS operations, prep, and leverage decisions.",
    summaryLabel: "ops note",
    teamsSectionTitle: "Challenge Operators",
    umpiresSectionTitle: "Umpire Watch List",
    topMomentEyebrow: "Highest-Pressure Review",
    topMomentTitleFallback: "Operational slate scan",
  },
} as const;

const TEAMS_PAGE_COPY = {
  fan: {
    heroTitle: "Team Leaderboard",
    heroDeck:
      "Aggregated ABS challenge data across all 30 MLB franchises, emphasizing team personality, later-game habits, and challenge identity.",
    spotlightEyebrow: "Biggest Mover",
    spotlightLabel: "Profile",
    tableProfileHeader: "Profile",
    tableRateHeader: "Effectiveness",
    tableVolumeHeader: "Challenges",
    sectionOrder: ["spotlight", "scatter", "table"],
  },
  org: {
    heroTitle: "Team Leaderboard",
    heroDeck:
      "Aggregated ABS challenge data across all 30 MLB franchises, emphasizing challenge discipline, situational timing, and decision quality.",
    spotlightEyebrow: "Recent Signal",
    spotlightLabel: "Discipline",
    tableProfileHeader: "Profile",
    tableRateHeader: "Timing Index",
    tableVolumeHeader: "Games",
    sectionOrder: ["spotlight", "table", "scatter"],
  },
} as const;

const TEAM_DETAIL_COPY = {
  fan: {
    heroSubtitle:
      "Full ABS personality breakdown, from turning points to challenge identity.",
    trendEyebrow: "Season Tempo",
    trendTitle: "Challenge Trajectory",
    aggressionEyebrow: "Team Personality",
    aggressionTitle: "Challenge Aggression",
    heatmapEyebrow: "Offensive Approach",
    heatmapTitle: "Team Challenge Map",
    efficiencyTitle: "Challenge Rhythm Map",
    efficiencyAccent: "Challenge Pulse",
    schedulePlacement: "early",
    lowerSectionOrder: ["splits", "umpires", "style"],
  },
  org: {
    heroSubtitle:
      "Strategic ABS profile, built around challenge posture, situational timing, and umpire context.",
    trendEyebrow: "Challenge Trendline",
    trendTitle: "Decision Trajectory",
    aggressionEyebrow: "Challenge Posture",
    aggressionTitle: "Offense / Defense Posture",
    heatmapEyebrow: "Challenge Targets",
    heatmapTitle: "Team Challenge Map",
    efficiencyTitle: "Situational Decision Matrix",
    efficiencyAccent: "Efficiency Heatmap",
    schedulePlacement: "late",
    lowerSectionOrder: ["umpires", "style", "splits"],
  },
} as const;

const UMPIRES_PAGE_COPY = {
  fan: {
    heroTitle: "Umpire Rankings",
    heroDeck:
      "ABS challenge rankings across the active MLB umpire pool, highlighting who looks steady, shaky, or chaotic in the review sample.",
    watchTitle: "Tonight's Spotlight",
    leaderboardPlacement: "late",
  },
  org: {
    heroTitle: "Umpire Rankings",
    heroDeck:
      "Operational ABS challenge rankings across the active MLB umpire pool, highlighting risk, stability, and prep value in the current sample.",
    watchTitle: "Prep Assignments",
    leaderboardPlacement: "early",
  },
} as const;

const UMPIRE_DETAIL_COPY = {
  fan: {
    heroSubtitle:
      "ABS personality file, from the loudest missed zones to the most dramatic challenge swings.",
    historyEyebrow: "Historical Assignments",
    historyTitle: "Recent Gameday Feed",
    historyPlacement: "early",
  },
  org: {
    heroSubtitle:
      "Operational ABS profile, centered on grade stability, directional bias, and pregame prep value.",
    historyEyebrow: "Historical Assignments",
    historyTitle: "Recent Gameday Feed",
    historyPlacement: "late",
  },
} as const;

const GAME_VIEW_COPY: Record<
  GameViewState,
  Record<ViewMode, { eyebrow: string; title: string; deck: string; sectionOrder: string[] }>
> = {
  pregame: {
  fan: {
    eyebrow: "Tonight's ABS Story",
    title: "Pregame Spotlight",
    deck: "A lighter pregame read on tonight's umpire personality, challenge tendencies, and matchup tension.",
      sectionOrder: ["signals", "visuals", "briefing", "history"],
    },
  org: {
    eyebrow: "ABS Scouting Report",
    title: "Pregame Intelligence",
    deck: "Pregame scouting read built from tracked umpire tendencies and team challenge profiles entering tonight's matchup.",
      sectionOrder: ["visuals", "signals", "briefing", "history"],
    },
  },
  live: {
    fan: {
      eyebrow: "Live Feed",
      title: "Challenge Drama",
      deck: "A live read on the current challenge leverage, count state, and biggest swings in the game.",
      sectionOrder: ["feed", "meter", "explorer"],
    },
    org: {
      eyebrow: "Live War Room",
      title: "Match Events",
      deck: "Real-time challenge monitoring for leverage, resource burn, and count-state context.",
      sectionOrder: ["meter", "feed", "burn", "explorer"],
    },
  },
  final: {
    fan: {
      eyebrow: "After-Action Report",
      title: "ABS Game Story",
      deck: "A story-first postgame recap of the biggest challenges, cleanest reversals, and loudest ABS moments from the final slate.",
      sectionOrder: ["debrief", "summary", "waterfall", "explorer"],
    },
    org: {
      eyebrow: "After-Action Report",
      title: "ABS Game Analysis",
      deck: "Postgame breakdown of review events, decision quality, and umpire zone consistency across the completed matchup.",
      sectionOrder: ["summary", "waterfall", "debrief", "explorer"],
    },
  },
};

export function getHomePageViewCopy(mode: ViewMode) {
  return HOME_PAGE_COPY[mode];
}

export function getTeamsPageViewCopy(mode: ViewMode) {
  return TEAMS_PAGE_COPY[mode];
}

export function getTeamDetailViewCopy(mode: ViewMode) {
  return TEAM_DETAIL_COPY[mode];
}

export function getUmpiresPageViewCopy(mode: ViewMode) {
  return UMPIRES_PAGE_COPY[mode];
}

export function getUmpireDetailViewCopy(mode: ViewMode) {
  return UMPIRE_DETAIL_COPY[mode];
}

export function getGameViewCopy(mode: ViewMode, state: GameViewState) {
  return GAME_VIEW_COPY[state][mode];
}
