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
});
