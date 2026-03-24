export const launchConfig = {
  publicVisualizerEnabled: true,
  publicCopilotEnabled: false,
  publicQueryLabEnabled: false,
  publicDailyAiEditorialEnabled: false,
  publicWeeklyEditorialEnabled: true,
} as const;

export type LaunchConfig = typeof launchConfig;
