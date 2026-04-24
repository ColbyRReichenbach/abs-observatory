import OpenAI from "openai";

import { sql, sqlOne, withTransaction } from "@/lib/db";
import { canAccessAdmin, requireOwnerAdmin } from "@/lib/server/admin";
import { recordAiGenerationEventWithQuery } from "@/lib/server/ai-generations";
import { estimateAiCostUsd } from "@/lib/server/ai-pricing";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const DEFAULT_SUMMARY_MODEL = process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4.1-mini";

type GameReportContext = {
    gamePk: number;
    gameDate: string;
    homeName: string;
    awayName: string;
    homeScore: number | null;
    awayScore: number | null;
    venueName: string | null;
    statusAbstract: string | null;
};

type ChallengeEvidence = {
    challengeId: string;
    challengedAt: string | null;
    inning: number | null;
    halfInning: string | null;
    balls: number | null;
    strikes: number | null;
    outs: number | null;
    basesState: string | null;
    homeScore: number | null;
    awayScore: number | null;
    challengeTeamName: string | null;
    challengePlayerName: string | null;
    batterName: string | null;
    pitcherName: string | null;
    calledDescription: string | null;
    pitchNumber: number | null;
    pitchType: string | null;
    startSpeed: number | null;
    isOverturned: boolean;
    countBefore: string | null;
    countAfter: string | null;
    umpireCount: string | null;
    impactType: string | null;
    impactSummary: string | null;
    locationSource: string | null;
    inferenceMethod: string | null;
    inferenceConfidence: string | null;
    px: number | null;
    pz: number | null;
    strikeZoneTop: number | null;
    strikeZoneBottom: number | null;
};

type TeamLedger = {
    teamName: string;
    total: number;
    overturned: number;
};

function buildSummaryPrompt(context: GameReportContext, challenges: ChallengeEvidence[]) {
    const evidencePacket = buildEvidencePacket(context, challenges);

    return [
        "You are writing the AiBS postgame debrief as a sharp baseball analyst.",
        "Write with a calm, evidence-first voice that sounds like a polished game recap, not a scouting memo or list of notes.",
        "Use only the evidence below and obvious arithmetic from it.",
        "Take the supplied data points, contextualize them, and turn them into a smooth recap of how the ABS story fit into the game.",
        "Lead with the final result and the core ABS takeaway, then fold key review moments into the wider game context.",
        "Do not invent leverage, box-score details, emotions, player intent, or umpire tendencies that are not supported by the evidence.",
        "Return markdown only.",
        "Do not use headings.",
        "Do not use bullet lists.",
        "Do not wrap the answer in code fences.",
        "Formatting rules:",
        "- Write 2 to 4 short paragraphs.",
        "- Keep the full report concise, roughly 180 to 320 words.",
        "- Keep paragraphs readable and naturally flowing.",
        "- You may use bold sparingly for the most important team names, final score, challenge totals, and overturn totals.",
        "- The result should read like a game recap, not a ledger.",
        "Writing rules:",
        "- Open with the winner, final score, and the central ABS theme of the game.",
        "- Weave the most important challenge moments into sentences instead of listing them one by one.",
        "- Use stats first, then explain what they meant for the rhythm or shape of the game.",
        "- If the evidence supports an umpire-zone observation, mention it briefly and carefully.",
        "- If the data is limited or inferred, fold that caveat in naturally near the end instead of creating a separate section.",
        "",
        "EVIDENCE PACKET",
        evidencePacket,
    ].join("\n");
}

