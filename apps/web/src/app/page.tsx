"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setNickname, setRoomPassword } from "../lib/storage";

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNick] = useState("");
  const [password, setPassword] = useState("");

  const onJoin = () => {
    if (!roomCode || !nickname) return;
    setNickname(nickname);
    if (password) setRoomPassword(password);
    router.push(`/room/${roomCode.toUpperCase()}`);
  };

  return (
    <div className="card">
      <h1>Impostor vs Crew</h1>
      <label>Código de sala</label>
      <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="ABCD" />
      <label>Nickname</label>
      <input value={nickname} onChange={(e) => setNick(e.target.value)} placeholder="Tu nombre" />
      <label>Password (opcional)</label>
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Solo si hay" />
      <button className="btn" onClick={onJoin}>
        Entrar
      </button>
    </div>
  );
}
