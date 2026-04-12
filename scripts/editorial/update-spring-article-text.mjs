/**
 * One-time script: push updated article wording into the serving DB.
 *
 * Changes (from codex ui-fix edits):
 *   - Article intro (body_md on the article row) rewritten
 *   - Section 3 "sample_size_context" rewritten
 *   - Section 4 "regular_season_outlook" rewritten
 *   - Section 5 "evidence_notes" removed entirely
 *   - New revision record created
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/editorial/update-spring-article-text.mjs
 */

import { Client } from "pg";

const ARTICLE_ID = "447c99b2-710e-4caa-8f28-ce6e9e8f77db";

// ── New intro (article.body_md) ──────────────────────────────────────────────
const NEW_INTRO = `Spring was supposed to introduce ABS to baseball. What it actually gave us was something more valuable: the first usable sample of how clubs might live with it on a daily basis, and the early outlines of which organizations are going to treat this system as a managed resource versus a corrective afterthought.

Across 451 final Spring Training games, MLB clubs used the ABS challenge system 1,913 times, producing an overall overturn rate of 52.9 percent. More important than those headline numbers is the context that surrounds them. At least one challenge appeared in 443 of those 451 games, over 98 percent of the sample. That saturation matters because it tells us ABS stopped being a novelty somewhere around mid-camp. By the final week, challenges were appearing in normal game flow, which means the more interesting question was no longer whether teams would use the system. It was how they would choose to use it, and why.

My read from the spring is straightforward: clubs are already separating into different operating styles, and the separation is real enough to notice even in a small-sample environment. Some teams challenged often. Some challenged early. Some held their challenge traffic for the back half of games. And the data hints that the most revealing distinction is not raw volume at all. It is what kind of challenge environment a club is willing to enter in the first place, and when.

That does not mean spring solved ABS. The sample is genuinely too thin to make permanent claims about organizational quality or strategic superiority. What it does mean is that the data is now large enough to surface directional behavior, which is exactly the thing worth paying attention to before Opening Day.`;

// ── New section 3: sample_size_context ────────────────────────────────────────
const NEW_SAMPLE_SIZE = `This is where the spring data requires careful handling.

The league-level sample is meaningful. Over 1,900 challenges across 451 games is enough to say that ABS was heavily used and that team behavior was not flat. But the moment analysis moves into team or umpire splits, the sample thins out fast, and the appropriate level of confidence thins out with it. Even within the 40-plus-challenge group, the range only runs from 40 to 101 challenges per club. That is enough to identify tendencies. It is not enough to declare which organizations are smartest about this, or which dugouts are already optimized.

The umpire picture deserves the same caution. Jen Pawol and Mitch Trzeciak each saw 47 challenged calls, Pete Talkington saw 40. The overturn range among umpires with at least 25 challenged calls ran from Charlie Welling at 64.7 percent down to Macon Hammond at 36.0 percent, a 28-point gap that is wide enough to notice, but not stable enough to convert into hard reputational claims about specific umpires. The right interpretation is narrower: ABS pressure was not evenly distributed, and some plate environments produced meaningfully different review outcomes than others.

That should matter to clubs, because ABS is not experienced in the abstract. It is experienced against particular catcher setups, hitter profiles, dugout habits, and umpire environments. Spring did not settle how those variables interact, but it did show they are already interacting. Clubs that treat the system as uniform across all those dimensions are probably modeling it wrong.`;