function buildFallbackNarrative(context: GameReportContext, challenges: ChallengeEvidence[]) {
    const ledgers = buildTeamLedgers(context, challenges);
    const overturned = challenges.filter((challenge) => challenge.isOverturned).length;
    const confirmed = Math.max(0, challenges.length - overturned);
    const topMoments = selectTopMoments(challenges).slice(0, Math.min(3, challenges.length));
    const locationQuality = buildLocationQualityLine(challenges);
    const finalScore = formatFinalScore(context);
    const bestLedger = [...ledgers].sort((a, b) => {
        if (b.overturned !== a.overturned) return b.overturned - a.overturned;
        return b.total - a.total;
    })[0];
    const topMomentSummary =
        topMoments.length > 0
            ? topMoments
                .map((moment) => {
                    const challengeTeam = moment.challengeTeamName ?? "Unknown club";
                    const player = moment.challengePlayerName ?? moment.batterName ?? "Unknown player";
                    const calledPitch = moment.calledDescription ?? "called pitch";
                    return `In ${formatHalfInning(moment)}, **${challengeTeam}** challenged for **${player}** on a **${calledPitch}**, and the review ${moment.isOverturned ? "overturned" : "confirmed"} the call.`;
                })
                .join(" ")
            : "No challenge events were available to identify specific review moments.";

    return [
        `**${context.awayName} at ${context.homeName}** ended ${finalScore}, and the ABS layer of the game was defined by **${challenges.length}** total challenges with **${overturned}** overturns. ${bestLedger ? `**${bestLedger.teamName}** got the most value from review, finishing **${bestLedger.overturned}-for-${bestLedger.total}** on its challenges.` : ""}`,
        "",
        topMomentSummary,
        "",
        `Overall, the plate umpire had **${overturned}** calls overturned out of **${challenges.length}** reviews, with **${confirmed}** confirmed. ${locationQuality} ${buildLocationCaveat(challenges)} This recap used the deterministic fallback template rather than a model-written narrative, so it stays compact and evidence-based.`,
    ].join("\n");
}

function formatFinalScore(context: GameReportContext) {
    if (context.homeScore === null || context.awayScore === null) {
        return "with a final score not captured in the evidence packet";
    }

    return `with **${context.awayName} ${context.awayScore}, ${context.homeName} ${context.homeScore}**`;
}

function formatHalfInning(challenge: ChallengeEvidence) {
    if (!challenge.inning || !challenge.halfInning) return "Unknown inning";
    return `${challenge.halfInning === "Top" ? "Top" : "Bottom"} ${challenge.inning}`;
}

function formatScoreAtChallenge(challenge: ChallengeEvidence) {
    if (challenge.awayScore === null || challenge.homeScore === null) return "score unavailable";
    return `score ${challenge.awayScore}-${challenge.homeScore}`;
}

function formatCountChange(challenge: ChallengeEvidence) {
    const initial =
        challenge.umpireCount ??
        (challenge.balls !== null && challenge.strikes !== null
            ? `${challenge.balls}-${challenge.strikes}`
            : challenge.countBefore);
    const final = challenge.countAfter;

    if (initial && final) {
        return initial === final ? initial : `${initial} -> ${final}`;
    }

    return initial ?? final ?? "count unavailable";
}

function describeImpactType(impactType: string | null) {
    switch (impactType) {
        case "direct_ending_impact":
            return "plate appearance changed";
        case "direct_count_impact":
            return "count changed";
        case "downstream_inferred_impact":
            return "downstream outcome changed";
        default:
            return "challenge recorded";
    }
}

function challengeWeight(challenge: ChallengeEvidence) {
    const baseWeight =
        challenge.impactType === "direct_ending_impact"
            ? 4
            : challenge.impactType === "downstream_inferred_impact"
                ? 3
                : challenge.impactType === "direct_count_impact"
                    ? 2
                    : 1;

    const lateWeight = challenge.inning !== null && challenge.inning >= 7 ? 1 : 0;
    const overturnedWeight = challenge.isOverturned ? 1 : 0;
    const closeGameWeight =
        challenge.homeScore !== null && challenge.awayScore !== null && Math.abs(challenge.homeScore - challenge.awayScore) <= 2
            ? 0.75
            : 0;

    return baseWeight + lateWeight + overturnedWeight + closeGameWeight;
}

function selectTopMoments(challenges: ChallengeEvidence[]) {
    return [...challenges].sort((a, b) => {
        const scoreDelta = challengeWeight(b) - challengeWeight(a);
        if (scoreDelta !== 0) return scoreDelta;

        const timeA = a.challengedAt ? new Date(a.challengedAt).getTime() : 0;
        const timeB = b.challengedAt ? new Date(b.challengedAt).getTime() : 0;
        return timeB - timeA;
    });
}

