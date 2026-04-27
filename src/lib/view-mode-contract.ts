import type { ViewMode } from "@/lib/view-mode";

export type GameViewState = "pregame" | "live" | "final";

const HOME_PAGE_COPY = {
  fan: {
    heroDeck: "The home of MLB ABS challenge coverage.",
    summaryLabel: "story",
    teamsSectionTitle: "Team Review Profiles",
    umpiresSectionTitle: "Umpires In Focus",
    topMomentEyebrow: "Today's Most Controversial Call",
    topMomentTitleFallback: "Slate settling",
  },
  org: {
    heroDeck: "Leaguewide ABS challenge monitoring for prep, leverage, and review support.",
    summaryLabel: "ops note",
    teamsSectionTitle: "Team Review Patterns",
    umpiresSectionTitle: "Umpire Watch List",
    topMomentEyebrow: "Highest-Pressure Review",
    topMomentTitleFallback: "Operational slate scan",
  },
} as const;

const TEAMS_PAGE_COPY = {
  fan: {
    heroTitle: "Team Leaderboard",
    heroDeck:
      "Aggregated ABS challenge data across all 30 MLB clubs, emphasizing review frequency, overturn results, and late-game usage.",
    spotlightEyebrow: "Biggest Mover",
    spotlightLabel: "Review profile",
    tableProfileHeader: "Profile",
    tableRateHeader: "Review impact",
    tableVolumeHeader: "Challenges",
    sectionOrder: ["spotlight", "scatter", "table"],
  },
  org: {
    heroTitle: "Team Leaderboard",
    heroDeck:
      "Aggregated ABS challenge data across all 30 MLB clubs, emphasizing challenge usage, leverage timing, and review outcomes.",
    spotlightEyebrow: "Review Signal",
    spotlightLabel: "Usage pattern",
    tableProfileHeader: "Profile",
    tableRateHeader: "Timing Index",
    tableVolumeHeader: "Games",
    sectionOrder: ["spotlight", "table", "scatter"],
  },
} as const;

const TEAM_DETAIL_COPY = {
  fan: {
    heroSubtitle:
      "Full ABS challenge profile, from turning points to review usage and game-state swings.",
    trendEyebrow: "Season Tempo",
    trendTitle: "Challenge Trajectory",
    aggressionEyebrow: "Review Profile",
    aggressionTitle: "Challenge Usage",
    heatmapEyebrow: "Offensive Approach",
    heatmapTitle: "Team Challenge Map",
    efficiencyTitle: "Challenge Rhythm Map",
    efficiencyAccent: "Challenge Pulse",
    schedulePlacement: "early",
    lowerSectionOrder: ["splits", "umpires", "style"],
  },
  org: {
    heroSubtitle:
      "Strategic ABS profile, built around challenge usage, leverage timing, and umpire context.",
    trendEyebrow: "Challenge Trendline",
    trendTitle: "Review Trajectory",
    aggressionEyebrow: "Challenge Posture",
    aggressionTitle: "Offense / Defense Posture",
    heatmapEyebrow: "Challenge Targets",
    heatmapTitle: "Team Challenge Map",
    efficiencyTitle: "Situational Review Matrix",
    efficiencyAccent: "Efficiency Heatmap",
    schedulePlacement: "early",
    lowerSectionOrder: ["umpires", "style", "splits"],
  },
} as const;

const UMPIRES_PAGE_COPY = {
  fan: {
    heroTitle: "Umpire Rankings",
    heroDeck:
      "ABS challenge rankings across the active MLB umpire pool, highlighting which umpires look steady, volatile, or high-risk in the review sample.",
    watchTitle: "Tonight's Spotlight",
    leaderboardPlacement: "late",
  },
  org: {
    heroTitle: "Umpire Rankings",
    heroDeck:
      "Operational ABS challenge rankings across the active MLB umpire pool, highlighting review risk, stability, and pregame watch value in the current sample.",
    watchTitle: "Pregame Watch",
    leaderboardPlacement: "early",
  },
} as const;

const UMPIRE_DETAIL_COPY = {
  fan: {
    heroSubtitle:
      "ABS review file, from the most active zones to the biggest challenge swings.",
    historyEyebrow: "Historical Assignments",
    historyTitle: "Recent Gameday Feed",
    historyPlacement: "early",
  },
  org: {
    heroSubtitle:
      "Operational ABS profile, centered on overturn trends, directional bias, and pregame review prep.",
    historyEyebrow: "Historical Assignments",
    historyTitle: "Recent Gameday Feed",
    historyPlacement: "early",
  },
} as const;

const GAME_VIEW_COPY: Record<
  GameViewState,
  Record<ViewMode, { eyebrow: string; title: string; deck: string; sectionOrder: string[] }>
> = {
  pregame: {
    fan: {
      eyebrow: "Tonight's ABS Matchup",
      title: "Pregame Review Story",
      deck: "Story-first pregame matchup visuals for who challenges more, who wins reviews more often, and where tonight could turn into a review game.",
      sectionOrder: ["visuals", "briefing", "history"],
    },
    org: {
      eyebrow: "ABS Scouting Report",
      title: "Pregame Prep Board",
      deck: "Decision-first pregame board built around modeled leverage pockets, challenge reserve, and tonight's umpire review profile.",
      sectionOrder: ["briefing", "visuals", "history"],
    },
  },
  live: {
    fan: {
      eyebrow: "Live ABS",
      title: "Review Story",
      deck: "A live story surface for what the current review spot means, who is winning the challenge battle, and how tonight's reviews are changing the game. The challenge-now lens is exploratory and built for live discussion.",
      sectionOrder: ["meter", "visuals", "explorer"],
    },
    org: {
      eyebrow: "Live Review Desk",
      title: "Live Review Context",
      deck: "Real-time review context for consequence, overturn risk, and the strongest modeled paths in the current state. This surface should inform discussion, not imply club-ready live optimization.",
      sectionOrder: ["briefing", "visuals", "explorer"],
    },
  },
  final: {
    fan: {
      eyebrow: "Postgame Review",
      title: "ABS Game Story",
      deck: "A chart-first postgame recap of which club handled the challenge game better, where the biggest swings landed, and what the umpire looked like by final out.",
      sectionOrder: ["summary", "waterfall", "explorer"],
    },
    org: {
      eyebrow: "Postgame Review",
      title: "ABS Game Analysis",
      deck: "Analytics-first postgame review of actual value gained, modeled opportunity captured, and whether the challenge plan held up across the full game.",
      sectionOrder: ["summary", "waterfall", "explorer"],
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
