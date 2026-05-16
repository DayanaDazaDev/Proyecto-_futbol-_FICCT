"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, X, QrCode } from "lucide-react";

interface Props {
  url: string;
  tournamentName: string;
}

export default function QRModal({ url, tournamentName }: Props) {
  const [open, setOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const a = document.createElement("a");
      a.download = `qr-${tournamentName.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl backdrop-blur transition-all"
      >
        <QrCode className="w-4 h-4" />
        <span className="hidden sm:inline">Compartir QR</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-gray-900 text-lg mb-1">QR del Torneo</h3>
            <p className="text-gray-500 text-sm mb-6 line-clamp-2">{tournamentName}</p>

            <div ref={qrRef} className="flex justify-center mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <QRCodeSVG
                value={url}
                size={200}
                fgColor="#1a5c38"
                bgColor="#ffffff"
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-xs text-gray-400 mb-5 break-all">{url}</p>

            <button
              onClick={downloadQR}
              className="w-full flex items-center justify-center gap-2 bg-[#1a5c38] hover:bg-[#14472b] text-white font-bold py-3 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar QR (PNG)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
