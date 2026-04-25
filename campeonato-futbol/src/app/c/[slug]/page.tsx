import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Trophy, CalendarDays, BarChart3, LayoutGrid } from "lucide-react";

export default async function PublicTournamentPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!tournament) {
    notFound();
  }

  // Mock data for standings
  const standings = [
    { team: "Los Galácticos", pj: 1, pg: 1, pe: 0, pp: 0, gf: 2, gc: 1, dg: 1, pts: 3 },
    { team: "Real Madrid", pj: 1, pg: 0, pe: 0, pp: 1, gf: 1, gc: 2, dg: -1, pts: 0 },
    { team: "FC Barcelona", pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 },
    { team: "Boca Juniors", pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 },
  ].sort((a, b) => b.pts - a.pts || b.dg - a.dg);

  // Mock data for calendar
  const matches = [
    { id: "1", home: "Los Galácticos", away: "Real Madrid", round: "Jornada 1", home_goals: 2, away_goals: 1, is_played: true },
    { id: "2", home: "FC Barcelona", away: "Boca Juniors", round: "Jornada 1", home_goals: null, away_goals: null, is_played: false },
    { id: "3", home: "Los Galácticos", away: "FC Barcelona", round: "Jornada 2", home_goals: null, away_goals: null, is_played: false },
    { id: "4", home: "Real Madrid", away: "Boca Juniors", round: "Jornada 2", home_goals: null, away_goals: null, is_played: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Público */}
      <header className="bg-emerald-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{tournament.name}</h1>
          <p className="mt-2 text-lg text-emerald-100 max-w-2xl mx-auto">
            Sigue de cerca la tabla de posiciones y el fixture oficial del campeonato.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        
        {/* Tabla de Posiciones */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">Tabla de Posiciones</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Pos</th>
                  <th className="px-4 py-3 font-semibold">Equipo</th>
                  <th className="px-3 py-3 text-center font-semibold" title="Partidos Jugados">PJ</th>
                  <th className="px-3 py-3 text-center font-semibold hidden sm:table-cell" title="Partidos Ganados">PG</th>
                  <th className="px-3 py-3 text-center font-semibold hidden sm:table-cell" title="Partidos Empatados">PE</th>
                  <th className="px-3 py-3 text-center font-semibold hidden sm:table-cell" title="Partidos Perdidos">PP</th>
                  <th className="px-3 py-3 text-center font-semibold hidden md:table-cell" title="Goles a Favor">GF</th>
                  <th className="px-3 py-3 text-center font-semibold hidden md:table-cell" title="Goles en Contra">GC</th>
                  <th className="px-3 py-3 text-center font-semibold" title="Diferencia de Goles">DG</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standings.map((row, index) => {
                  const isTop4 = index < 4;
                  return (
                    <tr key={index} className={`hover:bg-gray-50 transition-colors ${isTop4 ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-4 py-4 font-medium text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-800 whitespace-nowrap">
                        {row.team}
                      </td>
                      <td className="px-3 py-4 text-center text-gray-600">{row.pj}</td>
                      <td className="px-3 py-4 text-center text-gray-600 hidden sm:table-cell">{row.pg}</td>
                      <td className="px-3 py-4 text-center text-gray-600 hidden sm:table-cell">{row.pe}</td>
                      <td className="px-3 py-4 text-center text-gray-600 hidden sm:table-cell">{row.pp}</td>
                      <td className="px-3 py-4 text-center text-gray-600 hidden md:table-cell">{row.gf}</td>
                      <td className="px-3 py-4 text-center text-gray-600 hidden md:table-cell">{row.gc}</td>
                      <td className="px-3 py-4 text-center text-gray-600 font-medium">{row.dg > 0 ? `+${row.dg}` : row.dg}</td>
                      <td className="px-4 py-4 text-center font-extrabold text-emerald-700 text-base">{row.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Calendario */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Fixture y Resultados</h2>
          </div>

          <div className="p-4 sm:p-6 space-y-8">
            {Array.from(new Set(matches.map(m => m.round))).map(round => (
              <div key={round} className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{round}</h3>
                <div className="space-y-3">
                  {matches.filter(m => m.round === round).map(match => (
                    <div key={match.id} className="flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-xl p-4 hover:border-gray-200 transition-colors">
                      <div className={`flex-1 text-right font-medium sm:text-base text-sm ${match.is_played && match.home_goals! > match.away_goals! ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                        {match.home}
                      </div>
                      
                      <div className="px-4 sm:px-6 w-24 sm:w-32 flex justify-center">
                        {match.is_played ? (
                          <div className="flex items-center justify-center gap-2 bg-gray-900 text-white font-bold px-3 py-1.5 rounded-lg text-lg w-full">
                            <span>{match.home_goals}</span>
                            <span className="text-gray-400 text-sm">-</span>
                            <span>{match.away_goals}</span>
                          </div>
                        ) : (
                          <div className="bg-gray-100 text-gray-400 font-bold px-3 py-1 rounded text-sm">
                            VS
                          </div>
                        )}
                      </div>

                      <div className={`flex-1 text-left font-medium sm:text-base text-sm ${match.is_played && match.away_goals! > match.home_goals! ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                        {match.away}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
