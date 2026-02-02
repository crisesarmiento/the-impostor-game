"use client";

import Timer from "./Timer";

type Props = {
  endsAt?: number;
};

export default function Discussion({ endsAt }: Props) {
  return (
    <div className="card">
      <h2>Discusión</h2>
      <Timer endsAt={endsAt} />
      <p>Hablá y defendé tu caso.</p>
    </div>
  );
}
