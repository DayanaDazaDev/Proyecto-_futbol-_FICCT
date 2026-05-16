"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Play, Square } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Match, Team, Player, MatchEvent } from "./types";
import { EVENT_LABELS, STATUS_CONFIG } from "./types";

interface Props {
  initialMatches: Match[];
  teams: Team[];
  tournamentId: string;
}

export default function AdminResultadosTab({ initialMatches, teams, tournamentId }: Props) {
  const supabase = createClient();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [savingMatches, setSavingMatches] = useState<Record<string, boolean>>({});
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [matchEvents, setMatchEvents] = useState<Record<string, MatchEvent[]>>({});
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  // New event form state
  const [newEvent, setNewEvent] = useState<{
    player_id: string; team_id: string;
    event_type: MatchEvent["event_type"]; is_own_goal: boolean; minute: string;
  }>({ player_id: "", team_id: "", event_type: "goal", is_own_goal: false, minute: "" });
  const [addingEvent, setAddingEvent] = useState(false);

  useEffect(() => {
    // Load all players for this tournament
    const teamIds = teams.map(t => t.id);
    if (teamIds.length === 0) return;
    supabase.from("players").select("*").in("team_id", teamIds)
      .then(({ data }) => setAllPlayers(data || []));
  }, [teams]);

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || "Equipo";

  const handleMatchChange = (matchId: string, field: keyof Match, value: any) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, [field]: value } : m));
  };

  const handleSaveMatch = async (matchId: string) => {
    setSavingMatches(prev => ({ ...prev, [matchId]: true }));
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const isFinished = match.home_goals !== null && match.away_goals !== null;
    const payload = {
      home_goals: match.home_goals === null || String(match.home_goals) === "" ? null : Number(match.home_goals),
      away_goals: match.away_goals === null || String(match.away_goals) === "" ? null : Number(match.away_goals),
      is_played: isFinished,
      status: match.status,
      match_date: match.match_date || null,
      match_time: match.match_time || null,
      location: match.location || null,
      referee_notes: match.referee_notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data } = await supabase.from("matches").update(payload).eq("id", matchId).select().single();
    if (data) setMatches(prev => prev.map(m => m.id === matchId ? data : m));
    else alert("Error al guardar el partido");

    setSavingMatches(prev => ({ ...prev, [matchId]: false }));
  };

  const handleStartMatch = async (matchId: string) => {
    setSavingMatches(prev => ({ ...prev, [matchId]: true }));
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("matches")
      .update({ status: "live", match_started_at: now, updated_at: now })
      .eq("id", matchId).select().single();
    if (data) setMatches(prev => prev.map(m => m.id === matchId ? data : m));
    setSavingMatches(prev => ({ ...prev, [matchId]: false }));
  };

  const handleFinishMatch = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    setSavingMatches(prev => ({ ...prev, [matchId]: true }));
    const isScored = match.home_goals !== null && match.away_goals !== null;
    const payload = {
      status: "finished",
      is_played: isScored,
      updated_at: new Date().toISOString(),
    };
    const { data } = await supabase.from("matches").update(payload).eq("id", matchId).select().single();
    if (data) setMatches(prev => prev.map(m => m.id === matchId ? data : m));
    setSavingMatches(prev => ({ ...prev, [matchId]: false }));
  };

  const loadEvents = async (matchId: string) => {
    if (matchEvents[matchId]) return;
    const { data } = await supabase.from("match_events").select("*").eq("match_id", matchId);
    setMatchEvents(prev => ({ ...prev, [matchId]: data || [] }));
  };

  const handleToggleExpand = async (matchId: string) => {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
    } else {
      setExpandedMatchId(matchId);
      await loadEvents(matchId);
      const match = matches.find(m => m.id === matchId);
      if (match) {
        setNewEvent(prev => ({ ...prev, team_id: match.home_team_id, player_id: "" }));
      }
    }
  };

  const handleAddEvent = async (matchId: string) => {
    if (!newEvent.player_id || !newEvent.team_id) return alert("Selecciona equipo y jugador.");
    setAddingEvent(true);
    const payload = {
      match_id: matchId,
      player_id: newEvent.player_id,
      team_id: newEvent.team_id,
      event_type: newEvent.event_type,
      is_own_goal: newEvent.is_own_goal,
      minute: newEvent.minute ? parseInt(newEvent.minute) : null,
    };
    const { data } = await supabase.from("match_events").insert(payload).select().single();
    if (data) {
      setMatchEvents(prev => ({ ...prev, [matchId]: [...(prev[matchId] || []), data] }));
      setNewEvent(prev => ({ ...prev, player_id: "", minute: "", is_own_goal: false }));
    }
    setAddingEvent(false);
  };

  const handleDeleteEvent = async (matchId: string, eventId: string) => {
    await supabase.from("match_events").delete().eq("id", eventId);
    setMatchEvents(prev => ({
      ...prev,
      [matchId]: (prev[matchId] || []).filter(e => e.id !== eventId),
    }));
  };

  const getPlayersForTeam = (teamId: string) => allPlayers.filter(p => p.team_id === teamId);

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
        No hay partidos. Ve a la pestaña Fixture para generarlos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Cargar Resultados y Eventos</h2>
        <p className="text-sm text-gray-500">Actualiza marcador, estado, fecha, goles, tarjetas y MVP de cada partido.</p>
      </div>

      {matches.map(match => {
        const isExpanded = expandedMatchId === match.id;
        const events = matchEvents[match.id] || [];
        const matchTeamPlayers = getPlayersForTeam(newEvent.team_id);

        return (
          <div key={match.id} className={`bg-white rounded-xl border transition-all ${
            match.status === "live" ? "border-green-300 shadow-md" :
            match.status === "finished" ? "border-gray-200" : "border-gray-200"
          }`}>
            {/* Header del partido */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">{match.round}</span>
                <div className="flex items-center gap-2">
                  {/* Botones de control de partido */}
                  {match.status === "scheduled" && (
                    <button
                      onClick={() => handleStartMatch(match.id)}
                      disabled={savingMatches[match.id]}
                      className="flex items-center gap-1 text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" /> Iniciar
                    </button>
                  )}
                  {match.status === "live" && (
                    <>
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full animate-pulse">
                        🟢 EN VIVO
                      </span>
                      <button
                        onClick={() => handleFinishMatch(match.id)}
                        disabled={savingMatches[match.id]}
                        className="flex items-center gap-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                      >
                        <Square className="w-3 h-3" /> Finalizar
                      </button>
                    </>
                  )}
                  {match.status === "finished" && <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">⚫ FINALIZADO</span>}
                  {match.status === "cancelled" && <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">⚠ SUSPENDIDO</span>}
                </div>
              </div>

              {/* Marcador */}
              <div className="flex items-center gap-4 mb-4">
                <span className="flex-1 text-right font-bold text-gray-900 text-sm sm:text-base truncate">{getTeamName(match.home_team_id)}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <input type="number" min="0" className="w-14 h-12 text-xl font-black text-center bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={match.home_goals ?? ""} onChange={e => handleMatchChange(match.id, "home_goals", e.target.value)} />
                  <span className="text-gray-400 font-bold">–</span>
                  <input type="number" min="0" className="w-14 h-12 text-xl font-black text-center bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={match.away_goals ?? ""} onChange={e => handleMatchChange(match.id, "away_goals", e.target.value)} />
                </div>
                <span className="flex-1 text-left font-bold text-gray-900 text-sm sm:text-base truncate">{getTeamName(match.away_team_id)}</span>
              </div>

              {/* Estado + Fecha + Hora + Lugar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500 col-span-2 sm:col-span-1"
                  value={match.status} onChange={e => handleMatchChange(match.id, "status", e.target.value)}>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.label}</option>
                  ))}
                </select>
                <input type="date" className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                  value={match.match_date || ""} onChange={e => handleMatchChange(match.id, "match_date", e.target.value)} />
                <input type="time" className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                  value={match.match_time || ""} onChange={e => handleMatchChange(match.id, "match_time", e.target.value)} />
                <input type="text" placeholder="Ubicación/Cancha" className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                  value={match.location || ""} onChange={e => handleMatchChange(match.id, "location", e.target.value)} />
              </div>

              {/* Notas del árbitro */}
              <textarea rows={2} placeholder="Observaciones del árbitro (ej: partido suspendido por lluvia)..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500 resize-none mb-3"
                value={match.referee_notes || ""} onChange={e => handleMatchChange(match.id, "referee_notes", e.target.value)} />

              {/* Botones */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button onClick={() => handleToggleExpand(match.id)}
                  className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-900 transition-colors">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Eventos del partido ({events.length})
                </button>
                <button onClick={() => handleSaveMatch(match.id)} disabled={savingMatches[match.id]}
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm">
                  {savingMatches[match.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </div>

            {/* Panel de eventos expandido */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/50">
                <h4 className="font-bold text-gray-700 text-sm">Agregar Evento</h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Selector equipo */}
                  <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                    value={newEvent.team_id}
                    onChange={e => setNewEvent(prev => ({ ...prev, team_id: e.target.value, player_id: "" }))}>
                    {[match.home_team_id, match.away_team_id].map(tid => (
                      <option key={tid} value={tid}>{getTeamName(tid)}</option>
                    ))}
                  </select>

                  {/* Selector jugador */}
                  <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                    value={newEvent.player_id}
                    onChange={e => setNewEvent(prev => ({ ...prev, player_id: e.target.value }))}>
                    <option value="">Jugador...</option>
                    {matchTeamPlayers.map(p => (
                      <option key={p.id} value={p.id}>#{p.number || "-"} {p.name}</option>
                    ))}
                  </select>

                  {/* Tipo de evento */}
                  <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                    value={newEvent.event_type}
                    onChange={e => setNewEvent(prev => ({ ...prev, event_type: e.target.value as MatchEvent["event_type"] }))}>
                    {(Object.entries(EVENT_LABELS) as [MatchEvent["event_type"], { label: string; icon: string }][]).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.icon} {cfg.label}</option>
                    ))}
                  </select>

                  {/* Minuto */}
                  <input type="number" min="0" max="120" placeholder="Min."
                    className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                    value={newEvent.minute} onChange={e => setNewEvent(prev => ({ ...prev, minute: e.target.value }))} />
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {newEvent.event_type === "goal" && (
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={newEvent.is_own_goal}
                        onChange={e => setNewEvent(prev => ({ ...prev, is_own_goal: e.target.checked }))}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                      Gol en contra
                    </label>
                  )}
                  <button onClick={() => handleAddEvent(match.id)} disabled={addingEvent}
                    className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ml-auto">
                    {addingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Agregar Evento
                  </button>
                </div>

                {/* Lista de eventos */}
                {events.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {events.map(ev => {
                      const player = allPlayers.find(p => p.id === ev.player_id);
                      const teamName = getTeamName(ev.team_id);
                      const cfg = EVENT_LABELS[ev.event_type];
                      return (
                        <div key={ev.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm">
                          <span className="text-lg">{cfg.icon}</span>
                          <div className="flex-1">
                            <span className="font-semibold text-gray-800">{player?.name || "Jugador"}</span>
                            <span className="text-gray-400"> · {teamName}</span>
                            {ev.minute && <span className="text-gray-400"> · {ev.minute}'</span>}
                            {ev.is_own_goal && <span className="text-red-500 text-xs ml-1">(en contra)</span>}
                          </div>
                          <button onClick={() => handleDeleteEvent(match.id, ev.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
