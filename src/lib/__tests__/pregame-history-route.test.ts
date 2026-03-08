import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/pregame-intel", () => ({
    getGamePregameIntel: vi.fn(async (gamePk: number) => {
        if (gamePk === 999) return null;
        return {
            umpireId: 100,
            umpireName: "Test Umpire",
            teamHistoryVsUmpire: {
                home: { games: 5, challenges: 12, overturnRate: 0.4 },
                away: { games: 3, challenges: 8, overturnRate: 0.5 },
                leagueAverage: 0.35,
            },
        };
    }),
}));

import { GET } from "@/app/api/games/[gamePk]/pregame-history/route";

describe("D-5: pregame-history API route", () => {
    it("returns 200 with umpire × team history", async () => {
        const res = await GET(new Request("http://localhost/api/games/12345/pregame-history"), {
            params: Promise.resolve({ gamePk: "12345" }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.umpireId).toBe(100);
        expect(body.homeTeam.games).toBe(5);
        expect(body.awayTeam.overturnRate).toBe(0.5);
        expect(body.leagueAverage).toBe(0.35);
    });

    it("returns 404 for unknown game", async () => {
        const res = await GET(new Request("http://localhost/api/games/999/pregame-history"), {
            params: Promise.resolve({ gamePk: "999" }),
        });
        expect(res.status).toBe(404);
    });

    it("returns 400 for invalid gamePk", async () => {
        const res = await GET(new Request("http://localhost/api/games/abc/pregame-history"), {
            params: Promise.resolve({ gamePk: "abc" }),
        });
        expect(res.status).toBe(400);
    });
});
