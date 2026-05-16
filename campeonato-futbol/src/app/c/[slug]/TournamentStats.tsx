import { createClient } from "@/utils/supabase/server";

interface Props {
  tournamentId: string;
  teams: { id: string; name: string; logo_url: string | null }[];
  allPlayers: { id: string; team_id: string; name: string; photo_url: string | null }[];
}

type EventRow = {
  player_id: string;
  event_type: string;
  is_own_goal: boolean;
  minute: number | null;
};

export default async function TournamentStats({ tournamentId, teams, allPlayers }: Props) {
  const supabase = await createClient();

  let events: EventRow[] = [];
  try {
    const matchIdsRes = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId);

    const matchIds = matchIdsRes.data?.map(m => m.id) ?? [];

    if (matchIds.length > 0) {
      const eventsRes = await supabase
        .from("match_events")
        .select("player_id, event_type, is_own_goal, minute")
        .in("match_id", matchIds);
      events = (eventsRes.data as EventRow[]) ?? [];
    }
  } catch {
    return null;
  }

  if (events.length === 0) return null;

  // Aggregate stats per player
  const stats: Record<string, { goals: number; yellow: number; red: number; mvp: number; assists: number; bestGk: number }> = {};
  for (const ev of events) {
    if (!stats[ev.player_id]) stats[ev.player_id] = { goals: 0, yellow: 0, red: 0, mvp: 0, assists: 0, bestGk: 0 };
    if (ev.event_type === "goal" && !ev.is_own_goal) stats[ev.player_id].goals++;
    if (ev.event_type === "yellow_card") stats[ev.player_id].yellow++;
    if (ev.event_type === "red_card") stats[ev.player_id].red++;
    if (ev.event_type === "mvp") stats[ev.player_id].mvp++;
    if (ev.event_type === "assist") stats[ev.player_id].assists++;
    if (ev.event_type === "best_goalkeeper") stats[ev.player_id].bestGk++;
  }

  const getPlayer = (id: string) => allPlayers.find(p => p.id === id);
  const getTeam = (playerId: string) => {
    const player = allPlayers.find(p => p.id === playerId);
    return teams.find(t => t.id === player?.team_id);
  };

  // Top scorers
  const scorers = Object.entries(stats)
    .filter(([, s]) => s.goals > 0)
    .sort((a, b) => b[1].goals - a[1].goals)
    .slice(0, 8);

  // Top assists
  const assisters = Object.entries(stats)
    .filter(([, s]) => s.assists > 0)
    .sort((a, b) => b[1].assists - a[1].assists)
    .slice(0, 5);

  // Best goalkeeper
  const bestGks = Object.entries(stats)
    .filter(([, s]) => s.bestGk > 0)
    .sort((a, b) => b[1].bestGk - a[1].bestGk)
    .slice(0, 3);

  // Cards
  const cardPlayers = Object.entries(stats)
    .filter(([, s]) => s.yellow > 0 || s.red > 0)
    .sort((a, b) => (b[1].yellow + b[1].red * 3) - (a[1].yellow + a[1].red * 3))
    .slice(0, 5);

  // Player of tournament score
  const playerScores = Object.entries(stats).map(([pid, s]) => ({
    playerId: pid,
    score: s.goals * 3 + s.mvp * 5 + s.assists * 2 + s.bestGk * 4 - s.yellow - s.red * 3,
  })).sort((a, b) => b.score - a.score);

  const topPlayer = playerScores[0];
  const topPlayerData = topPlayer ? getPlayer(topPlayer.playerId) : null;
  const topPlayerTeam = topPlayer ? getTeam(topPlayer.playerId) : null;
  const topPlayerStats = topPlayer ? stats[topPlayer.playerId] : null;

  // Best GK player
  const bestGkData = bestGks[0] ? getPlayer(bestGks[0][0]) : null;
  const bestGkTeam = bestGks[0] ? getTeam(bestGks[0][0]) : null;

  if (scorers.length === 0 && !topPlayerData) return null;

  const PlayerRow = ({ pid, value, icon, label }: { pid: string; value: number; icon: string; label: string }) => {
    const player = getPlayer(pid);
    const team = getTeam(pid);
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        {player?.photo_url ? (
          <img src={player.photo_url} className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" alt={player.name} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-xs text-white/60 border border-white/10 shrink-0">
            {player?.name?.charAt(0) || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{player?.name || "Jugador"}</p>
          <p className="text-white/40 text-xs truncate">{team?.name || ""}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xl font-black text-white">{value}</span>
          <span className="text-sm">{icon}</span>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6 print:hidden">
      <div className="flex items-center gap-3 px-2">
        <div className="w-1 h-6 bg-[#c41e1e] rounded-full" />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Estadísticas</h2>
      </div>

      {/* Jugador del torneo + Mejor portero */}
      {(topPlayerData || bestGkData) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topPlayerData && topPlayerStats && (topPlayerStats.goals > 0 || topPlayerStats.mvp > 0) && (
            <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-600/5 border border-yellow-400/30 rounded-2xl p-5 text-center">
              <p className="text-yellow-400 font-black uppercase tracking-widest text-xs mb-3">⭐ Jugador del Torneo</p>
              {topPlayerData.photo_url ? (
                <img src={topPlayerData.photo_url} className="w-16 h-16 rounded-full object-cover border-4 border-yellow-400 mx-auto mb-3 shadow-lg" alt={topPlayerData.name} />
              ) : (
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 border-4 border-yellow-400 flex items-center justify-center text-yellow-400 font-black text-2xl mx-auto mb-3">
                  {topPlayerData.name?.charAt(0)}
                </div>
              )}
              <p className="text-white font-black text-base">{topPlayerData.name}</p>
              <p className="text-white/50 text-xs mb-3">{topPlayerTeam?.name}</p>
              <div className="flex justify-center gap-3 text-xs flex-wrap">
                {topPlayerStats.goals > 0 && <span className="text-white/80 bg-white/10 px-2 py-0.5 rounded-full">⚽ {topPlayerStats.goals}</span>}
                {topPlayerStats.mvp > 0 && <span className="text-yellow-300 bg-yellow-400/10 px-2 py-0.5 rounded-full">⭐ {topPlayerStats.mvp} MVP</span>}
                {topPlayerStats.assists > 0 && <span className="text-blue-300 bg-blue-400/10 px-2 py-0.5 rounded-full">🤝 {topPlayerStats.assists}</span>}
              </div>
            </div>
          )}

          {bestGkData && (
            <div className="bg-gradient-to-br from-blue-400/20 to-blue-600/5 border border-blue-400/30 rounded-2xl p-5 text-center">
              <p className="text-blue-300 font-black uppercase tracking-widest text-xs mb-3">🧤 Portero Estrella</p>
              {bestGkData.photo_url ? (
                <img src={bestGkData.photo_url} className="w-16 h-16 rounded-full object-cover border-4 border-blue-400 mx-auto mb-3 shadow-lg" alt={bestGkData.name} />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-400/20 border-4 border-blue-400 flex items-center justify-center text-blue-300 font-black text-2xl mx-auto mb-3">
                  {bestGkData.name?.charAt(0)}
                </div>
              )}
              <p className="text-white font-black text-base">{bestGkData.name}</p>
              <p className="text-white/50 text-xs mb-3">{bestGkTeam?.name}</p>
              <span className="text-blue-300 bg-blue-400/10 px-3 py-0.5 rounded-full text-xs font-bold">
                🧤 {bestGks[0][1].bestGk} premios Portero
              </span>
            </div>
          )}
        </div>
      )}

      {/* Goleadores + Asistencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scorers.length > 0 && (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <span className="text-lg">⚽</span>
              <h3 className="text-white font-black uppercase tracking-wider text-sm">Goleadores</h3>
            </div>
            <div className="divide-y divide-white/5">
              {scorers.map(([pid, s], i) => (
                <div key={pid} className={`${i === 0 ? "bg-yellow-400/5" : ""}`}>
                  <div className="flex items-center gap-1 px-4 pt-2.5">
                    <span className={`w-5 text-center font-black text-sm shrink-0 ${i === 0 ? "text-yellow-400" : "text-white/30"}`}>{i + 1}</span>
                    <div className="flex-1">
                      <PlayerRow pid={pid} value={s.goals} icon="⚽" label="goles" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Asistencias */}
          {assisters.length > 0 && (
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-white/5">
                <span className="text-lg">🤝</span>
                <h3 className="text-white font-black uppercase tracking-wider text-sm">Asistencias</h3>
              </div>
              <div className="divide-y divide-white/5">
                {assisters.map(([pid, s]) => (
                  <PlayerRow key={pid} pid={pid} value={s.assists} icon="🤝" label="asist." />
                ))}
              </div>
            </div>
          )}

          {/* Tarjetas */}
          {cardPlayers.length > 0 && (
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-white/5">
                <span className="text-lg">🟨</span>
                <h3 className="text-white font-black uppercase tracking-wider text-sm">Disciplina</h3>
              </div>
              <div className="divide-y divide-white/5">
                {cardPlayers.map(([pid, s]) => {
                  const player = getPlayer(pid);
                  const team = getTeam(pid);
                  return (
                    <div key={pid} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{player?.name || "Jugador"}</p>
                        <p className="text-white/40 text-xs truncate">{team?.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.yellow > 0 && <span className="text-xs font-bold bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded">🟨 {s.yellow}</span>}
                        {s.red > 0 && <span className="text-xs font-bold bg-red-400/20 text-red-300 px-2 py-0.5 rounded">🟥 {s.red}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
