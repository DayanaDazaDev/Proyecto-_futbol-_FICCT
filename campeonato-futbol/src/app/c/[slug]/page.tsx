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
  scheduled: { label: "Programado", cls: "bg-white/10 text-white/70" },
  live:       { label: "🟢 EN VIVO", cls: "bg-green-400/20 text-green-300 animate-pulse" },
  finished:   { label: "Finalizado", cls: "bg-white/10 text-white/50" },
  cancelled:  { label: "⚠ Suspendido", cls: "bg-orange-400/20 text-orange-300" },
};

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

  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/c/${slug}`;

  const renderStandings = (standings: ReturnType<typeof calculateStandings>) => (
    <div id="standings-table" className="space-y-2">
      <div className="flex items-center px-4 py-2 text-xs font-bold text-white/30 uppercase tracking-widest">
        <div className="w-8 text-center">Pos</div>
        <div className="flex-1">Equipo</div>
        <div className="w-8 text-center hidden sm:block">PJ</div>
        <div className="w-8 text-center hidden sm:block">PG</div>
        <div className="w-8 text-center hidden sm:block">PE</div>
        <div className="w-8 text-center hidden sm:block">PP</div>
        <div className="w-10 text-center">DG</div>
        <div className="w-12 text-center font-black text-white/50">PTS</div>
      </div>
      {standings.length === 0 ? (
        <div className="bg-white/5 rounded-2xl p-6 text-center text-white/40 text-sm">No hay datos aún.</div>
      ) : standings.map((row, index) => (
        <div key={index} className={`flex items-center px-4 py-3 bg-white/5 backdrop-blur rounded-2xl border border-white/5 hover:border-[#c8a84b]/40 hover:bg-white/10 transition-all ${index < 4 ? "border-l-4 border-l-[#c8a84b]" : ""}`}>
          <div className="w-8 text-center font-black text-xl text-white/80">{index + 1}</div>
          <div className="flex-1 min-w-0">
            <Link href={`/c/${tournament.slug}/equipo/${row.teamId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {row.teamLogo
                ? <img src={row.teamLogo} alt={row.teamName} className="w-9 h-9 rounded-full object-cover border border-white/20 shadow" />
                : <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1a5c38] to-[#c8a84b] text-white flex items-center justify-center font-black text-sm shadow">{row.teamName.charAt(0)}</div>
              }
              <span className="font-bold text-white text-sm sm:text-base truncate">{row.teamName.toUpperCase()}</span>
            </Link>
          </div>
          <div className="w-8 text-center text-white/60 hidden sm:block text-sm">{row.pj}</div>
          <div className="w-8 text-center text-white/60 hidden sm:block text-sm">{row.pg}</div>
          <div className="w-8 text-center text-white/60 hidden sm:block text-sm">{row.pe}</div>
          <div className="w-8 text-center text-white/60 hidden sm:block text-sm">{row.pp}</div>
          <div className="w-10 text-center font-bold text-white/80 text-sm">{row.dg > 0 ? `+${row.dg}` : row.dg}</div>
          <div className="w-12 text-center font-black text-2xl text-[#c8a84b]">{row.pts}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1f13] via-[#122b19] to-[#0d1f13] pb-20 print:bg-white">

      {/* ── HEADER FICCT ── */}
      <header className="relative overflow-hidden pt-12 pb-10 px-4 sm:px-6 lg:px-8 text-center print:py-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a5c38]/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')" }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Logo + Institución */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#c8a84b]/20 border-2 border-[#c8a84b]/60 flex items-center justify-center shadow-lg overflow-hidden">
              <Trophy className="w-7 h-7 text-[#c8a84b]" />
            </div>
            <div className="text-left">
              <p className="text-[#c8a84b] font-black text-xs sm:text-sm uppercase tracking-[0.2em]">FICCT · UAGRM</p>
              <p className="text-white/60 text-xs tracking-widest">Santa Cruz de la Sierra</p>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c8a84b] via-white to-[#c8a84b] uppercase tracking-tight drop-shadow mb-3 print:text-gray-900 print:bg-none">
            {tournament.name}
          </h1>
          <p className="text-white/50 text-sm uppercase tracking-[0.2em] mb-6">
            {tournament.format === "liga" ? "Formato Liga" : tournament.format === "eliminacion" ? "Eliminación Directa" : "Fase de Grupos"}
          </p>

          {/* Botones WOW */}
          <div className="flex flex-wrap items-center justify-center gap-2 print:hidden">
            <QRModal url={publicUrl} tournamentName={tournament.name} />
            <ExportButton targetId="standings-table" filename={`posiciones-${slug}`} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

        {/* ── TABLA DE POSICIONES ── */}
        {!isEliminatoria && (
          <section>
            {isGrupos ? (
              <div className="space-y-12">
                {groupStandings.map(g => (
                  <div key={g.groupName}>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 px-2">{g.groupName}</h2>
                    {renderStandings(g.standings)}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 px-2">Tabla de Posiciones</h2>
                {renderStandings(generalStandings)}
              </div>
            )}
          </section>
        )}

        {/* ── ESTADÍSTICAS ── */}
        <TournamentStats tournamentId={tournament.id} teams={teamsList} allPlayers={allPlayers} />

        {/* ── FIXTURE ── */}
        <section>
          <div className="flex items-center gap-3 mb-6 px-2 print:hidden">
            <CalendarDays className="w-6 h-6 text-[#c8a84b]" />
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
                  <h3 className="text-xs font-black text-[#c8a84b] uppercase tracking-[0.2em] text-center bg-black/30 py-2 rounded-xl backdrop-blur">{round}</h3>
                  {matchesList.filter(m => m.round === round).map(match => {
                    const home = getTeam(match.home_team_id);
                    const away = getTeam(match.away_team_id);
                    if (!home || !away) return null;
                    const badge = STATUS_BADGE[match.status || "scheduled"];
                    return (
                      <div key={match.id} className="bg-white/95 backdrop-blur rounded-2xl shadow-xl overflow-hidden border border-white/20">
                        {match.match_date && (
                          <div className="bg-[#1a5c38] text-white text-[10px] font-bold text-center py-1.5 uppercase tracking-widest">
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
            /* ── LISTA FIXTURE con FILTROS ── */
            <FixtureFilters
              matches={matchesList}
              teams={teamsList}
              tournamentSlug={slug}
            />
          )}
        </section>
      </main>

      {/* ── FOOTER INSTITUCIONAL ── */}
      <footer className="mt-20 border-t border-white/10 py-8 px-4 text-center print:hidden">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-[#c8a84b]" />
          <span className="text-[#c8a84b] font-bold text-sm tracking-widest uppercase">FICCT · UAGRM</span>
        </div>
        <p className="text-white/30 text-xs">Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones</p>
        <p className="text-white/20 text-xs mt-1">Santa Cruz de la Sierra, Bolivia · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
