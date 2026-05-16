"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import { Download, Printer } from "lucide-react";

interface Props {
  targetId: string;
  filename?: string;
}

export default function ExportButton({ targetId, filename = "fixture-ficct" }: Props) {
  const exporting = useRef(false);

  const handleExportPNG = async () => {
    if (exporting.current) return;
    exporting.current = true;

    const el = document.getElementById(targetId);
    if (!el) {
      exporting.current = false;
      return;
    }

    try {
      // html-to-image soporta oklch/oklab usados por Tailwind v4
      const dataUrl = await toPng(el, {
        backgroundColor: "#0d1f13",
        pixelRatio: 2,
        // Filtrar elementos que puedan causar problemas (ej: iframes, scripts)
        filter: (node) => {
          return !(
            node instanceof HTMLScriptElement ||
            node instanceof HTMLIFrameElement
          );
        },
      });

      const a = document.createElement("a");
      a.download = `${filename}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error("Error exportando:", err);
      alert("Error al exportar. Por favor intenta de nuevo.");
    } finally {
      exporting.current = false;
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportPNG}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl backdrop-blur transition-all"
        title="Exportar tabla como imagen PNG"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Exportar PNG</span>
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl backdrop-blur transition-all"
        title="Imprimir fixture"
      >
        <Printer className="w-4 h-4" />
        <span className="hidden sm:inline">Imprimir</span>
      </button>
    </div>
  );
}
