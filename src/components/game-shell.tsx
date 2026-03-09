import { GameScoreboard } from "@/components/game-scoreboard";
import { MatchupBackdrop } from "@/components/game-hub/matchup-backdrop";
import { LiveStatusStrip } from "@/components/live-status-strip";
import { MotionIn } from "@/components/motion-in";
import type { GameLiveStatus } from "@/lib/types";
import type { MatchupBackdropState } from "@/lib/team-backdrops";

type GameShellProps = {
  game: {
    gamepk: number;
    gamedate: string;
    statusabstract: string;
    statusdetailed: string | null;
    hometeamid: number;
    hometeamname: string;
    homescore: number | null;
    homeabbreviation: string | null;
    homeprimarycolor: string | null;
    homesecondarycolor: string | null;
    homelogosvgurl: string | null;
    awayteamid: number;
    awayteamname: string;
    awayscore: number | null;
    awayabbreviation: string | null;
    awayprimarycolor: string | null;
    awaysecondarycolor: string | null;
    awaylogosvgurl: string | null;
    venue: string | null;
  };
  liveStatus: GameLiveStatus | null;
  counters: {
    homeRemaining: number;
    awayRemaining: number;
  } | null;
};

export function GameShell({ game, liveStatus, counters }: GameShellProps) {
  const backdropState: MatchupBackdropState =
    game.statusabstract === "Final" || game.statusabstract === "Game Over"
      ? "final"
      : game.statusabstract === "Preview" || game.statusabstract === "Warmup"
        ? "pregame"
        : "live";
  const winnerTeamId =
    game.homescore == null || game.awayscore == null || game.homescore === game.awayscore
      ? null
      : game.homescore > game.awayscore
        ? Number(game.hometeamid)
        : Number(game.awayteamid);

  return (
    <>
      <MotionIn>
        <MatchupBackdrop
          gamePk={Number(game.gamepk)}
          state={backdropState}
          status={game.statusabstract}
          homeTeamId={Number(game.hometeamid)}
          homeTeamName={game.hometeamname}
          homeAbbreviation={game.homeabbreviation}
          homePrimaryColor={game.homeprimarycolor}
          homeSecondaryColor={game.homesecondarycolor}
          homeLogoSvgUrl={game.homelogosvgurl}
          awayTeamId={Number(game.awayteamid)}
          awayTeamName={game.awayteamname}
          awayAbbreviation={game.awayabbreviation}
          awayLogoSvgUrl={game.awaylogosvgurl}
          eyebrow={`Game ${game.gamepk}`}
          title={`${game.awayteamname} at ${game.hometeamname}`}
          subtitle={game.venue ?? "Venue N/A"}
          dateStr={game.gamedate}
          winnerTeamId={winnerTeamId}
        />
      </MotionIn>

      <MotionIn delay={0.04}>
        <section className="mt-4">
          <GameScoreboard
            status={game.statusabstract}
            detailedState={game.statusdetailed}
            inning={liveStatus?.inning ?? null}
            halfInning={liveStatus?.halfInning ?? null}
            balls={liveStatus?.balls ?? null}
            strikes={liveStatus?.strikes ?? null}
            outs={liveStatus?.outs ?? null}
            away={{
              id: Number(game.awayteamid),
              name: game.awayteamname,
              abbreviation: game.awayabbreviation,
              runs: liveStatus?.awayScore ?? game.awayscore,
              hits: null,
              errors: null,
              challengesRemaining: counters?.awayRemaining ?? liveStatus?.awayRemaining ?? 0,
            }}
            home={{
              id: Number(game.hometeamid),
              name: game.hometeamname,
              abbreviation: game.homeabbreviation,
              runs: liveStatus?.homeScore ?? game.homescore,
              hits: null,
              errors: null,
              challengesRemaining: counters?.homeRemaining ?? liveStatus?.homeRemaining ?? 0,
            }}
          />
        </section>
      </MotionIn>

      <MotionIn delay={0.08}>
        <section className="mt-4">
          <LiveStatusStrip gamePk={Number(game.gamepk)} initial={liveStatus} />
        </section>
      </MotionIn>
    </>
  );
}
