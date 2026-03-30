export type LiveGameCard = {
  gamePk: number;
  gameDate: string;
  gameType?: string | null;
  status: string;
  detailedState: string | null;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamAbbreviation?: string | null;
  homeTeamLogoUrl?: string | null;
  homeScore: number | null;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamAbbreviation?: string | null;
  awayTeamLogoUrl?: string | null;
  awayScore: number | null;
  homeAbsRemaining: number;
  awayAbsRemaining: number;
  homeTeamColor?: string | null;
  awayTeamColor?: string | null;
  challengeCount: number;
  inning?: number | null;
  inningHalf?: string | null;
};


export type ChallengeEvent = {
  challengeId: string;
  gamePk: number;
  challengedAt: string | null;
  inning: number | null;
  halfInning: string | null;
  balls: number | null;
  strikes: number | null;
  outs: number | null;
  basesState: string | null;
  homeScore: number | null;
  awayScore: number | null;
  challengeTeamId: number | null;
  challengeTeamName: string | null;
  challengePlayerName: string | null;
  batterName: string | null;
  pitcherName: string | null;
  batterStand?: "R" | "L" | null;
  pitcherThrows?: "R" | "L" | null;
  calledDescription: string | null;
  pitchNumber: number | null;
  pitchType: string | null;
  startSpeed: number | null;
  spinRate: number | null;
  isOverturned: boolean;
  px: number | null;
  pz: number | null;
  strikeZoneTop: number | null;
  strikeZoneBottom: number | null;
  countBefore?: string | null;
  countAfter?: string | null;
  umpireCount?: string | null;
  impactType?: string | null;
  impactSummary?: string | null;
  locationSource?: string | null;
  inferenceMethod?: string | null;
  inferenceConfidence?: string | null;
  estimatedLeverageIndex?: number | null;
  estimatedChallengeSwing?: number | null;
  leverageBucket?: "low" | "medium" | "high" | null;
  positiveOutcomeDelta?: number | null;
  battingAverageDelta?: number | null;
  walkRateDelta?: number | null;
  strikeoutRateDelta?: number | null;
  preRunExpectancy?: number | null;
  postRunExpectancy?: number | null;
  runExpectancyDelta?: number | null;
  runExpectancyConfidence?: ConfidenceBand | null;
  preWinExpectancy?: number | null;
  postWinExpectancy?: number | null;
  winExpectancyDelta?: number | null;
  winExpectancyConfidence?: ConfidenceBand | null;
  estimatedOverturnProbability?: number | null;
  overturnProbabilityConfidence?: ConfidenceBand | null;
  overturnProbabilityFallbackTier?: "exact" | "direction_only" | "global" | null;
  expectedChallengeValue?: number | null;
  decisionRecommendation?: "challenge" | "hold" | "cannot_challenge" | null;
  decisionValueMode?: "win_expectancy" | "heuristic" | null;
  heldCountBaseline?: ChallengeCountBaseline | null;
  correctedCountBaseline?: ChallengeCountBaseline | null;
  pitchTypeCountBaseline?: ChallengePitchTypeBaseline | null;
  handednessBaseline?: ChallengeHandednessBaseline | null;
  pitchLaneBaseline?: ChallengePitchLaneBaseline | null;
};

export type ChallengeCountBaseline = {
  countKey: string;
  plateAppearances: number;
  battingAverage: number;
  walkRate: number;
  strikeoutRate: number;
  positiveOutcomeRate: number;
};

export type ChallengePitchTypeBaseline = {
  pitchType: string;
  countKey: string;
  pitchCount: number;
  challengedPitchCount: number;
  challengeRate: number;
  avgStartSpeed: number | null;
  avgSpinRate: number | null;
};

export type ChallengeHandednessBaseline = {
  countKey: string;
  pitcherThrows: "R" | "L";
  batterStand: "R" | "L";
  sampleSize: number;
  overturnRate: number;
  avgEdgeDistance: number | null;
};

export type ChallengePitchLaneBaseline = {
  pitchType: string;
  countKey: string;
  lane: string;
  sampleSize: number;
  overturnRate: number;
  avgEdgeDistance: number | null;
};

