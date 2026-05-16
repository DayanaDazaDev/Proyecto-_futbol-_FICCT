"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Clock, MapPin, Filter, X, Share2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round: string;
  home_goals: number | null;
  away_goals: number | null;
  is_played: boolean;
  status: string | null;
  match_date: string | null;
  match_time: string | null;
  location: string | null;
  referee_notes: string | null;
  match_started_at?: string | null;
}

interface Props {
  matches: Match[];
  teams: Team[];
  tournamentSlug: string;
  tournamentId: string;
}

// ── Countdown hasta fecha del partido ──
function useCountdown(match: Match) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!match.match_date || match.status !== "scheduled" || match.is_played) return;
    const target = new Date(`${match.match_date}T${match.match_time || "00:00"}:00`);

    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}d ${h}h`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else setTimeLeft(`${m} min`);
    };

    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [match]);

  return timeLeft;
}

// ── Minutos transcurridos en partido en vivo ──
function useLiveMinute(match: Match) {
  const [minute, setMinute] = useState<number | null>(null);

  useEffect(() => {
    if (match.status !== "live") { setMinute(null); return; }
    const started = match.match_started_at ? new Date(match.match_started_at).getTime() : null;
    if (!started) return;

    const tick = () => {
      const m = Math.floor((Date.now() - started) / 60000);
      setMinute(Math.min(m, 120));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [match.status, match.match_started_at]);

  return minute;
}

// ── Tarjeta de partido individual ──
function MatchCard({ match, teams, tournamentSlug }: { match: Match; teams: Team[]; tournamentSlug: string }) {
  const getTeam = (id: string) => teams.find(t => t.id === id);
  const home = getTeam(match.home_team_id);
  const away = getTeam(match.away_team_id);
  const countdown = useCountdown(match);
  const liveMinute = useLiveMinute(match);

  if (!home || !away) return null;

  const isLive = match.status === "live";
  const isPlayed = match.is_played;

  let dateStr = "TBD";
  if (match.match_date) {
    dateStr = new Date(match.match_date + "T12:00:00")
      .toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase();
  }

  const handleShare = async () => {
    const text = `${home.name} vs ${away.name} — ${dateStr}${match.match_time ? " " + match.match_time : ""}`;
    const url = `${window.location.origin}/c/${tournamentSlug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (err) {
      // Silenciar AbortError (usuario canceló el dialog de compartir)
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  };

  return (
    <div className={`relative flex flex-col md:flex-row w-full rounded-2xl overflow-hidden shadow-lg transition-all hover:scale-[1.005] hover:shadow-2xl ${
      isLive ? "ring-2 ring-[#c41e1e] ring-offset-2 ring-offset-transparent shadow-[0_0_24px_rgba(196,30,30,0.3)]" : ""
    }`}>
      {/* LIVE badge flotante */}
      {isLive && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-[#c41e1e] text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse shadow-lg">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          EN VIVO
          {liveMinute !== null && <span className="ml-1">⏱ {liveMinute}&apos;</span>}
        </div>
      )}

      {/* Bloque equipos */}
      <div className="flex flex-1 items-center justify-center gap-3 bg-[#0d1240] p-5 sm:p-6 text-white border-r border-white/5">
        {/* Local */}
        <Link
          href={`/c/${tournamentSlug}/equipo/${match.home_team_id}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity justify-end w-[42%]"
        >
          <span className="font-bold text-gray-200 text-sm sm:text-base text-right line-clamp-1">{home.name}</span>
          <div className="w-9 h-9 sm:w-12 sm:h-12 shrink-0">
            {home.logo_url ? (
              <img src={home.logo_url} className="w-full h-full object-contain" alt="" />
            ) : (
              <div className="w-full h-full rounded-full border-2 border-white/20 flex items-center justify-center font-black text-gray-400 text-sm">
                {home.name.charAt(0)}
              </div>
            )}
          </div>
        </Link>

        {/* Marcador */}
        <div className="w-[16%] flex flex-col items-center shrink-0 gap-1">
          {isPlayed ? (
            <span className="text-xl sm:text-3xl font-black text-white tabular-nums">
              {match.home_goals} – {match.away_goals}
            </span>
          ) : isLive ? (
            <span className="text-xl sm:text-3xl font-black text-[#c41e1e] tabular-nums animate-pulse">
              {match.home_goals ?? 0} – {match.away_goals ?? 0}
            </span>
          ) : (
            <span className="text-white/40 text-sm font-bold tracking-widest">vs</span>
          )}
          {/* Countdown para partidos programados */}
          {countdown && !isLive && !isPlayed && (
            <span className="text-[9px] text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              ⏰ {countdown}
            </span>
          )}
        </div>

        {/* Visitante */}
        <Link
          href={`/c/${tournamentSlug}/equipo/${match.away_team_id}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity justify-start w-[42%]"
        >
          <div className="w-9 h-9 sm:w-12 sm:h-12 shrink-0">
            {away.logo_url ? (
              <img src={away.logo_url} className="w-full h-full object-contain" alt="" />
            ) : (
              <div className="w-full h-full rounded-full border-2 border-white/20 flex items-center justify-center font-black text-gray-400 text-sm">
                {away.name.charAt(0)}
              </div>
            )}
          </div>
          <span className="font-bold text-gray-200 text-sm sm:text-base text-left line-clamp-1">{away.name}</span>
        </Link>
      </div>

      {/* Bloque fecha — rojo FICCT */}
      <div className={`flex flex-col items-center justify-center text-white p-4 md:w-[200px] shrink-0 gap-1 relative ${
        isLive ? "bg-[#c41e1e]" : "bg-gradient-to-b from-[#c41e1e] to-[#8b0000]"
      }`}>
        {/* Diagonal decorativa */}
        <div className="absolute left-0 top-0 w-3 h-full bg-black/10 skew-x-[-4deg] -translate-x-1 pointer-events-none" />
        <span className="text-sm sm:text-lg font-black uppercase tracking-wide text-center drop-shadow">
          {dateStr}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-white/80 text-xs">
          {match.match_time && (
            <>
              <Clock className="w-3 h-3" />
              <span>{match.match_time}</span>
            </>
          )}
          {match.location && (
            <>
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{match.location}</span>
            </>
          )}
        </div>
        {match.referee_notes && (
          <p className="text-white/60 text-[10px] text-center italic mt-0.5 line-clamp-2">{match.referee_notes}</p>
        )}
        {/* Botón compartir */}
        <button
          onClick={handleShare}
          title="Compartir partido"
          className="mt-1 text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function FixtureFilters({ matches: initialMatches, teams, tournamentSlug, tournamentId }: Props) {
  const supabase = createClient();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [soloJugados, setSoloJugados] = useState(false);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // ── Supabase Realtime: actualizaciones en vivo ──
  useEffect(() => {
    const channel = supabase
      .channel(`fixture-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          setMatches(prev =>
            prev.map(m => m.id === payload.new.id ? { ...m, ...(payload.new as Match) } : m)
          );
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  const rounds = useMemo(() => Array.from(new Set(matches.map(m => m.round))), [matches]);

  const filtered = useMemo(() =>
    matches.filter(m => {
      if (fechaDesde && m.match_date && m.match_date < fechaDesde) return false;
      if (fechaHasta && m.match_date && m.match_date > fechaHasta) return false;
      if (roundFilter && m.round !== roundFilter) return false;
      if (soloJugados && !m.is_played) return false;
      if (soloPendientes && m.is_played) return false;
      return true;
    }),
    [matches, fechaDesde, fechaHasta, roundFilter, soloJugados, soloPendientes]
  );

  const hasFilter = fechaDesde || fechaHasta || roundFilter || soloJugados || soloPendientes;

  const clearFilters = () => {
    setFechaDesde(""); setFechaHasta(""); setRoundFilter("");
    setSoloJugados(false); setSoloPendientes(false);
  };

  // Partidos en vivo primero
  const sortedRounds = useMemo(() => {
    const all = Array.from(new Set(filtered.map(m => m.round)));
    const hasLive = filtered.some(m => m.status === "live");
    return hasLive
      ? all.sort((a, b) => {
          const aLive = filtered.some(m => m.round === a && m.status === "live") ? -1 : 0;
          const bLive = filtered.some(m => m.round === b && m.status === "live") ? -1 : 0;
          return aLive - bLive;
        })
      : all;
  }, [filtered]);

  return (
    <div>
      {/* ── Panel de filtros ── */}
      <div className="bg-[#0d1240]/80 backdrop-blur rounded-2xl p-4 mb-6 border border-[#c41e1e]/20">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-[#c41e1e]" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Filtrar:</span>
          </div>

          {/* Rango de fechas */}
          <input
            type="date" value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#c41e1e] transition-colors [color-scheme:dark]"
            title="Desde"
          />
          <span className="text-white/30 text-sm">→</span>
          <input
            type="date" value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#c41e1e] transition-colors [color-scheme:dark]"
            title="Hasta"
          />

          {/* Jornada */}
          <select
            className="bg-[#090c26] border border-white/10 text-white text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#c41e1e] transition-colors"
            value={roundFilter} onChange={e => setRoundFilter(e.target.value)}
          >
            <option value="">Todas las jornadas</option>
            {rounds.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Toggles */}
          <button
            onClick={() => { setSoloJugados(!soloJugados); if (!soloJugados) setSoloPendientes(false); }}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${soloJugados ? "bg-green-600 text-white border-green-500" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"}`}
          >
            ✓ Solo jugados
          </button>
          <button
            onClick={() => { setSoloPendientes(!soloPendientes); if (!soloPendientes) setSoloJugados(false); }}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${soloPendientes ? "bg-yellow-500 text-white border-yellow-400" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"}`}
          >
            ⏳ Pendientes
          </button>

          {hasFilter && (
            <>
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-bold text-[#c41e1e] hover:text-red-400 border border-[#c41e1e]/30 px-3 py-1.5 rounded-xl transition-colors">
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
              <span className="text-white/40 text-xs ml-auto">{filtered.length} partido{filtered.length !== 1 ? "s" : ""}</span>
            </>
          )}

          {/* Indicador Realtime — sutil, sin texto que confunda */}
          <div
            title={realtimeConnected ? "Actualización automática activa" : "Conectando..."}
            className={`ml-auto w-2 h-2 rounded-full shrink-0 transition-colors ${realtimeConnected ? "bg-green-500" : "bg-white/20"}`}
          />
        </div>
      </div>

      {/* ── Lista de partidos ── */}
      {filtered.length === 0 ? (
        <div className="bg-white/5 rounded-2xl p-10 text-center text-white/40 border border-white/10">
          {hasFilter ? "No hay partidos que coincidan." : "El fixture no ha sido generado aún."}
          {hasFilter && (
            <button onClick={clearFilters} className="block mx-auto mt-3 text-sm text-[#c41e1e] hover:text-red-400 underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {sortedRounds.map(round => (
            <div key={round} className="space-y-4">
              <h3 className="text-xs font-black text-[#c41e1e] uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-4 h-px bg-[#c41e1e]" />
                {round}
                <div className="flex-1 h-px bg-[#c41e1e]/20" />
              </h3>
              {filtered
                .filter(m => m.round === round)
                .map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    teams={teams}
                    tournamentSlug={tournamentSlug}
                  />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
