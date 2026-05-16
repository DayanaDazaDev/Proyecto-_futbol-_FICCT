import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Shield, CalendarDays } from "lucide-react";

const POSITION_LABELS: Record<string, string> = {
  POR: "Portero", DEF: "Defensa", MED: "Mediocampista", DEL: "Delantero",
};

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments").select("id, name, slug").eq("slug", slug).single();
  if (!tournament) notFound();

  const { data: team } = await supabase
    .from("teams").select("*").eq("id", teamId).single();
  if (!team) notFound();

  // Carga paralela de datos
  const [playersRes, matchesRes, allTeamsRes] = await Promise.all([
    supabase.from("players").select("*").eq("team_id", team.id).order("number", { ascending: true, nullsFirst: false }),
    supabase.from("matches").select("*").eq("tournament_id", tournament.id).order("created_at"),
    supabase.from("teams").select("id,name,logo_url").eq("tournament_id", tournament.id),
  ]);

  const playersList = playersRes.data || [];
  const allMatches = matchesRes.data || [];
  const allTeams = allTeamsRes.data || [];
  const verifiedCount = playersList.filter(p => p.is_verified).length;

  // Partidos del equipo
  const teamMatches = allMatches.filter(
    m => m.home_team_id === teamId || m.away_team_id === teamId
  );
  const playedMatches = teamMatches.filter(m => m.is_played);
  const upcomingMatches = teamMatches.filter(m => !m.is_played && m.status !== "cancelled");

  // Próximo partido
  const nextMatch = upcomingMatches.find(m => m.match_date) || upcomingMatches[0] || null;

  // Forma (últimos 5)
  const recentMatches = playedMatches.slice(-5);
  const form = recentMatches.map(m => {
    const isHome = m.home_team_id === teamId;
    const gf = isHome ? m.home_goals : m.away_goals;
    const gc = isHome ? m.away_goals : m.home_goals;
    if (gf > gc) return "W" as const;
    if (gf < gc) return "L" as const;
    return "D" as const;
  });

  // Stats del equipo
  const teamStats = playedMatches.reduce((acc, m) => {
    const isHome = m.home_team_id === teamId;
    const gf = isHome ? (m.home_goals || 0) : (m.away_goals || 0);
    const gc = isHome ? (m.away_goals || 0) : (m.home_goals || 0);
    acc.gf += gf; acc.gc += gc;
    if (gf > gc) acc.wins++;
    else if (gf < gc) acc.losses++;
    else acc.draws++;
    return acc;
  }, { wins: 0, draws: 0, losses: 0, gf: 0, gc: 0 });

  // Estadísticas de jugadores (goleadores del equipo)
  let teamPlayerStats: Record<string, { goals: number; assists: number; mvp: number }> = {};
  try {
    const matchIds = allMatches.filter(m => m.home_team_id === teamId || m.away_team_id === teamId).map(m => m.id);
    if (matchIds.length > 0) {
      const { data: events } = await supabase
        .from("match_events")
        .select("player_id, event_type, is_own_goal")
        .in("match_id", matchIds)
        .eq("team_id", teamId);
      (events || []).forEach((ev: any) => {
        if (!teamPlayerStats[ev.player_id]) teamPlayerStats[ev.player_id] = { goals: 0, assists: 0, mvp: 0 };
        if (ev.event_type === "goal" && !ev.is_own_goal) teamPlayerStats[ev.player_id].goals++;
        if (ev.event_type === "assist") teamPlayerStats[ev.player_id].assists++;
        if (ev.event_type === "mvp") teamPlayerStats[ev.player_id].mvp++;
      });
    }
  } catch { /* match_events puede no existir */ }

  const topScorers = Object.entries(teamPlayerStats)
    .filter(([, s]) => s.goals > 0)
    .sort((a, b) => b[1].goals - a[1].goals)
    .slice(0, 5)
    .map(([pid, s]) => ({ player: playersList.find(p => p.id === pid), goals: s.goals, assists: s.assists }))
    .filter(e => e.player);

  const getOtherTeam = (m: any) => {
    const otherId = m.home_team_id === teamId ? m.away_team_id : m.home_team_id;
    return allTeams.find(t => t.id === otherId);
  };

  const FORM_STYLE = { W: "bg-green-500 text-white", D: "bg-yellow-400 text-gray-900", L: "bg-red-600 text-white" };
  const FORM_LABEL = { W: "G", D: "E", L: "P" };

  return (
    <div className="min-h-screen pb-16"
      style={{ background: "linear-gradient(160deg, #090c26 0%, #0d1035 40%, #130a1a 100%)" }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-96 h-[600px] bg-[#c41e1e]/8 rotate-[20deg] blur-3xl" />
      </div>

      {/* Banda roja superior */}
      <div className="relative z-10 bg-gradient-to-r from-[#c41e1e] via-[#a01515] to-[#8b0000] py-3 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Trophy className="w-4 h-4 text-white/80" />
          <span className="text-white font-black text-xs uppercase tracking-[0.2em]">FICCT · {tournament.name}</span>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 overflow-hidden pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link href={`/c/${tournament.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Volver a {tournament.name}
          </Link>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#0d1240] border-4 border-[#c41e1e]/60 shadow-2xl shadow-[#c41e1e]/20 overflow-hidden flex items-center justify-center">
                {team.logo_url
                  ? <img src={team.logo_url} alt={`Escudo ${team.name}`} className="w-full h-full object-cover" />
                  : <span className="text-5xl font-black text-white/30">{team.name.charAt(0).toUpperCase()}</span>}
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight drop-shadow-xl">{team.name}</h1>
              <p className="text-[#c41e1e] text-sm font-bold tracking-[0.2em] uppercase mt-1">Plantilla Oficial</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1 rounded-full">{playersList.length} jugadores</span>
                {verifiedCount > 0 && <span className="text-xs text-green-300 bg-green-900/30 border border-green-700/30 px-3 py-1 rounded-full font-semibold">✓ {verifiedCount} verificados FICCT</span>}
                {playedMatches.length > 0 && (
                  <span className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                    {teamStats.wins}G · {teamStats.draws}E · {teamStats.losses}P
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* ── PRÓXIMO PARTIDO ── */}
        {nextMatch && (() => {
          const rival = getOtherTeam(nextMatch);
          const isHome = nextMatch.home_team_id === teamId;
          if (!rival) return null;
          const dateStr = nextMatch.match_date
            ? new Date(nextMatch.match_date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" }).toUpperCase()
            : "Fecha TBD";
          return (
            <div className="bg-gradient-to-r from-[#c41e1e]/20 to-[#0d1240] border border-[#c41e1e]/30 rounded-2xl p-5">
              <p className="text-[#c41e1e] font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Próximo Partido
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="text-center flex-1">
                  <p className="text-white font-black text-sm sm:text-base">{isHome ? team.name : rival.name}</p>
                  <p className="text-white/40 text-xs">Local</p>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-[#c41e1e] font-black text-lg">VS</p>
                  {nextMatch.match_time && <p className="text-white/60 text-xs mt-0.5">{nextMatch.match_time}</p>}
                </div>
                <div className="text-center flex-1">
                  <p className="text-white font-black text-sm sm:text-base">{isHome ? rival.name : team.name}</p>
                  <p className="text-white/40 text-xs">Visitante</p>
                </div>
              </div>
              <p className="text-center text-white/50 text-xs mt-3">{dateStr}{nextMatch.location ? ` · 📍 ${nextMatch.location}` : ""}</p>
            </div>
          );
        })()}

        {/* ── FORMA Y ESTADÍSTICAS ── */}
        {playedMatches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Forma últimos 5 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-white/50 font-black uppercase tracking-widest text-xs mb-4">Últimos {form.length} Partidos</p>
              <div className="flex items-center gap-2 mb-4">
                {form.map((r, i) => (
                  <div key={i} className={`flex-1 flex flex-col items-center gap-1`}>
                    <span className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center ${FORM_STYLE[r]}`}>
                      {FORM_LABEL[r]}
                    </span>
                  </div>
                ))}
              </div>
              {/* Detalle de últimos partidos */}
              <div className="space-y-1.5">
                {recentMatches.map((m, i) => {
                  const rival = getOtherTeam(m);
                  const isHome = m.home_team_id === teamId;
                  const gf = isHome ? m.home_goals : m.away_goals;
                  const gc = isHome ? m.away_goals : m.home_goals;
                  const res = form[i];
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <span className={`w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ${FORM_STYLE[res]}`}>
                        {FORM_LABEL[res]}
                      </span>
                      <span className="text-white/50 truncate flex-1">vs {rival?.name || "?"}</span>
                      <span className="text-white/80 font-bold shrink-0">{gf}–{gc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats generales */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-white/50 font-black uppercase tracking-widest text-xs mb-4">Estadísticas Generales</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Ganados", value: teamStats.wins, color: "text-green-400" },
                  { label: "Empates", value: teamStats.draws, color: "text-yellow-400" },
                  { label: "Perdidos", value: teamStats.losses, color: "text-red-400" },
                  { label: "Goles A Favor", value: teamStats.gf, color: "text-white" },
                  { label: "Goles En Contra", value: teamStats.gc, color: "text-white" },
                  { label: "Dif. Goles", value: teamStats.gf - teamStats.gc, color: teamStats.gf >= teamStats.gc ? "text-green-400" : "text-red-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/5 rounded-xl p-2.5">
                    <p className={`text-xl font-black ${color}`}>{value > 0 && label === "Dif. Goles" ? `+${value}` : value}</p>
                    <p className="text-white/30 text-[10px] leading-tight mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GOLEADORES DEL EQUIPO ── */}
        {topScorers.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
              <span>⚽</span>
              <h3 className="text-white font-black uppercase tracking-wider text-sm">Goleadores del Equipo</h3>
            </div>
            <div className="divide-y divide-white/5">
              {topScorers.map(({ player, goals, assists }, i) => player && (
                <div key={player.id} className={`flex items-center gap-3 px-5 py-3 ${i === 0 ? "bg-yellow-400/5" : ""}`}>
                  <span className={`w-6 text-center font-black text-sm shrink-0 ${i === 0 ? "text-yellow-400" : "text-white/30"}`}>{i + 1}</span>
                  {player.photo_url
                    ? <img src={player.photo_url} className="w-9 h-9 rounded-full object-cover border-2 border-white/20 shrink-0" alt={player.name} />
                    : <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-black text-sm text-white/60 border-2 border-white/10 shrink-0">{player.name.charAt(0)}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{player.name}</p>
                    <p className="text-white/40 text-xs">{POSITION_LABELS[player.position] || player.position || "Jugador"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-lg font-black ${i === 0 ? "text-yellow-400" : "text-white"}`}>{goals}</span>
                    <span className="text-sm">⚽</span>
                    {assists > 0 && <span className="text-xs text-blue-300 bg-blue-400/10 px-1.5 py-0.5 rounded-full">🤝 {assists}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PLANTILLA ── */}
        <div>
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="w-1 h-5 bg-[#c41e1e] rounded-full" />
            <Users className="w-5 h-5 text-[#c41e1e]" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Plantilla</h2>
          </div>

          {playersList.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 font-medium">Este equipo aún no ha registrado su plantilla.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {playersList.map(player => {
                const pStats = teamPlayerStats[player.id];
                return (
                  <div key={player.id}
                    className="flex items-center gap-3 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-3.5 hover:border-[#c41e1e]/40 hover:bg-[#0d1240]/60 transition-all group">
                    <div className="shrink-0">
                      {player.photo_url ? (
                        <img src={player.photo_url} alt={player.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/20 group-hover:border-[#c41e1e]/60 transition-colors shadow-lg" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0d1035] to-[#c41e1e]/40 border-2 border-white/10 group-hover:border-[#c41e1e]/30 flex items-center justify-center shadow-lg transition-colors">
                          <span className="text-white font-black">{player.number ?? player.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-white text-sm truncate group-hover:text-[#c41e1e] transition-colors">{player.name}</h3>
                        {pStats?.goals > 0 && <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1 rounded shrink-0">⚽{pStats.goals}</span>}
                        {pStats?.mvp > 0 && <span className="text-[10px] text-yellow-300 bg-yellow-400/10 px-1 rounded shrink-0">⭐MVP</span>}
                      </div>
                      <p className="text-xs text-white/40 uppercase tracking-wide">
                        {POSITION_LABELS[player.position] || player.position || "Sin posición"}
                        {player.number ? ` · #${player.number}` : ""}
                      </p>
                      {player.is_verified ? (
                        <span className="inline-flex items-center mt-1 text-[10px] font-black text-green-300 bg-green-900/40 border border-green-700/30 px-1.5 py-0.5 rounded-full">✓ FICCT</span>
                      ) : (
                        <span className="inline-flex items-center mt-1 text-[10px] text-yellow-400/50 bg-yellow-900/10 border border-yellow-700/20 px-1.5 py-0.5 rounded-full">⚠ Pendiente</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {playersList.length > 0 && (
          <p className="text-center text-white/20 text-xs">✓ Verificado por administrador FICCT · ⚠ Verificación pendiente</p>
        )}
      </main>

      <footer className="relative z-10 mt-16 border-t border-white/5 pt-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-px h-4 bg-[#c41e1e]" />
          <Trophy className="w-3 h-3 text-[#c41e1e]" />
          <span className="text-[#c41e1e] text-xs font-black uppercase tracking-widest">FICCT · UAGRM</span>
          <div className="w-px h-4 bg-[#c41e1e]" />
        </div>
        <p className="text-white/20 text-xs">Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones</p>
      </footer>
    </div>
  );
}