export type PitchTimelineEntry = {
  gamePk: number;
  atBatIndex: number;
  pitchNumber: number;
  playEventIndex: number | null;
  inning: number | null;
  halfInning: string | null;
  batterId: number | null;
  batterName: string | null;
  pitcherId: number | null;
  pitcherName: string | null;
  calledCode: string | null;
  calledDescription: string | null;
  playDescription: string | null;
  pitchTypeCode: string | null;
  pitchType: string | null;
  startSpeed: number | null;
  spinRate: number | null;
  px: number | null;
  pz: number | null;
  strikeZoneTop: number | null;
  strikeZoneBottom: number | null;
  zone: number | null;
  countBefore: string | null;
  countAfter: string | null;
  umpireCount: string | null;
  outsBefore: number | null;
  outsAfter: number | null;
  basesStateBefore: string | null;
  basesStateAfter: string | null;
  isInPlay: boolean;
  endedPlateAppearance: boolean;
  challengeId: string | null;
  challengePlayerName: string | null;
  challengeTeamId: number | null;
  isOverturned: boolean | null;
  locationSource?: string | null;
  inferenceMethod?: string | null;
  inferenceConfidence?: string | null;
  impactType: string;
  impactSummary: string;
};

export type UmpireSummary = {
  umpireId: number;
  umpireName: string;
  challengedCalls: number;
  overturnedCalls: number;
  confirmedCalls: number;
  overturnRate: number;
  gamesWorked: number;
};

export type UmpireZoneBucket = {
  zone: "up" | "down" | "glove" | "arm" | "heart" | "edge" | "chase";
  challenges: number;
  overturnRate: number;
};

export type UmpireCountHotspot = {
  countKey: string;
  challenges: number;
  overturnRate: number;
};

export type UmpireProfile = {
  directionalBias: {
    strikeToBall: number;
    ballToStrike: number;
    otherOverturns: number;
    confirmed: number;
  };
  zoneBuckets: UmpireZoneBucket[];
  countHotspots: UmpireCountHotspot[];
  handednessSplits?: UmpireHandednessSplit[];
};

export type UmpireHandednessSplit = {
  pitcherThrows: "R" | "L";
  batterStand: "R" | "L";
  challengedCount: number;
  overturnedCount: number;
  overturnRate: number;
};

export type UmpireMatchupVulnerability = {
  pitcherThrows: "R" | "L";
  batterStand: "R" | "L";
  challengedCount: number;
  overturnedCount: number;
  overturnRate: number;
  topPitchTypeCode: string | null;
  topPitchTypeName: string | null;
  topPitchTypeOverturnRate: number | null;
  topZone: string | null;
  topZoneOverturnRate: number | null;
};

export type TeamSummary = {
  teamId: number;
  teamName: string;
  gamesTracked: number;
  usedSuccessful: number;
  usedFailed: number;
  challengesTotal: number;
  avgRemaining: number;
  overturnRate: number;
};

export type TeamIdentity = {
  teamId: number;
  teamName: string;
  abbreviation: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoSvgUrl: string | null;
  wins?: number;
  losses?: number;
  divisionRank?: number;
  wildCardRank?: number;
  divisionName?: string | null;
  leagueName?: string | null;
};

export type TeamTrendPoint = {
  gamePk: number;
  gameDate: string;
  gameType?: string | null;
  isHome: boolean;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  opponentName: string;
  usedSuccessful: number;
  usedFailed: number;
  challengesTotal: number;
  remaining: number;
};

export type TeamTrendSparklinePoint = {
  teamId: number;
  values: number[];
};

export type TeamInningEfficiencyCell = {
  inning: number;
  category: "Offensive" | "Defensive";
  overturnRate: number;
  sampleSize: number;
};

export type TeamSideSplit = {
  side: "home" | "away";
  games: number;
  usedSuccessful: number;
  usedFailed: number;
  challengesTotal: number;
  avgRemaining: number;
  overturnRate: number;
};

export type TeamChallengeScenarioCell = {
  rowKey: string;
  rowLabel: string;
  colKey: string;
  colLabel: string;
  challenges: number;
  overturned: number;
  overturnRate: number;
  avgEstimatedLeverage: number;
  avgPositiveOutcomeDelta: number | null;
  avgRunExpectancyDelta: number | null;
  avgWinExpectancyDelta: number | null;
  highPressureShare: number;
};

