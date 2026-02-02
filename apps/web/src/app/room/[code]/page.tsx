"use client";

import { useEffect, useMemo, useState } from "react";
import type { Room, Role, ServerEvent } from "@impostor/shared";
import { PartyClient } from "../../../lib/partyClient";
import { getClientId, getNickname, getReconnectToken, getRoomPassword, setReconnectToken } from "../../../lib/storage";
import Lobby from "../../components/Lobby";
import RoleReveal from "../../components/RoleReveal";
import Discussion from "../../components/Discussion";
import Voting from "../../components/Voting";
import Reveal from "../../components/Reveal";

type Props = {
  params: { code: string };
};

export default function RoomPage({ params }: Props) {
  const roomCode = params.code.toUpperCase();
  const [client, setClient] = useState<PartyClient | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [youId, setYouId] = useState<string>("");
  const [yourRole, setYourRole] = useState<Role | undefined>(undefined);

  useEffect(() => {
    const party = new PartyClient({
      roomCode,
      onEvent: (event: ServerEvent) => {
        if (event.type === "syncState") {
          setRoom(event.payload.state);
          setYouId(event.payload.youId);
          setYourRole(event.payload.yourRole);
          if (event.payload.reconnectToken) {
            setReconnectToken(event.payload.reconnectToken);
          }
        }
      },
    });
    setClient(party);
    return () => {
      party.close();
      setClient(null);
    };
  }, [roomCode]);

  useEffect(() => {
    if (!client) return;
    const nickname = getNickname();
    const clientId = getClientId();
    const reconnectToken = getReconnectToken() ?? undefined;
    const password = getRoomPassword() ?? undefined;
    if (nickname) {
      client.send({
        type: "joinRoom",
        payload: { roomCode, nickname, clientId, password, reconnectToken },
      });
    }
  }, [client, roomCode]);

  useEffect(() => {
    if (!client) return;
    const id = setInterval(() => {
      client.send({ type: "heartbeat", payload: { clientId: getClientId(), at: Date.now() } });
    }, 20000);
    return () => clearInterval(id);
  }, [client]);

  const you = useMemo(() => room?.players.find((p) => p.id === youId), [room, youId]);
  const phase = room?.currentRound?.phase ?? "lobby";

  if (!room) {
    return <div className="card">Conectando...</div>;
  }

  return (
    <div>
      {phase === "lobby" && client ? (
        <Lobby
          room={room}
          youId={youId}
          onStart={() => client.send({ type: "startRound", payload: {} })}
          onKick={(id) => client.send({ type: "kickPlayer", payload: { playerId: id } })}
        />
      ) : null}
      {phase === "role" ? <RoleReveal role={yourRole} /> : null}
      {phase === "discussion" ? <Discussion endsAt={room.currentRound?.phaseEndsAt} /> : null}
      {phase === "voting" && client ? (
        <Voting
          players={room.players}
          allowSkip={room.settings.allowSkipVote}
          endsAt={room.currentRound?.phaseEndsAt}
          onVote={(id) => client.send({ type: "castVote", payload: { targetId: id } })}
        />
      ) : null}
      {phase === "reveal" || phase === "ended" ? (
        <Reveal
          expelledName={room.currentRound?.expelledId ? room.players.find((p) => p.id === room.currentRound?.expelledId)?.nickname : undefined}
          wasImpostor={room.currentRound?.wasImpostor}
          winner={room.currentRound?.winner}
          isHost={Boolean(you?.isHost)}
          onRestart={() => client?.send({ type: "restartRound", payload: {} })}
        />
      ) : null}
    </div>
  );
}
