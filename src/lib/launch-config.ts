export const launchConfig = {
  publicVisualizerEnabled: true,
  publicCopilotEnabled: true,
  publicQueryLabEnabled: false,
  publicDailyAiEditorialEnabled: false,
  publicWeeklyEditorialEnabled: true,
} as const;

export type LaunchConfig = typeof launchConfig;
