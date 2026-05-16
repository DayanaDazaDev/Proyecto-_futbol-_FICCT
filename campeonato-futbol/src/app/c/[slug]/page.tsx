import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Trophy, CalendarDays } from "lucide-react";
import Link from "next/link";
import { calculateStandings } from "@/lib/standingsCalculator";
import TournamentStats from "./TournamentStats";
import FixtureFilters from "./FixtureFilters";
import QRModal from "./QRModal";
import ExportButton from "./ExportButton";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Programado",    cls: "bg-white/10 text-white/70" },
  live:       { label: "🟢 EN VIVO",  cls: "bg-red-400/20 text-red-300 animate-pulse" },
  finished:   { label: "Finalizado",   cls: "bg-white/10 text-white/50" },
  cancelled:  { label: "⚠ Suspendido", cls: "bg-orange-400/20 text-orange-300" },
};

/** Devuelve W/D/L de los últimos N partidos de un equipo */
function getRecentForm(
  teamId: string,
  matches: { home_team_id: string; away_team_id: string; home_goals: number | null; away_goals: number | null; is_played: boolean; created_at?: string }[],
  n = 5
): ("W" | "D" | "L")[] {
  const played = matches
    .filter(m => m.is_played && (m.home_team_id === teamId || m.away_team_id === teamId))
    .slice(-n);
  return played.map(m => {
    const isHome = m.home_team_id === teamId;
    const gf = isHome ? m.home_goals! : m.away_goals!;
    const gc = isHome ? m.away_goals! : m.home_goals!;
    if (gf > gc) return "W";
    if (gf < gc) return "L";
    return "D";
  });
}