// ── New section 4: regular_season_outlook ─────────────────────────────────────
const NEW_REGULAR_SEASON = `The most responsible spring conclusion is not that one team already gets ABS while another does not. It is that some clubs appear to have entered the system with genuinely different priors, and if those priors hold, they will produce different strategic bets as the season develops.

Some of those differences probably reflect organizational preparation. Some may reflect who is empowered to initiate a challenge in the dugout and under what conditions. Some reflect different tolerance for early-game deployment versus late-game conservation. And some will simply turn out to be spring noise that evaporates by mid-April.

But if the broad profiles are real, and that is the key conditional, the regular season may reveal clubs making distinctly different wagers. Whether to use ABS aggressively as a correction tool from the first inning or preserve it for the situations where it costs the most to be wrong. Whether a lower overall overturn rate can still be strategically valuable if it is concentrated in the highest-leverage spots. Whether some dugouts are entering games with a clearer mental model of what kinds of misses are worth contesting and what kinds are not.

That last one is the question that matters most going into Opening Day. Not who won the spring overturn rate, but whether the spring profiles were the first evidence of actual organizational philosophy, or just six weeks of experimentation without a conclusion.

The Yankees staying a high-volume club, the Twins and Angels remaining front-loaded, the Cardinals or Cubs continuing to weight late innings: if those patterns hold into May, spring starts to look less like noise and more like the first sketch of a real ABS identity. If they do not hold, then we will have learned something important about how hard it is to sustain a coherent challenge strategy across a 162-game season.

Spring did not solve the system. But it gave ABS its first visible shape, and that is more than enough to work with.`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query("BEGIN");

    // 1. Update article intro
    const artResult = await client.query(
      `UPDATE editorial.articles
         SET body_md     = $2,
             updated_at  = NOW()
       WHERE article_id  = $1
       RETURNING article_id`,
      [ARTICLE_ID, NEW_INTRO],
    );
    if (!artResult.rowCount) throw new Error("Article row not found");
    console.log("✓ Updated article intro");

    // 2. Update section 3 (sample_size_context)
    const s3 = await client.query(
      `UPDATE editorial.article_sections
         SET body_md = $2
       WHERE article_id = $1 AND section_key = 'sample_size_context'
       RETURNING section_key`,
      [ARTICLE_ID, NEW_SAMPLE_SIZE],
    );
    if (!s3.rowCount) throw new Error("Section sample_size_context not found");
    console.log("✓ Updated section: sample_size_context");

    // 3. Update section 4 (regular_season_outlook)
    const s4 = await client.query(
      `UPDATE editorial.article_sections
         SET body_md = $2
       WHERE article_id = $1 AND section_key = 'regular_season_outlook'
       RETURNING section_key`,
      [ARTICLE_ID, NEW_REGULAR_SEASON],
    );
    if (!s4.rowCount) throw new Error("Section regular_season_outlook not found");
    console.log("✓ Updated section: regular_season_outlook");

    // 4. Delete Evidence Notes section
    const del = await client.query(
      `DELETE FROM editorial.article_sections
       WHERE article_id = $1 AND section_key = 'evidence_notes'
       RETURNING section_key`,
      [ARTICLE_ID],
    );
    console.log(`✓ Deleted evidence_notes section (${del.rowCount} row)`);

    // 5. Insert revision record
    const revResult = await client.query(
      `SELECT COALESCE(MAX(revision_number), 0) + 1 AS next
       FROM editorial.article_revisions
       WHERE article_id = $1`,
      [ARTICLE_ID],
    );
    const nextRevision = revResult.rows[0]?.next ?? 1;

    await client.query(
      `INSERT INTO editorial.article_revisions (
         article_id, revision_number, title, dek, body_md,
         facts_payload, revision_note, created_by_user_id
       )
       VALUES ($1, $2, $3, $4, $5, NULL, $6, NULL)`,
      [
        ARTICLE_ID,
        nextRevision,
        "What Spring Training Taught Us About ABS",
        "MLB's first full spring of challenge-era ABS showed real team separation, real umpire variance, and early evidence that challenge timing may matter more than raw volume.",
        NEW_INTRO,
        "Editorial text update: tightened prose in intro, sample-size, and outlook sections; removed Evidence Notes section",
      ],
    );
    console.log(`✓ Created revision #${nextRevision}`);

    await client.query("COMMIT");
    console.log("\n✅ All changes committed to serving DB");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Rolled back:", err.message);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
