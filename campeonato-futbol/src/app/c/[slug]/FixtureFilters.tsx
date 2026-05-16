"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, MapPin, Filter, X } from "lucide-react";

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
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Programado",    cls: "bg-white/10 text-white/60" },
  live:      { label: "🟢 EN VIVO",   cls: "bg-green-400/20 text-green-300 animate-pulse" },
  finished:  { label: "Finalizado",    cls: "bg-white/10 text-white/40" },
  cancelled: { label: "⚠ Suspendido", cls: "bg-orange-400/20 text-orange-300" },
};

interface Props {
  matches: Match[];
  teams: Team[];
  tournamentSlug: string;
}

export default function FixtureFilters({ matches, teams, tournamentSlug }: Props) {
  const [fechaDesde, setFechaDesde]       = useState("");
  const [fechaHasta, setFechaHasta]       = useState("");
  const [roundFilter, setRoundFilter]     = useState("");
  const [soloJugados, setSoloJugados]     = useState(false);
  const [soloPendientes, setSoloPendientes] = useState(false);

  const rounds = useMemo(() => Array.from(new Set(matches.map((m) => m.round))), [matches]);
  const getTeam = (id: string) => teams.find((t) => t.id === id);

  const filtered = useMemo(
    () =>
      matches.filter((m) => {
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
    setFechaDesde("");
    setFechaHasta("");
    setRoundFilter("");
    setSoloJugados(false);
    setSoloPendientes(false);
  };

  return (
    <div>
      {/* ── Panel de filtros ── */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-6 border border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Ícono + label */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-[#c8a84b]" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Filtrar:</span>
          </div>

          {/* Rango de fechas */}
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#c8a84b] transition-colors [color-scheme:dark]"
            title="Desde"
          />
          <span className="text-white/40 text-sm font-medium">→</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#c8a84b] transition-colors [color-scheme:dark]"
            title="Hasta"
          />

          {/* Filtro por jornada */}
          <select
            className="bg-[#122b19] border border-white/20 text-white text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#c8a84b] transition-colors"
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value)}
          >
            <option value="">Todas las jornadas</option>
            {rounds.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Toggle: Solo jugados */}
          <button
            onClick={() => { setSoloJugados(!soloJugados); if (!soloJugados) setSoloPendientes(false); }}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              soloJugados
                ? "bg-green-500 text-white border-green-400"
                : "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
            }`}
          >
            ✓ Solo jugados
          </button>

          {/* Toggle: Pendientes */}
          <button
            onClick={() => { setSoloPendientes(!soloPendientes); if (!soloPendientes) setSoloJugados(false); }}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              soloPendientes
                ? "bg-yellow-500 text-white border-yellow-400"
                : "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
            }`}
          >
            ⏳ Pendientes
          </button>

          {/* Limpiar + contador */}
          {hasFilter && (
            <>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-bold text-[#c8a84b] hover:text-yellow-300 border border-[#c8a84b]/40 px-3 py-1.5 rounded-xl transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
              <span className="text-white/40 text-xs ml-auto">
                {filtered.length} partido{filtered.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Lista de partidos filtrada ── */}
      {filtered.length === 0 ? (
        <div className="bg-white/5 rounded-2xl p-10 text-center text-white/40 border border-white/10">
          {hasFilter
            ? "No hay partidos que coincidan con los filtros."
            : "El fixture aún no ha sido generado."}
          {hasFilter && (
            <button onClick={clearFilters} className="block mx-auto mt-3 text-sm text-[#c8a84b] hover:text-yellow-300 underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(new Set(filtered.map((m) => m.round))).map((round) => (
            <div key={round} className="space-y-4">
              <h3 className="text-xs font-black text-[#c8a84b] uppercase tracking-[0.2em]">{round}</h3>

              {filtered
                .filter((m) => m.round === round)
                .map((match) => {
                  const home = getTeam(match.home_team_id);
                  const away = getTeam(match.away_team_id);
                  if (!home || !away) return null;

                  const badge = STATUS_BADGE[match.status ?? "scheduled"] ?? STATUS_BADGE.scheduled;

                  let dateStr = "TBD";
                  if (match.match_date) {
                    dateStr = new Date(match.match_date + "T12:00:00")
                      .toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
                      .toUpperCase();
                  }

                  return (
                    <div
                      key={match.id}
                      className="flex flex-col md:flex-row w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.005]"
                    >
                      {/* Bloque equipos */}
                      <div className="flex flex-1 items-center justify-center gap-3 bg-[#1a1a20] p-5 sm:p-6 text-white border-r border-white/5">
                        {/* Local */}
                        <Link
                          href={`/c/${tournamentSlug}/equipo/${match.home_team_id}`}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity justify-end w-[42%]"
                        >
                          <span className="font-bold text-gray-200 text-sm sm:text-base text-right line-clamp-1">
                            {home.name}
                          </span>
                          <div className="w-8 h-8 sm:w-11 sm:h-11 shrink-0">
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
                        <div className="w-[16%] flex flex-col items-center shrink-0">
                          {match.is_played ? (
                            <span className="text-xl sm:text-3xl font-black text-white">
                              {match.home_goals} – {match.away_goals}
                            </span>
                          ) : (
                            <span className="text-white/40 text-xs font-medium tracking-widest italic">vs</span>
                          )}
                          <span className={`mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Visitante */}
                        <Link
                          href={`/c/${tournamentSlug}/equipo/${match.away_team_id}`}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity justify-start w-[42%]"
                        >
                          <div className="w-8 h-8 sm:w-11 sm:h-11 shrink-0">
                            {away.logo_url ? (
                              <img src={away.logo_url} className="w-full h-full object-contain" alt="" />
                            ) : (
                              <div className="w-full h-full rounded-full border-2 border-white/20 flex items-center justify-center font-black text-gray-400 text-sm">
                                {away.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-gray-200 text-sm sm:text-base text-left line-clamp-1">
                            {away.name}
                          </span>
                        </Link>
                      </div>

                      {/* Bloque fecha */}
                      <div className="flex flex-col items-center justify-center bg-[#1a5c38] text-white p-4 md:w-[220px] shrink-0 gap-1">
                        <span className="text-base sm:text-xl font-black uppercase tracking-wide text-center">
                          {dateStr}
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-white/70 text-xs">
                          {match.match_time && (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{match.match_time}</span>
                            </>
                          )}
                          {match.location && (
                            <>
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[110px]">{match.location}</span>
                            </>
                          )}
                        </div>
                        {match.referee_notes && (
                          <p className="text-white/50 text-[10px] text-center italic mt-1 line-clamp-2">
                            {match.referee_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