function buildTeamLedgers(context: GameReportContext, challenges: ChallengeEvidence[]) {
    const initial = new Map<string, TeamLedger>([
        [context.homeName, { teamName: context.homeName, total: 0, overturned: 0 }],
        [context.awayName, { teamName: context.awayName, total: 0, overturned: 0 }],
    ]);

    for (const challenge of challenges) {
        const teamName = challenge.challengeTeamName ?? "Unknown team";
        const existing = initial.get(teamName) ?? { teamName, total: 0, overturned: 0 };
        existing.total += 1;
        if (challenge.isOverturned) {
            existing.overturned += 1;
        }
        initial.set(teamName, existing);
    }

    return [context.homeName, context.awayName]
        .map((teamName) => initial.get(teamName) ?? { teamName, total: 0, overturned: 0 })
        .filter((ledger) => ledger.total > 0 || ledger.teamName === context.homeName || ledger.teamName === context.awayName);
}

function buildLocationQualityLine(challenges: ChallengeEvidence[]) {
    if (challenges.length === 0) {
        return "No challenge rows were available, so there was no location evidence to evaluate.";
    }

    const withTrackedCoordinates = challenges.filter(
        (challenge) =>
            challenge.px !== null &&
            challenge.pz !== null &&
            challenge.strikeZoneTop !== null &&
            challenge.strikeZoneBottom !== null,
    ).length;
    const inferredCount = challenges.filter(
        (challenge) => Boolean(challenge.inferenceMethod) || challenge.locationSource === "inferred",
    ).length;

    if (withTrackedCoordinates === 0) {
        return "Pitch-location evidence was limited, so any strike-zone read should stay conservative.";
    }

    if (inferredCount > 0) {
        return `Pitch-location evidence was available on **${withTrackedCoordinates} of ${challenges.length}** challenges, but **${inferredCount}** relied on inferred coordinates, so zone takeaways should stay measured.`;
    }

    return `Pitch-location evidence was available on **${withTrackedCoordinates} of ${challenges.length}** challenges, which gives the umpire section enough support for a limited zone read.`;
}

function buildLocationCaveat(challenges: ChallengeEvidence[]) {
    const inferredCount = challenges.filter(
        (challenge) => Boolean(challenge.inferenceMethod) || challenge.locationSource === "inferred",
    ).length;

    if (inferredCount > 0) {
        return `${inferredCount} challenge locations relied on inferred coordinates, so any zone commentary should be treated as directional rather than exact.`;
    }

    const trackedCount = challenges.filter(
        (challenge) =>
            challenge.px !== null &&
            challenge.pz !== null &&
            challenge.strikeZoneTop !== null &&
            challenge.strikeZoneBottom !== null,
    ).length;

    if (trackedCount === 0) {
        return "No tracked pitch coordinates were available for these challenges, so zone-level commentary is intentionally limited.";
    }

    return "The report is based on challenge events only, not the full pitch-by-pitch plate appearance context.";
}