export type TeamChallengeValueSummary = {
  totalChallenges: number;
  highPressureShare: number;
  lowPressureShare: number;
  rispLessThanTwoOutsShare: number;
  averageEstimatedLeverage: number;
  averagePositiveOutcomeDelta: number | null;
  averageRunExpectancyDelta: number | null;
  medianRunExpectancyDelta: number | null;
  highRunValueShare: number;
  lowRunValueBurnShare: number;
  lateCloseRunValueShare: number;
  runExpectancyConfidence: ConfidenceBand | null;
  averageWinExpectancyDelta: number | null;
  medianWinExpectancyDelta: number | null;
  highWinValueShare: number;
  lowWinValueBurnShare: number;
  lateCloseWinValueShare: number;
  winExpectancyConfidence: ConfidenceBand | null;
  bestScenarioLabel: string | null;
  bestScenarioChallenges: number;
};

export type TeamDecisionValueSummary = {
  totalChallenges: number;
  averageExpectedChallengeValue: number | null;
  averageRealizedChallengeValue: number | null;
  decisionSurplus: number | null;
  challengeRecommendationRate: number;
  holdRecommendationRate: number;
  capturedValueShare: number;
  wastedValueShare: number;
  highPressureExpectedValueShare: number;
  lateCloseExpectedValueShare: number;
  bestDecisionWindowLabel: string | null;
  bestDecisionWindowExpectedValue: number | null;
  bestDecisionWindowChallenges: number;
  modelConfidence: ConfidenceBand | null;
  modeledWinCoverageRate: number;
};

export type TeamDecisionWindowEntry = {
  label: string;
  challenges: number;
  averageExpectedChallengeValue: number | null;
  averageRealizedChallengeValue: number | null;
  decisionSurplus: number | null;
  capturedValueShare: number;
  wastedValueShare: number;
  challengeRecommendationRate: number;
  holdRecommendationRate: number;
  modelConfidence: ConfidenceBand | null;
};

export type TeamDecisionBreakdownEntry = {
  label: string;
  challenges: number;
  averageExpectedChallengeValue: number | null;
  averageRealizedChallengeValue: number | null;
  decisionSurplus: number | null;
  capturedValueShare: number;
  wastedValueShare: number;
  modelConfidence: ConfidenceBand | null;
};

export type TeamDecisionBreakdownSection = {
  key: "inning_phase" | "count_state" | "base_out_state";
  title: string;
  bestEntry: TeamDecisionBreakdownEntry | null;
  weakestEntry: TeamDecisionBreakdownEntry | null;
  entries: TeamDecisionBreakdownEntry[];
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
};

export type TeamDecisionValueReport = {
  summary: TeamDecisionValueSummary;
  strongestWindow: TeamDecisionWindowEntry | null;
  weakestWindow: TeamDecisionWindowEntry | null;
  topWindows: TeamDecisionWindowEntry[];
  bottomWindows: TeamDecisionWindowEntry[];
  positiveWindowCount: number;
  negativeWindowCount: number;
  neutralWindowCount: number;
  breakdownSections: TeamDecisionBreakdownSection[];
};

export type GameChallengeOpportunityCell = {
  rowKey: string;
  rowLabel: string;
  colKey: string;
  colLabel: string;
  homeChallenges: number;
  awayChallenges: number;
  homeAvgEstimatedLeverage: number;
  awayAvgEstimatedLeverage: number;
  homeHighPressureShare: number;
  awayHighPressureShare: number;
};

export type GameChallengeOpportunityBoard = {
  homeTeamId: number;
  awayTeamId: number;
  homeAbbreviation: string | null;
  awayAbbreviation: string | null;
  homePrimaryColor: string | null;
  awayPrimaryColor: string | null;
  cells: GameChallengeOpportunityCell[];
};

export type ChallengeValueTimelineEntry = {
  challengeId: string;
  challengedAt: string | null;
  inning: number | null;
  halfInning: string | null;
  challengeTeamName: string | null;
  batterName: string | null;
  pitcherName: string | null;
  calledDescription: string | null;
  isOverturned: boolean;
  countBefore: string | null;
  umpireCount: string | null;
  countAfter: string | null;
  outs: number | null;
  basesState: string | null;
  homeScore: number | null;
  awayScore: number | null;
  impactType: string | null;
  impactSummary: string | null;
  estimatedLeverageIndex: number;
  estimatedChallengeSwing: number;
  leverageBucket: "low" | "medium" | "high";
  baseStateLabel: string;
  scoreStateLabel: string;
  scenarioTags: string[];
  positiveOutcomeDelta: number | null;
  battingAverageDelta: number | null;
  walkRateDelta: number | null;
  preRunExpectancy: number | null;
  postRunExpectancy: number | null;
  runExpectancyDelta: number | null;
  runExpectancyConfidence: ConfidenceBand | null;
  preWinExpectancy: number | null;
  postWinExpectancy: number | null;
  winExpectancyDelta: number | null;
  winExpectancyConfidence: ConfidenceBand | null;
  estimatedOverturnProbability: number | null;
  overturnProbabilityConfidence: ConfidenceBand | null;
  expectedChallengeValue: number | null;
  decisionRecommendation: "challenge" | "hold" | "cannot_challenge" | null;
  decisionValueMode: "win_expectancy" | "heuristic" | null;
};

