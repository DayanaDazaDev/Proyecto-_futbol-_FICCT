import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: { default: "FICCT Campeonato de Fútbol", template: "%s · FICCT" },
  description: "Sistema oficial de gestión de campeonatos de fútbol de la FICCT – UAGRM. Fixtures, resultados, estadísticas y más.",
  keywords: ["FICCT", "UAGRM", "campeonato", "fútbol", "fixture", "torneo", "Santa Cruz"],
  authors: [{ name: "FICCT – UAGRM" }],
  openGraph: {
    title: "FICCT Campeonato de Fútbol",
    description: "Sistema oficial de torneos FICCT – UAGRM",
    locale: "es_BO",
    type: "website",
  },
  manifest: "/manifest.json",
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1a5c38",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={outfit.variable}>
      <body className="font-sans bg-gray-50 text-gray-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