export default async function PublicTournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase.from("tournaments").select("*").eq("slug", slug).single();
  if (!tournament) notFound();

  const [teamsRes, matchesRes, playersRes] = await Promise.all([
    supabase.from("teams").select("*").eq("tournament_id", tournament.id).order("created_at"),
    supabase.from("matches").select("*").eq("tournament_id", tournament.id).order("created_at"),
    supabase.from("players").select("id,team_id,name,photo_url,is_verified,number,position")
      .in("team_id",
        await supabase.from("teams").select("id").eq("tournament_id", tournament.id)
          .then(r => r.data?.map(t => t.id) || [])
      ),
  ]);

  const teamsList = teamsRes.data || [];
  const matchesList = matchesRes.data || [];
  const allPlayers = playersRes.data || [];

  // Verificar si el visitante es el dueno del torneo (para mostrar botones admin)
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = !!(user && tournament.creator_id && user.id === tournament.creator_id);

  const getTeam = (id: string) => teamsList.find(t => t.id === id);
  const isEliminatoria = tournament.format === "eliminacion";
  const isGrupos = tournament.format === "grupos";

  // Standings
  let groupStandings: { groupName: string; standings: ReturnType<typeof calculateStandings> }[] = [];
  let generalStandings = calculateStandings(teamsList, matchesList);

  if (isGrupos) {
    const groupNames = Array.from(new Set(matchesList.map(m => m.round.split(" - ")[0]).filter((r: string) => r.startsWith("Grupo"))));
    groupNames.forEach(g => {
      const gMatches = matchesList.filter(m => m.round.startsWith(g));
      const gTeamIds = new Set<string>();
      gMatches.forEach(m => { gTeamIds.add(m.home_team_id); gTeamIds.add(m.away_team_id); });
      groupStandings.push({ groupName: g, standings: calculateStandings(teamsList.filter(t => gTeamIds.has(t.id)), gMatches) });
    });
    groupStandings.sort((a, b) => a.groupName.localeCompare(b.groupName));
  }

  const getStageOrder = (round: string) => {
    const r = round.toLowerCase();
    if (r.includes("final")) return 4; if (r.includes("semi")) return 3;
    if (r.includes("cuarto")) return 2; if (r.includes("octavo")) return 1; return 0;
  };
  const knockoutRounds = Array.from(new Set(matchesList.map(m => m.round))).sort((a, b) => getStageOrder(a) - getStageOrder(b));

  const FORM_STYLE = {
    W: "bg-green-500 text-white",
    D: "bg-yellow-400 text-gray-900",
    L: "bg-red-600 text-white",
  };
  const FORM_LABEL = { W: "G", D: "E", L: "P" };

  const renderStandings = (standings: ReturnType<typeof calculateStandings>) => (
    <div id="standings-table" className="space-y-2">
      {/* Cabecera */}
      <div className="flex items-center px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
        <div className="w-7 text-center">#</div>
        <div className="flex-1">Equipo</div>
        <div className="w-7 text-center hidden sm:block">PJ</div>
        <div className="w-7 text-center hidden sm:block">PG</div>
        <div className="w-7 text-center hidden sm:block">PE</div>
        <div className="w-7 text-center hidden sm:block">PP</div>
        <div className="w-7 text-center hidden md:block text-green-400">GF</div>
        <div className="w-7 text-center hidden md:block text-red-400">GC</div>
        <div className="w-8 text-center">DG</div>
        <div className="w-11 text-center font-black text-white/50">PTS</div>
        <div className="w-[90px] text-center hidden lg:block text-white/30 text-[9px]">Forma</div>
      </div>

      {standings.length === 0 ? (
        <div className="bg-white/5 rounded-2xl p-6 text-center text-white/40 text-sm">No hay datos aún.</div>
      ) : standings.map((row, index) => {
        const form = getRecentForm(row.teamId, matchesList);
        return (
          <div key={index} className={`flex items-center px-3 py-3 bg-white/5 backdrop-blur rounded-2xl border border-white/5 hover:bg-white/10 transition-all ${
            index === 0 ? "border-l-4 border-l-[#c41e1e] bg-[#c41e1e]/5" :
            index < 3  ? "border-l-4 border-l-[#c41e1e]/40" : ""
          }`}>
            <div className={`w-7 text-center font-black text-lg ${index === 0 ? "text-[#c41e1e]" : "text-white/50"}`}>{index + 1}</div>
            <div className="flex-1 min-w-0">
              <Link href={`/c/${tournament.slug}/equipo/${row.teamId}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                {row.teamLogo
                  ? <img src={row.teamLogo} alt={row.teamName} className="w-8 h-8 rounded-full object-cover border border-white/20 shadow shrink-0" />
                  : <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0d1035] to-[#c41e1e]/60 text-white flex items-center justify-center font-black text-xs shadow border border-white/10 shrink-0">{row.teamName.charAt(0)}</div>
                }
                <span className="font-bold text-white text-sm truncate">{row.teamName.toUpperCase()}</span>
              </Link>
            </div>
            <div className="w-7 text-center text-white/60 hidden sm:block text-sm">{row.pj}</div>
            <div className="w-7 text-center text-white/60 hidden sm:block text-sm">{row.pg}</div>
            <div className="w-7 text-center text-white/60 hidden sm:block text-sm">{row.pe}</div>
            <div className="w-7 text-center text-white/60 hidden sm:block text-sm">{row.pp}</div>
            <div className="w-7 text-center text-green-400 hidden md:block text-sm font-semibold">{row.gf}</div>
            <div className="w-7 text-center text-red-400 hidden md:block text-sm font-semibold">{row.gc}</div>
            <div className="w-8 text-center font-bold text-white/80 text-sm">{row.dg > 0 ? `+${row.dg}` : row.dg}</div>
            <div className="w-11 text-center font-black text-2xl text-[#c41e1e]">{row.pts}</div>
            {/* Forma últimos 5 */}
            <div className="w-[90px] hidden lg:flex items-center justify-center gap-0.5">
              {form.length === 0 ? (
                <span className="text-white/20 text-xs">—</span>
              ) : form.map((r, i) => (
                <span key={i} className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ${FORM_STYLE[r]}`}>
                  {FORM_LABEL[r]}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen pb-20 print:bg-white"
      style={{ background: "linear-gradient(160deg, #090c26 0%, #0d1035 40%, #130a1a 100%)" }}>

      {/* Decoración diagonal */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-96 h-[600px] bg-[#c41e1e]/8 rotate-[20deg] blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-64 h-[400px] bg-[#c41e1e]/5 rotate-[15deg] blur-3xl" />
      </div>

      {/* ── HEADER FICCT ── */}
      <header className="relative print:py-4">
        {/* Banda roja */}
        <div className="relative bg-gradient-to-r from-[#c41e1e] via-[#a01515] to-[#8b0000] py-3 px-4 sm:px-8">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <Trophy className="w-4 h-4 text-white/80 shrink-0" />
            <span className="text-white font-black text-xs uppercase tracking-[0.2em]">FICCT · UAGRM</span>
            <span className="text-white/40 text-xs hidden sm:block">·</span>
            <span className="text-white/60 text-xs hidden sm:block">Fac. de Ingeniería en CC y Telecomunicaciones</span>

            {/* Botones QR/Export — SOLO para el dueño del torneo */}
            {isOwner && (
              <div className="ml-auto flex items-center gap-2">
                <QRModal url={`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/c/${slug}`} tournamentName={tournament.name} />
                <ExportButton targetId="standings-table" filename={`posiciones-${slug}`} />
              </div>
            )}
          </div>
        </div>

        {/* Navy con nombre del torneo */}
        <div className="relative bg-gradient-to-b from-[#0d1240] to-[#090c26] px-4 sm:px-8 pt-10 pb-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-b from-[#c41e1e]/20 to-transparent skew-x-[-8deg] translate-x-4" />
            <div className="absolute top-0 right-8 w-3 h-full bg-[#c41e1e]/40 skew-x-[-8deg]" />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <p className="text-[#c41e1e] font-black text-xs sm:text-sm uppercase tracking-[0.3em] mb-3">Campeonato Oficial</p>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight drop-shadow-2xl mb-3 print:text-gray-900">
              {tournament.name}
            </h1>
            <p className="text-white/40 text-sm uppercase tracking-[0.2em]">
              {tournament.format === "liga" ? "Formato Liga" : tournament.format === "eliminacion" ? "Eliminación Directa" : "Fase de Grupos"}
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 mt-6">

        {/* ── TABLA DE POSICIONES ── */}
        {!isEliminatoria && (
          <section>
            {isGrupos ? (
              <div className="space-y-12">
                {groupStandings.map(g => (
                  <div key={g.groupName}>
                    <div className="flex items-center gap-3 mb-6 px-2">
                      <div className="w-1 h-6 bg-[#c41e1e] rounded-full" />
                      <h2 className="text-2xl font-black text-white uppercase tracking-widest">{g.groupName}</h2>
                    </div>
                    {renderStandings(g.standings)}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-6 px-2">
                  <div className="w-1 h-6 bg-[#c41e1e] rounded-full" />
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">Tabla de Posiciones</h2>
                </div>
                {renderStandings(generalStandings)}
                {/* Leyenda forma */}
                {matchesList.some(m => m.is_played) && (
                  <div className="flex items-center gap-3 mt-4 px-2">
                    <span className="text-white/30 text-xs">Forma (últ. 5):</span>
                    {(["G","E","P"] as const).map((l, i) => (
                      <span key={l} className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ${["bg-green-500 text-white","bg-yellow-400 text-gray-900","bg-red-600 text-white"][i]}`}>{l}</span>
                    ))}
                    <span className="text-white/30 text-xs">= Ganado · Empate · Perdido</span>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── ESTADÍSTICAS ── */}
        <TournamentStats tournamentId={tournament.id} teams={teamsList} allPlayers={allPlayers} />

        {/* ── FIXTURE ── */}
        <section>
          <div className="flex items-center gap-3 mb-6 px-2 print:hidden">
            <div className="w-1 h-6 bg-[#c41e1e] rounded-full" />
            <CalendarDays className="w-6 h-6 text-[#c41e1e]" />
            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Fixture y Resultados</h2>
          </div>

          {matchesList.length === 0 ? (
            <div className="bg-white/5 rounded-3xl p-10 text-center border border-white/10">
              <p className="text-white/40">El fixture aún no ha sido generado.</p>
            </div>
          ) : isEliminatoria ? (
            /* ── BRACKET ── */
            <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-6 snap-x">
              {knockoutRounds.map(round => (
                <div key={round} className="flex flex-col gap-4 min-w-[280px] snap-center">
                  <h3 className="text-xs font-black text-[#c41e1e] uppercase tracking-[0.2em] text-center bg-[#c41e1e]/10 border border-[#c41e1e]/30 py-2 rounded-xl">
                    {round}
                  </h3>
                  {matchesList.filter(m => m.round === round).map(match => {
                    const home = getTeam(match.home_team_id);
                    const away = getTeam(match.away_team_id);
                    if (!home || !away) return null;
                    const badge = STATUS_BADGE[match.status || "scheduled"];
                    return (
                      <div key={match.id} className="bg-white/95 backdrop-blur rounded-2xl shadow-xl overflow-hidden border border-white/20">
                        {match.match_date && (
                          <div className="bg-[#c41e1e] text-white text-[10px] font-bold text-center py-1.5 uppercase tracking-widest">
                            {new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                            {match.match_time ? ` · ${match.match_time}` : ""}
                          </div>
                        )}
                        <div className="p-3 space-y-2">
                          {[{ team: home, goals: match.home_goals }, { team: away, goals: match.away_goals }].map((side, i) => (
                            <div key={i} className={`flex items-center justify-between ${i === 0 ? "" : "border-t border-gray-100 pt-2"}`}>
                              <div className="flex items-center gap-2">
                                {side.team.logo_url
                                  ? <img src={side.team.logo_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                                  : <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black">{side.team.name.charAt(0)}</div>
                                }
                                <span className="text-sm font-bold text-gray-800 truncate max-w-[120px]">{side.team.name}</span>
                              </div>
                              <span className="font-black text-lg text-gray-900">{match.is_played ? side.goals : "–"}</span>
                            </div>
                          ))}
                          <div className={`text-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <FixtureFilters
              matches={matchesList}
              teams={teamsList}
              tournamentSlug={slug}
              tournamentId={tournament.id}
            />
          )}
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 mt-20 border-t border-white/10 py-8 px-4 text-center print:hidden">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-px h-4 bg-[#c41e1e]" />
          <span className="text-[#c41e1e] font-black text-sm tracking-widest uppercase">FICCT · UAGRM</span>
          <div className="w-px h-4 bg-[#c41e1e]" />
        </div>
        <p className="text-white/30 text-xs">Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones</p>
        <p className="text-white/20 text-xs mt-1">Santa Cruz de la Sierra, Bolivia · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
