import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Impostor vs Crew",
  description: "Juego social por voz",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
