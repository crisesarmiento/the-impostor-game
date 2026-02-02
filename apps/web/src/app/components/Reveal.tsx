"use client";

type Props = {
  expelledName?: string;
  wasImpostor?: boolean;
  winner?: "crew" | "impostor" | "none";
  onRestart?: () => void;
  isHost: boolean;
};

export default function Reveal({ expelledName, wasImpostor, winner, onRestart, isHost }: Props) {
  return (
    <div className="card">
      <h2>Resultado</h2>
      <p>{expelledName ? `Expulsado: ${expelledName}` : "Nadie fue expulsado"}</p>
      {expelledName ? <p>{wasImpostor ? "Era impostor" : "No era impostor"}</p> : null}
      {winner && winner !== "none" ? <p>Ganó: {winner.toUpperCase()}</p> : <p>La ronda continúa.</p>}
      {isHost && onRestart ? (
        <button className="btn" onClick={onRestart}>
          Nueva ronda
        </button>
      ) : null}
    </div>
  );
}