function buildEvidencePacket(context: GameReportContext, challenges: ChallengeEvidence[]) {
    const totalChallenges = challenges.length;
    const overturned = challenges.filter((challenge) => challenge.isOverturned).length;
    const confirmed = Math.max(0, totalChallenges - overturned);
    const ledgers = buildTeamLedgers(context, challenges);
    const topMoments = selectTopMoments(challenges).slice(0, Math.min(3, totalChallenges));
    const inningDistribution = Array.from(
        challenges.reduce((map, challenge) => {
            const key = formatHalfInning(challenge);
            map.set(key, (map.get(key) ?? 0) + 1);
            return map;
        }, new Map<string, number>()),
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([inningLabel, count]) => `${inningLabel}: ${count}`)
        .join(", ");
    const countClusters = Array.from(
        challenges.reduce((map, challenge) => {
            const key = challenge.countBefore ?? challenge.umpireCount ?? "unknown";
            map.set(key, (map.get(key) ?? 0) + 1);
            return map;
        }, new Map<string, number>()),
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([countLabel, count]) => `${countLabel}: ${count}`)
        .join(", ");

    return [
        "GAME FACTS",
        `- Matchup: ${context.awayName} at ${context.homeName}`,
        `- Venue: ${context.venueName ?? "Venue unavailable"}`,
        `- Date: ${context.gameDate}`,
        `- Final score: ${context.awayScore !== null && context.homeScore !== null ? `${context.awayName} ${context.awayScore}, ${context.homeName} ${context.homeScore}` : "Unavailable"}`,
        `- Total challenges: ${totalChallenges}`,
        `- Overturned: ${overturned}`,
        `- Confirmed: ${confirmed}`,
        "",
        "TEAM LEDGER",
        ...ledgers.map((ledger) => `- ${ledger.teamName}: ${ledger.overturned}/${ledger.total} overturned`),
        `- Plate umpire line: ${overturned}/${totalChallenges} overturned`,
        "",
        "GAME SHAPE",
        `- Most active innings: ${inningDistribution || "No challenges recorded"}`,
        `- Most common counts: ${countClusters || "No count clusters available"}`,
        `- Late-and-close challenges: ${challenges.filter((challenge) => (challenge.inning ?? 0) >= 7 && challenge.homeScore !== null && challenge.awayScore !== null && Math.abs(challenge.homeScore - challenge.awayScore) <= 2).length}`,
        "",
        "TOP CHALLENGES",
        ...(topMoments.length > 0
            ? topMoments.map(
                (challenge, index) =>
                    `${index + 1}. ${formatHalfInning(challenge)} | ${challenge.challengeTeamName ?? "Unknown club"} | ${challenge.challengePlayerName ?? challenge.batterName ?? "Unknown player"} | ${challenge.calledDescription ?? "called pitch"} | ${challenge.isOverturned ? "overturned" : "confirmed"} | count ${formatCountChange(challenge)} | ${formatScoreAtChallenge(challenge)} | impact ${describeImpactType(challenge.impactType)} | note ${challenge.impactSummary ?? "No extra summary available."}`,
            )
            : ["1. No challenge events recorded."]),
        "",
        "DATA QUALITY",
        `- ${buildLocationQualityLine(challenges).replace(/\*\*/g, "")}`,
        `- Inferred locations: ${challenges.filter((challenge) => Boolean(challenge.inferenceMethod) || challenge.locationSource === "inferred").length}`,
        `- Tracked pitch coordinates: ${challenges.filter((challenge) => challenge.px !== null && challenge.pz !== null).length}/${totalChallenges}`,
    ].join("\n");
}

async function loadGameReportContext(gamePk: number): Promise<GameReportContext | null> {
    const row = await sqlOne<{
        gamepk: number;
        gamedate: string;
        homename: string | null;
        awayname: string | null;
        homescore: number | null;
        awayscore: number | null;
        venuename: string | null;
        statusabstract: string | null;
    }>(
        `
        SELECT
          g.game_pk AS gamePk,
          g.game_date::text AS gameDate,
          home.name AS homeName,
          away.name AS awayName,
          g.home_score AS homeScore,
          g.away_score AS awayScore,
          g.venue_name AS venueName,
          g.status_abstract AS statusAbstract
        FROM games g
        LEFT JOIN teams home ON home.team_id = g.home_team_id
        LEFT JOIN teams away ON away.team_id = g.away_team_id
        WHERE g.game_pk = $1
        `,
        [gamePk],
    );

    if (!row || !row.homename || !row.awayname) {
        return null;
    }

    return {
        gamePk: row.gamepk,
        gameDate: row.gamedate,
        homeName: row.homename,
        awayName: row.awayname,
        homeScore: row.homescore,
        awayScore: row.awayscore,
        venueName: row.venuename,
        statusAbstract: row.statusabstract,
    };
}

