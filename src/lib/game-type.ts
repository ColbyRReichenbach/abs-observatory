export type GameTypeLabel = {
  shortLabel: string;
  fullLabel: string;
  tone: "blue" | "emerald" | "gray" | "amber";
};

export function getGameTypeLabel(gameType: string | null | undefined): GameTypeLabel {
  switch ((gameType ?? "").toUpperCase()) {
    case "S":
      return {
        shortLabel: "Spring",
        fullLabel: "Spring Training",
        tone: "amber",
      };
    case "R":
      return {
        shortLabel: "Regular",
        fullLabel: "Regular Season",
        tone: "blue",
      };
    case "F":
    case "D":
    case "L":
    case "W":
      return {
        shortLabel: "Post",
        fullLabel: "Postseason",
        tone: "emerald",
      };
    default:
      return {
        shortLabel: "Game",
        fullLabel: "MLB Game",
        tone: "gray",
      };
  }
}
