import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data", () => ({
    getUmpirePitchTypeBreakdown: vi.fn(async () => [
        { pitchTypeCode: "FF", pitchTypeName: "4-Seam Fastball", challengedCount: 20, overturnedCount: 8, overturnRate: 0.4 },
        { pitchTypeCode: "SL", pitchTypeName: "Slider", challengedCount: 10, overturnedCount: 3, overturnRate: 0.3 },
    ]),
}));
vi.mock("@/lib/range", () => ({
    parseRange: vi.fn((v: string | undefined) => v ?? "season"),
}));

import { GET } from "@/app/api/umpires/[umpireId]/pitch-types/route";

describe("D-8: pitch-types API route", () => {
    it("returns 200 with pitch type breakdown", async () => {
        const res = await GET(
            new Request("http://localhost/api/umpires/42/pitch-types?range=season"),
            { params: Promise.resolve({ umpireId: "42" }) },
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(2);
        expect(body[0].pitchTypeCode).toBe("FF");
        expect(body[1].overturnRate).toBe(0.3);
    });

    it("returns 400 for invalid umpireId", async () => {
        const res = await GET(
            new Request("http://localhost/api/umpires/abc/pitch-types"),
            { params: Promise.resolve({ umpireId: "abc" }) },
        );
        expect(res.status).toBe(400);
    });
});