async function loadChallengeEvidence(gamePk: number): Promise<ChallengeEvidence[]> {
    const rows = await sql<{
        challenge_id: string;
        challenged_at: string | null;
        inning: number | null;
        half_inning: string | null;
        balls: number | null;
        strikes: number | null;
        outs: number | null;
        bases_state: string | null;
        home_score: number | null;
        away_score: number | null;
        challenge_team_name: string | null;
        challenge_player_name: string | null;
        batter_name: string | null;
        pitcher_name: string | null;
        called_description: string | null;
        pitchnumber: number | null;
        pitchtype: string | null;
        startspeed: number | null;
        is_overturned: boolean;
        px: number | null;
        pz: number | null;
        strike_zone_top: number | null;
        strike_zone_bottom: number | null;
        balls_before: number | null;
        strikes_before: number | null;
        balls_after: number | null;
        strikes_after: number | null;
        impact_type: string | null;
        impact_summary: string | null;
        location_source: string | null;
        inference_method: string | null;
        inference_confidence: string | null;
    }>(
        `
        SELECT DISTINCT ON (c.challenge_id)
          c.challenge_id,
          c.challenged_at,
          c.inning,
          c.half_inning,
          c.balls,
          c.strikes,
          c.outs,
          c.bases_state,
          c.home_score,
          c.away_score,
          t.name AS challenge_team_name,
          c.challenge_player_name,
          c.batter_name,
          c.pitcher_name,
          p.called_description,
          COALESCE(c.pitch_number, c.inferred_pitch_number) AS pitchNumber,
          p.pitch_type_description AS pitchType,
          p.start_speed AS startSpeed,
          c.is_overturned,
          c.resolved_px AS px,
          c.resolved_pz AS pz,
          c.resolved_strike_zone_top AS strike_zone_top,
          c.resolved_strike_zone_bottom AS strike_zone_bottom,
          p.balls_before,
          p.strikes_before,
          p.balls_after,
          p.strikes_after,
          timeline.impact_type,
          timeline.impact_summary,
          c.resolved_location_source AS location_source,
          c.inference_method,
          c.inference_confidence
        FROM mart_abs_pitch_challenges c
        LEFT JOIN teams t ON t.team_id = c.challenge_team_id
        LEFT JOIN pitches p
          ON p.game_pk = c.game_pk
          AND p.at_bat_index = c.at_bat_index
          AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
        LEFT JOIN mart_game_pitch_timeline timeline
          ON timeline.challenge_id = c.challenge_id
        WHERE c.game_pk = $1
        ORDER BY c.challenge_id, c.challenged_at ASC NULLS LAST
        `,
        [gamePk],
    );

    return rows
        .map((row) => ({
            challengeId: row.challenge_id,
            challengedAt: row.challenged_at,
            inning: row.inning,
            halfInning: row.half_inning,
            balls: row.balls,
            strikes: row.strikes,
            outs: row.outs,
            basesState: row.bases_state,
            homeScore: row.home_score,
            awayScore: row.away_score,
            challengeTeamName: row.challenge_team_name,
            challengePlayerName: row.challenge_player_name,
            batterName: row.batter_name,
            pitcherName: row.pitcher_name,
            calledDescription: row.called_description,
            pitchNumber: row.pitchnumber,
            pitchType: row.pitchtype,
            startSpeed: row.startspeed === null ? null : Number(row.startspeed),
            isOverturned: row.is_overturned,
            px: row.px === null ? null : Number(row.px),
            pz: row.pz === null ? null : Number(row.pz),
            strikeZoneTop: row.strike_zone_top === null ? null : Number(row.strike_zone_top),
            strikeZoneBottom: row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom),
            countBefore:
                row.balls_before === null || row.strikes_before === null ? null : `${row.balls_before}-${row.strikes_before}`,
            countAfter:
                row.balls_after === null || row.strikes_after === null ? null : `${row.balls_after}-${row.strikes_after}`,
            umpireCount: (() => {
                if (row.balls_before === null || row.strikes_before === null) return null;
                if (!row.is_overturned) {
                    return row.balls_after === null || row.strikes_after === null ? null : `${row.balls_after}-${row.strikes_after}`;
                }
                if (row.balls_after !== null && row.balls_after > row.balls_before) {
                    return `${row.balls_before}-${row.strikes_before + 1}`;
                }
                if (row.strikes_after !== null && row.strikes_after > row.strikes_before) {
                    return `${row.balls_before + 1}-${row.strikes_before}`;
                }
                return row.balls_after === null || row.strikes_after === null ? null : `${row.balls_after}-${row.strikes_after}`;
            })(),
            impactType: row.impact_type,
            impactSummary: row.impact_summary,
            locationSource: row.location_source,
            inferenceMethod: row.inference_method,
            inferenceConfidence: row.inference_confidence,
        }))
        .sort((a, b) => {
            const timeA = a.challengedAt ? new Date(a.challengedAt).getTime() : 0;
            const timeB = b.challengedAt ? new Date(b.challengedAt).getTime() : 0;
            return timeA - timeB;
        });
}

