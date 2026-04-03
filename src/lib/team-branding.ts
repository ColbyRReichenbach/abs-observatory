import motifConfig from "@/config/team-motifs.json";

type MotifConfidence = "verified" | "provisional";

type TeamMotif = {
  team_id: number;
  name: string;
  abbreviation: string;
  motif_primary: string;
  motif_secondary: string;
  visual_tokens: string[];
  source_url: string | null;
  source_type: "official" | "pending";
  confidence: MotifConfidence;
  status: "ready" | "needs_research";
};

type MotifCatalog = {
  version: number;
  notes: string;
  teams: TeamMotif[];
};

const catalog = motifConfig as MotifCatalog;

export type TeamBrandingInput = {
  teamId: number;
  teamName?: string | null;
  abbreviation?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoSvgUrl?: string | null;
};

export type TeamBrandingResolved = {
  teamId: number;
  teamName: string;
  abbreviation: string;
  tokens: {
    teamPrimary: string;
    teamSecondary: string;
    teamAccentSoft: string;
    teamAccentStrong: string;
  };
  logoSvgUrl: string | null;
  motif: {
    primary: string;
    secondary: string;
    visualTokens: string[];
    confidence: MotifConfidence;
    status: "ready" | "needs_research";
    sourceUrl: string | null;
    isVerified: boolean;
  };
};

const DEFAULT_PRIMARY = "#134A8E";
const DEFAULT_SECONDARY = "#1D2D5C";

// Official MLB Team Primary Colors mapped by Team ID
const teamColors: Record<number, string> = {
  108: "#BA0021", // LAA
  109: "#A71930", // ARI
  110: "#DF4601", // BAL -> Or #000000
  111: "#BD3039", // BOS
  112: "#0E3386", // CHC
  113: "#C6011F", // CIN
  114: "#E31937", // CLE
  115: "#33006F", // COL
  116: "#0C2340", // DET
  117: "#EB6E1F", // HOU (or #002D62) -> Using dark blue for contrast: #002D62
  118: "#004687", // KC
  119: "#005A9C", // LAD
  120: "#AB0003", // WSH
  121: "#002D72", // NYM
  133: "#003831", // OAK
  134: "#27251F", // PIT
  135: "#2F241D", // SD
  136: "#0C2C56", // SEA
  137: "#27251F", // SF -> Black to allow orange logo to pop, or #FD5A1E orange
  138: "#C41E3A", // STL
  139: "#092C5C", // TB
  140: "#003278", // TEX
  141: "#134A8E", // TOR
  142: "#002B5C", // MIN
  143: "#E81828", // PHI
  144: "#CE1141", // ATL -> NAVY: #13274F
  145: "#27251F", // CWS
  146: "#00A3E0", // MIA -> or Black: #000000
  147: "#0C2340", // NYY
  158: "#12284B", // MIL
};

// Specifically overriding for ones where the primary is too dark/light or better represented in the graphic
teamColors[117] = "#002D62"; // Astros Blue
teamColors[137] = "#27251F"; // Giants Black
teamColors[110] = "#27251F"; // Orioles Black (so orange bird pops)
teamColors[144] = "#13274F"; // Braves Navy
teamColors[146] = "#000000"; // Marlins Black

function withAlpha(hex: string, alphaHex = "33") {
  const normalized = hex.trim();
  if (!normalized.startsWith("#") || (normalized.length !== 7 && normalized.length !== 4)) return `${DEFAULT_PRIMARY}33`;
  if (normalized.length === 4) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }
  return `${normalized}${alphaHex}`;
}

function normalizeHex(hex?: string | null) {
  if (!hex) return null;
  const normalized = hex.trim().toUpperCase();
  if (!normalized.startsWith("#")) return null;
  if (normalized.length === 7) return normalized;
  if (normalized.length === 4) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function hexToRgb(hex?: string | null) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function areColorsTooSimilar(left?: string | null, right?: string | null) {
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);
  if (!leftRgb || !rightRgb) return false;
  const distance = Math.sqrt(
    (leftRgb.r - rightRgb.r) ** 2 +
      (leftRgb.g - rightRgb.g) ** 2 +
      (leftRgb.b - rightRgb.b) ** 2,
  );
  return distance < 56;
}

export function getTeamMotif(teamId: number): TeamMotif | null {
  return catalog.teams.find((team) => team.team_id === teamId) ?? null;
}

export function resolveTeamBranding(input: TeamBrandingInput): TeamBrandingResolved {
  const motif = getTeamMotif(input.teamId);
  const teamPrimary = input.primaryColor ?? teamColors[input.teamId] ?? DEFAULT_PRIMARY;
  const teamSecondary = input.secondaryColor ?? DEFAULT_SECONDARY;
  const abbreviation = input.abbreviation ?? motif?.abbreviation ?? "MLB";
  const teamName = input.teamName ?? motif?.name ?? `Team ${input.teamId}`;
  const isVerified = motif?.confidence === "verified" && motif?.status === "ready";

  return {
    teamId: input.teamId,
    teamName,
    abbreviation,
    tokens: {
      teamPrimary,
      teamSecondary,
      teamAccentSoft: withAlpha(teamPrimary, "33"),
      teamAccentStrong: teamPrimary,
    },
    logoSvgUrl: input.logoSvgUrl ?? null,
    motif: {
      // Enforce strict fallback: provisional motifs do not render team-specific motif copy.
      primary: isVerified ? (motif?.motif_primary ?? "Team Identity") : "Identity Motif Pending Verification",
      secondary: isVerified ? (motif?.motif_secondary ?? "Classic Baseball Styling") : "League-neutral baseball treatment",
      visualTokens: isVerified ? (motif?.visual_tokens ?? ["generic-baseball"]) : ["generic-baseball"],
      confidence: motif?.confidence ?? "provisional",
      status: motif?.status ?? "needs_research",
      sourceUrl: isVerified ? (motif?.source_url ?? null) : null,
      isVerified: Boolean(isVerified),
    },
  };
}

export function resolveMatchupAccentColors(input: {
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homePrimaryColor?: string | null;
  homeSecondaryColor?: string | null;
  awayPrimaryColor?: string | null;
  awaySecondaryColor?: string | null;
}) {
  const homeBrand = resolveTeamBranding({
    teamId: input.homeTeamId ?? 141,
    primaryColor: input.homePrimaryColor,
    secondaryColor: input.homeSecondaryColor,
  });
  const awayBrand = resolveTeamBranding({
    teamId: input.awayTeamId ?? 147,
    primaryColor: input.awayPrimaryColor,
    secondaryColor: input.awaySecondaryColor,
  });

  const homeColor = homeBrand.tokens.teamPrimary;
  const awayColor = areColorsTooSimilar(homeBrand.tokens.teamPrimary, awayBrand.tokens.teamPrimary)
    ? awayBrand.tokens.teamSecondary
    : awayBrand.tokens.teamPrimary;

  return { homeColor, awayColor };
}
