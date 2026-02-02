"use client";

import type { Role } from "@impostor/shared";

type Props = {
  role?: Role;
};

export default function RoleReveal({ role }: Props) {
  return (
    <div className="card">
      <h2>Tu rol</h2>
      <p>{role ? role.toUpperCase() : "..."}</p>
      <p>Memorizalo, luego la pantalla cambiará.</p>
    </div>
  );
}