export type LiveChallengeWindow = {
  inning: number | null;
  halfInning: string | null;
  balls: number | null;
  strikes: number | null;
  outs: number | null;
  basesState: string | null;
  homeScore: number | null;
  awayScore: number | null;
  estimatedLeverageIndex: number;
  leverageBucket: "low" | "medium" | "high";
  baseStateLabel: string;
  scoreStateLabel: string;
  scenarioTags: string[];
  currentCountKey: string | null;
  currentPositiveOutcomeRate: number | null;
  currentRunExpectancy: number | null;
  currentWinExpectancy: number | null;
  nextBallCountKey: string | null;
  nextBallPositiveOutcomeDelta: number | null;
  nextBallRunExpectancyDelta: number | null;
  nextBallWinExpectancyDelta: number | null;
  nextBallOverturnProbability: number | null;
  nextBallOverturnProbabilityConfidence: ConfidenceBand | null;
  nextBallExpectedChallengeValue: number | null;
  nextBallDecisionRecommendation: "challenge" | "hold" | "cannot_challenge" | null;
  nextBallDecisionValueMode: "win_expectancy" | "heuristic" | null;
  nextStrikeCountKey: string | null;
  nextStrikePositiveOutcomeDelta: number | null;
  nextStrikeRunExpectancyDelta: number | null;
  nextStrikeWinExpectancyDelta: number | null;
  nextStrikeOverturnProbability: number | null;
  nextStrikeOverturnProbabilityConfidence: ConfidenceBand | null;
  nextStrikeExpectedChallengeValue: number | null;
  nextStrikeDecisionRecommendation: "challenge" | "hold" | "cannot_challenge" | null;
  nextStrikeDecisionValueMode: "win_expectancy" | "heuristic" | null;
  runExpectancyConfidence: ConfidenceBand | null;
  winExpectancyConfidence: ConfidenceBand | null;
};

export type GameChallengeImpactMoment = {
  challengeId: string;
  challengeTeamName: string | null;
  inning: number | null;
  halfInning: string | null;
  calledDescription: string | null;
  isOverturned: boolean;
  countBefore: string | null;
  umpireCount: string | null;
  countAfter: string | null;
  estimatedLeverageIndex: number;
  estimatedChallengeSwing: number;
  runExpectancyDelta: number | null;
  runExpectancyConfidence: ConfidenceBand | null;
  winExpectancyDelta: number | null;
  winExpectancyConfidence: ConfidenceBand | null;
  expectedChallengeValue: number | null;
  decisionRecommendation: "challenge" | "hold" | "cannot_challenge" | null;
  impactSummary: string | null;
};

export type GameChallengeImpactSummary = {
  totalChallenges: number;
  overturnedChallenges: number;
  confirmedChallenges: number;
  biggestSwing: GameChallengeImpactMoment | null;
  highestLeverage: GameChallengeImpactMoment | null;
  biggestRunValue: GameChallengeImpactMoment | null;
  biggestWinValue: GameChallengeImpactMoment | null;
};

export type GameUmpireInGameSplit = {
  pitcherThrows: "R" | "L";
  batterStand: "R" | "L";
  sampleSize: number;
  overturnRate: number;
  averageLeverage: number | null;
  averageWinDelta: number | null;
  averageRunDelta: number | null;
};

export type GameUmpireInGamePitchProfile = {
  pitchType: string;
  sampleSize: number;
  overturnRate: number;
  averageLeverage: number | null;
};

export type GameUmpireInGameLaneProfile = {
  lane: string;
  sampleSize: number;
  overturnRate: number;
  averageLeverage: number | null;
};

