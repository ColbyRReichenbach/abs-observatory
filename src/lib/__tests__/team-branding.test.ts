import { describe, expect, it } from "vitest";

import { getTeamMotif, resolveTeamBranding } from "@/lib/team-branding";

describe("team branding resolver", () => {
  it("returns verified motif metadata when available", () => {
    const motif = getTeamMotif(111); // Red Sox
    expect(motif).not.toBeNull();
    expect(motif?.confidence).toBe("verified");
  });

  it("builds brand tokens from input colors", () => {
    const branding = resolveTeamBranding({
      teamId: 111,
      teamName: "Boston Red Sox",
      abbreviation: "BOS",
      primaryColor: "#BD3039",
      secondaryColor: "#0C2340",
      logoSvgUrl: "https://example.com/logo.svg",
    });

    expect(branding.tokens.teamPrimary).toBe("#BD3039");
    expect(branding.tokens.teamAccentSoft).toBe("#BD303933");
    expect(branding.motif.primary).toContain("Green Monster");
  });

  it("uses generic motif copy for provisional teams", () => {
    const branding = resolveTeamBranding({ teamId: 108 });
    expect(branding.motif.confidence).toBe("provisional");
    expect(branding.motif.primary).toBe("Identity Motif Pending Verification");
    expect(branding.motif.visualTokens).toEqual(["generic-baseball"]);
    expect(branding.motif.sourceUrl).toBeNull();
  });

  it("falls back safely when motif is missing", () => {
    const branding = resolveTeamBranding({ teamId: 99999 });
    expect(branding.teamName).toBe("Team 99999");
    expect(branding.motif.confidence).toBe("provisional");
    expect(branding.motif.visualTokens).toEqual(["generic-baseball"]);
  });
});
