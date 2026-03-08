import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChallengeHashes, getChallengeHashClass, getChallengeHashSlots } from "@/components/challenge-hashes";

describe("ChallengeHashes", () => {
  it("maps remaining challenges to active slots", () => {
    expect(getChallengeHashSlots(2)).toEqual([true, true]);
    expect(getChallengeHashSlots(1)).toEqual([true, false]);
    expect(getChallengeHashSlots(0)).toEqual([false, false]);
    expect(getChallengeHashSlots(9)).toEqual([true, true]);
  });

  it("includes reduced-motion utility classes for active states", () => {
    const active = getChallengeHashClass(true);
    expect(active.className).toContain("motion-reduce:animate-none");
    expect(active.className).toContain("motion-reduce:transition-none");
    expect(active.className).toContain("animate-pop-in");
  });

  it("renders indicator with stable aria label", () => {
    const html = renderToStaticMarkup(<ChallengeHashes remaining={1} />);
    expect(html).toContain("Challenges remaining: 1");
    expect(html).toContain("data-active=\"1\"");
    expect(html).toContain("data-active=\"0\"");
  });

  // ── New: Three-state outcome tests ──

  it("returns won styling with green color token", () => {
    const won = getChallengeHashClass(true, undefined, 'won');
    expect(won.className).toContain("state-overturned-bs");
    expect(won.outcome).toBe('won');
  });

  it("returns lost styling with ink-3 color token", () => {
    const lost = getChallengeHashClass(true, undefined, 'lost');
    expect(lost.className).toContain("ink-3");
    expect(lost.outcome).toBe('lost');
  });

  it("returns default active styling when outcome is null", () => {
    const active = getChallengeHashClass(true, undefined, null);
    expect(active.className).toContain("accent-warm");
    expect(active.outcome).toBeNull();
  });

  it("renders ✓ SVG for won outcome", () => {
    const html = renderToStaticMarkup(
      <ChallengeHashes remaining={2} outcomes={['won', null]} />
    );
    expect(html).toContain('data-outcome="won"');
    expect(html).toContain('data-outcome="none"');
    // Check the checkmark path is present
    expect(html).toContain("M2.5 6.5L5 9L9.5 3.5");
  });

  it("renders ✕ SVG for lost outcome", () => {
    const html = renderToStaticMarkup(
      <ChallengeHashes remaining={2} outcomes={['lost', null]} />
    );
    expect(html).toContain('data-outcome="lost"');
    // Check the X path is present
    expect(html).toContain("M3 3L9 9M9 3L3 9");
  });
});