export type GameUmpireInGameSummary = {
  totalChallenges: number;
  overturnedChallenges: number;
  mostTargetedSplit: GameUmpireInGameSplit | null;
  highestRiskSplit: GameUmpireInGameSplit | null;
  topPitchType: GameUmpireInGamePitchProfile | null;
  topLane: GameUmpireInGameLaneProfile | null;
  splits: GameUmpireInGameSplit[];
};

export type GameTeamChallengeComparisonSide = {
  teamId: number | null;
  abbreviation: string | null;
  primaryColor: string | null;
  totalChallenges: number;
  overturnRate: number | null;
  averageLeverage: number | null;
  lateCloseShare: number | null;
  totalWinValue: number | null;
  totalRunValue: number | null;
  totalEstimatedSwing: number;
  expectedValueSum: number | null;
};

export type GameTeamChallengeComparison = {
  home: GameTeamChallengeComparisonSide;
  away: GameTeamChallengeComparisonSide;
  valueMode: "win" | "run" | "estimated";
};

export type AIQueryResponse = {
  answer: string;
  sql: string;
  sources: string[];
  contextWindow?: string;
  metrics?: Record<string, string>;
  confidence: "low" | "medium" | "high";
  rows: unknown[];
};

export type AIChatResponse = {
  conversationId: string;
  assistantMessageId?: string | null;
  generationId?: string | null;
  modelName?: string;
  answer: string;
  structuredInsight?: {
    headline: string;
    sections: Array<{
      label: string;
      body: string;
    }>;
  } | null;
  toolResults: Array<{ toolName: string; payload: unknown }>;
  citations: string[];
  safetyDisposition: "allowed" | "blocked";
  confidence: "low" | "medium" | "high";
  status?: "complete" | "queued";
  jobRunId?: string;
  pollAfterSeconds?: number;
  code?: string;
  error?: string;
};

export type PregameIntel = {
  homeTeamId: number;
  awayTeamId: number;
  umpireId: number | null;
  umpireName: string | null;
  awayTeam: {
    offensiveChallenges: number;
    defensiveChallenges: number;
    successRate: number;
  };
  homeTeam: {
    offensiveChallenges: number;
    defensiveChallenges: number;
    successRate: number;
  };
  umpireTendency: {
    lowZoneAccuracy: number;
    highZoneAccuracy: number;
    overallAccuracy: number;
  };
  zoneBriefing: Array<{
    bucket: "up_glove" | "up_arm" | "down_glove" | "down_arm";
    challenges: number;
    overturnRate: number;
  }>;
  challengeTiming: {
    home: number[];
    away: number[];
    leagueAverage: number[];
  };
  teamHistoryVsUmpire: {
    home: {
      games: number;
      challenges: number;
      overturnRate: number;
    };
    away: {
      games: number;
      challenges: number;
      overturnRate: number;
    };
    leagueAverage: number;
  };
};

export type GameReport = {
  gamePk: number;
  generatedAt: string;
  modelName?: string | null;
  generationId?: string | null;
  narrativeMd: string;
  chartSpec: unknown;
};

export type GameHubGame = {
  gamepk: number;
  statusabstract: string;
  homeTeamId?: number;
  awayTeamId?: number;
  hometeamid?: number;
  awayteamid?: number;
  homescore: number | null;
  awayscore: number | null;
  homeabbreviation: string | null;
  awayabbreviation: string | null;
  homeprimarycolor: string | null;
  awayprimarycolor: string | null;
};

export type GameLiveStatus = {
  gamePk: number;
  statusAbstract: string | null;
  inning: number | null;
  halfInning: string | null;
  balls: number | null;
  strikes: number | null;
  outs: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeRemaining: number;
  awayRemaining: number;
  updatedAt: string | null;
  recentChallengeEvents: Array<{
    challengedAt: string | null;
    isOverturned: boolean;
  }>;
};

export type RangeKey = "7d" | "30d" | "season" | "all";

export type SituationalFilters = {
  inningRange?: "early" | "middle" | "late" | "extras";
  leverage?: "low" | "medium" | "high";
  side?: "offense" | "defense";
  result?: "overturned" | "confirmed";
};

export type HomeChallengeMoment = {
  challengeId: string;
  gamePk: number;
  challengedAt: string | null;
  gameLabel: string;
  inning: number | null;
  halfInning: string | null;
  balls: number | null;
  strikes: number | null;
  outs?: number | null;
  basesState?: string | null;
  umpireCount?: string | null;
  playerName: string | null;
  pitchNumber: number | null;
  calledDescription: string | null;
  challengeTeamName: string | null;
  isOverturned: boolean;
  leverageScore: number;
  gameStatus: string;
  homeScore?: number | null;
  awayScore?: number | null;
  impactType?: string | null;
  controversyScore?: number;
  reasonChips?: ControversyReasonChip[];
};

