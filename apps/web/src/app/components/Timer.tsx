"use client";

import { useEffect, useState } from "react";

type Props = {
  endsAt?: number;
};

export default function Timer({ endsAt }: Props) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const ms = Math.max(0, endsAt - Date.now());
      setRemaining(ms);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  const seconds = Math.ceil(remaining / 1000);
  return <div className="timer">{seconds}s</div>;
}
