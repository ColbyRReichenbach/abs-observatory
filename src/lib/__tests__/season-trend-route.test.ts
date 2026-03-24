import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data", () => ({
    getUmpireSeasonTrend: vi.fn(async (id: number) => {
        if (id === 999) return [{ season: 2025, challengedCalls: 5, overturnedCalls: 2, overturnRate: 0.4, gamesWorked: 3 }];
        return [
            { season: 2024, challengedCalls: 50, overturnedCalls: 20, overturnRate: 0.4, gamesWorked: 30 },
            { season: 2025, challengedCalls: 60, overturnedCalls: 18, overturnRate: 0.3, gamesWorked: 35 },
        ];
    }),
}));

import { GET } from "@/app/api/umpires/[umpireId]/season-trend/route";

describe("D-7: season-trend API route", () => {
    it("returns 200 with multi-season data", async () => {
        const res = await GET(
            new Request("http://localhost/api/umpires/42/season-trend"),
            { params: Promise.resolve({ umpireId: "42" }) },
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data).toHaveLength(2);
        expect(body.data[0].season).toBe(2024);
    });

    it("returns empty with notice for single-season umpire", async () => {
        const res = await GET(
            new Request("http://localhost/api/umpires/999/season-trend"),
            { params: Promise.resolve({ umpireId: "999" }) },
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data).toHaveLength(0);
        expect(body.notice).toBeDefined();
    });

    it("returns 400 for invalid umpireId", async () => {
        const res = await GET(
            new Request("http://localhost/api/umpires/abc/season-trend"),
            { params: Promise.resolve({ umpireId: "abc" }) },
        );
        expect(res.status).toBe(400);
    });
});
