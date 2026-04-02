"use client";

import dynamic from "next/dynamic";

import type { LiveGameCard } from "@/lib/types";

const HomeExpandableGrid = dynamic(
  () => import("@/components/home-expandable-grid").then((mod) => mod.HomeExpandableGrid),
  { ssr: false },
);

export function HomeExpandableGridShell({ games }: { games: LiveGameCard[] }) {
  return <HomeExpandableGrid games={games} />;
}