async function buildNarrative(summaryPrompt: string, modelName: string) {
    if (!openai) return null;

    try {
        const response = await openai.responses.create({
            model: modelName,
            input: summaryPrompt,
        });

        const narrative = response.output_text.trim() || null;
        if (!narrative) return null;

        return {
            narrative,
            inputTokens: response.usage?.input_tokens ?? Math.ceil(summaryPrompt.length / 4),
            outputTokens: response.usage?.output_tokens ?? Math.ceil(narrative.length / 4),
        };
    } catch {
        return null;
    }
}

export async function canManageGameReports(): Promise<boolean> {
    return canAccessAdmin();
}

export async function assertCanManageGameReports(): Promise<void> {
    await requireOwnerAdmin();
}

export async function regenerateGameReport(gamePk: number) {
    const [context, challenges] = await Promise.all([
        loadGameReportContext(gamePk),
        loadChallengeEvidence(gamePk),
    ]);

    if (!context) {
        throw new Error("Game not found");
    }

    if (!["Final", "Game Over"].includes(context.statusAbstract ?? "")) {
        throw new Error("Game debriefs are only available after a final result.");
    }

    const summaryPrompt = buildSummaryPrompt(context, challenges);
    let modelName = DEFAULT_SUMMARY_MODEL;
    let usage = { inputTokens: Math.ceil(summaryPrompt.length / 4), outputTokens: 0 };
    const generated = await buildNarrative(summaryPrompt, modelName);
    let narrative = generated?.narrative ?? null;

    if (generated) {
        usage = {
            inputTokens: generated.inputTokens,
            outputTokens: generated.outputTokens,
        };
    }

    if (!narrative) {
        narrative = buildFallbackNarrative(context, challenges);
        modelName = "fallback";
        usage.outputTokens = Math.ceil(narrative.length / 4);
    }

    const chartSpec = {
        type: "bar",
        title: "Challenges vs Overturned",
        data: [
            { label: "Challenges", value: challenges.length },
            { label: "Overturned", value: challenges.filter((challenge) => challenge.isOverturned).length },
        ],
    };

    const row = await withTransaction(async (query) => {
        const result = await query<{ generatedat: string }>(
            `
            INSERT INTO game_reports (game_pk, model_name, narrative_md, chart_spec, generated_at)
            VALUES ($1, $2, $3, $4::jsonb, NOW())
            ON CONFLICT (game_pk) DO UPDATE SET
              model_name = EXCLUDED.model_name,
              narrative_md = EXCLUDED.narrative_md,
              chart_spec = EXCLUDED.chart_spec,
              generated_at = NOW()
            RETURNING generated_at AS generatedAt
            `,
            [context.gamePk, modelName, narrative, JSON.stringify(chartSpec)],
        );

        await recordAiGenerationEventWithQuery(query, {
            surfaceKey: "game_debrief",
            surfaceDetail: "postgame_report",
            targetType: "game_report",
            targetId: String(context.gamePk),
            gamePk: context.gamePk,
            provider: modelName === "fallback" ? "template" : "openai",
            modelName,
            promptVersion: "game_debrief_v2",
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            estimatedCostUsd:
                modelName === "fallback"
                    ? 0
                    : estimateAiCostUsd({
                        provider: "openai",
                        modelName,
                        inputTokens: usage.inputTokens,
                        outputTokens: usage.outputTokens,
                    }),
            status: modelName === "fallback" ? "fallback" : "succeeded",
            metadata: {
                challengeCount: challenges.length,
                overturnedCount: challenges.filter((challenge) => challenge.isOverturned).length,
            },
        });

        return result[0] ?? null;
    });

    if (!row) {
        throw new Error("Unable to store game report");
    }

    return {
        gamePk: context.gamePk,
        generatedAt: row.generatedat,
        modelName,
    };
}
