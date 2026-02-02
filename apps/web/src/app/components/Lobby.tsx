"use client";

import type { Player, Room } from "@impostor/shared";

type Props = {
  room: Room;
  youId: string;
  onStart: () => void;
  onKick: (id: string) => void;
};

export default function Lobby({ room, youId, onStart, onKick }: Props) {
  const you = room.players.find((p) => p.id === youId);
  const isHost = you?.isHost;
  return (
    <div className="card">
      <h2>Lobby — Sala {room.code}</h2>
      <p>Jugadores ({room.players.length}/{room.settings.maxPlayers})</p>
      <ul>
        {room.players.map((p: Player) => (
          <li key={p.id}>
            {p.nickname} {p.isHost ? "(Host)" : ""} {!p.isAlive ? "(Muerto)" : ""}
            {isHost && p.id !== youId ? (
              <button className="btn secondary" onClick={() => onKick(p.id)}>
                Expulsar
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {isHost ? (
        <button className="btn" onClick={onStart}>
          Iniciar ronda
        </button>
      ) : (
        <p>Esperando a que el host inicie...</p>
      )}
    </div>
  );
}
