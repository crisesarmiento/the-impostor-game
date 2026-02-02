"use client";

import type { Player } from "@impostor/shared";
import Timer from "./Timer";

type Props = {
  players: Player[];
  allowSkip: boolean;
  onVote: (id: string | "skip") => void;
  endsAt?: number;
};

export default function Voting({ players, allowSkip, onVote, endsAt }: Props) {
  const alive = players.filter((p) => p.isAlive);
  return (
    <div className="card">
      <h2>Votación</h2>
      <Timer endsAt={endsAt} />
      {alive.map((p) => (
        <button key={p.id} className="btn secondary" onClick={() => onVote(p.id)}>
          Votar a {p.nickname}
        </button>
      ))}
      {allowSkip ? (
        <button className="btn" onClick={() => onVote("skip")}>
          Skip vote
        </button>
      ) : null}
    </div>
  );
}