export interface UmpireTrendPoint {
  gamePk: number;
  gameDate: string;
  gameType?: string | null;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  accuracy: number;
  challengedCount: number;
  overturnedCount: number;
}

export type UmpirePerformanceDNA = {
  rhythm: Array<{
    inning: number;
    total: number;
    overturned: number;
    accuracy: number;
  }>;
  extremes: Array<{
    challengeId: string;
    gamePk: number;
    inning: number;
    px: number;
    pz: number;
    szTop: number;
    szBottom: number;
    isOverturned: boolean;
    calledDescription: string | null;
    missDistance: number;
  }>;
};

export type TeamScheduleGame = {
  gamePk: number;
  gameDate: string;
  gameType?: string | null;
  status: string;
  homeTeamId: number;
  awayTeamId: number;
  homeAbbr: string;
  awayAbbr: string;
  homeLogoUrl: string;
  awayLogoUrl: string;
};

/** D-8: Per-pitch-type challenge breakdown for an umpire */
export type UmpirePitchTypeBreakdown = {
  pitchTypeCode: string;
  pitchTypeName: string;
  challengedCount: number;
  overturnedCount: number;
  overturnRate: number;
};

/** D-7: One data point per season for umpire season-over-season chart */
export type UmpireSeasonTrendPoint = {
  season: number;
  challengedCalls: number;
  overturnedCalls: number;
  overturnRate: number;
  gamesWorked: number;
};

export type ConfidenceBand = "low" | "medium" | "high";

export type UmpireGrade = "A" | "B" | "C" | "D" | "F";

export type UmpireFanDescriptor = "Reliable" | "Balanced" | "Uneasy" | "Erratic" | "Chaotic";

export type UmpireOrgDescriptor =
  | "Low-risk profile"
  | "Stable profile"
  | "Monitor"
  | "Elevated risk"
  | "High-risk profile";

export type TeamStyle = "Clutch" | "Calculated" | "Trigger-Happy" | "Passive";

export type TeamStyleOrgLabel =
  | "Opportunistic"
  | "Disciplined"
  | "Aggressive"
  | "Conservative";

export type ControversyReasonChip =
  | "Late Inning"
  | "Extras"
  | "Tie Game"
  | "One-Run Game"
  | "Full Count"
  | "Bases Loaded"
  | "RISP"
  | "Two Outs"
  | "Direct Impact"
  | "Overturned"
  | "Confirmed"
  | "Borderline Zone"
  | "Far Off Plate";

export type OrgRiskTier = "Low" | "Moderate" | "Elevated" | "High";

export type TeamLeaderboardEntry = TeamSummary & {
  style: TeamStyle;
  orgStyleLabel: TeamStyleOrgLabel;
  styleConfidence: ConfidenceBand;
  styleScores: Record<TeamStyle, number>;
  challengeRatePerGame: number;
  lateLeverageShare: number;
  earlyLowLeverageShare: number;
  avgRunExpectancyDelta: number | null;
  highRunValueShare: number;
  runValueConfidence: ConfidenceBand | null;
  avgWinExpectancyDelta: number | null;
  highWinValueShare: number;
  winValueConfidence: ConfidenceBand | null;
  averageExpectedChallengeValue: number | null;
  averageRealizedChallengeValue: number | null;
  decisionSurplus: number | null;
  challengeRecommendationRate: number;
  holdRecommendationRate: number;
  capturedValueShare: number;
  wastedValueShare: number;
  highPressureExpectedValueShare: number;
  lateCloseExpectedValueShare: number;
  bestDecisionWindowLabel: string | null;
  bestDecisionWindowExpectedValue: number | null;
  decisionValueConfidence: ConfidenceBand | null;
};

export type UmpireLeaderboardEntry = UmpireSummary & {
  reportCardScore: number;
  grade: UmpireGrade;
  fanDescriptor: UmpireFanDescriptor;
  orgDescriptor: UmpireOrgDescriptor;
  confidence: ConfidenceBand;
  riskTier: OrgRiskTier;
  overturnRateVariance: number;
  recentOverturnRate: number | null;
};
