"use client";
// Force TS reload

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, CalendarDays, Hash, Plus, Trash2, Save, LayoutGrid } from "lucide-react";

type Tournament = any;
type Team = { id: string; name: string };
type Match = { id: string; home_team_id: string; away_team_id: string; round: string; home_goals: number | null; away_goals: number | null; is_played: boolean };

export default function AdminPanelClient({ tournament }: { tournament: Tournament }) {
  const [activeTab, setActiveTab] = useState<"equipos" | "fixture" | "resultados">("equipos");

  // Mock Data for UI demonstration
  const [teams, setTeams] = useState<Team[]>([
    { id: "1", name: "Los Galácticos" },
    { id: "2", name: "Real Madrid" },
    { id: "3", name: "FC Barcelona" },
    { id: "4", name: "Boca Juniors" },
  ]);
  const [newTeamName, setNewTeamName] = useState("");

  const [matches, setMatches] = useState<Match[]>([
    { id: "1", home_team_id: "1", away_team_id: "2", round: "Jornada 1", home_goals: 2, away_goals: 1, is_played: true },
    { id: "2", home_team_id: "3", away_team_id: "4", round: "Jornada 1", home_goals: null, away_goals: null, is_played: false },
    { id: "3", home_team_id: "1", away_team_id: "3", round: "Jornada 2", home_goals: null, away_goals: null, is_played: false },
    { id: "4", home_team_id: "2", away_team_id: "4", round: "Jornada 2", home_goals: null, away_goals: null, is_played: false },
  ]);

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeamName.trim() === "") return;
    setTeams([...teams, { id: Date.now().toString(), name: newTeamName }]);
    setNewTeamName("");
  };

  const handleRemoveTeam = (id: string) => {
    setTeams(teams.filter((t) => t.id !== id));
  };

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || "Equipo Desconocido";

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4">
            <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver al Dashboard
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">{tournament.name}</h1>
              <p className="text-sm text-gray-500 mt-1">Administración del torneo</p>
            </div>
            <Link 
              href={`/c/${tournament.slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              Ver Vista Pública
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {[
              { id: "equipos", name: "Equipos", icon: Users },
              { id: "fixture", name: "Fixture", icon: CalendarDays },
              { id: "resultados", name: "Resultados", icon: Hash },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${isActive 
                      ? "border-emerald-500 text-emerald-600" 
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-emerald-500" : "text-gray-400"}`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* EQUIPOS TAB */}
        {activeTab === "equipos" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Agregar Nuevo Equipo</h2>
              <form onSubmit={handleAddTeam} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Nombre del equipo..."
                  className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none transition-all"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  Agregar
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Equipos Registrados ({teams.length})</h2>
              </div>
              {teams.length === 0 ? (
                <p className="text-gray-500 text-center py-6">No hay equipos registrados aún.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {teams.map((team) => (
                    <div key={team.id} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-800 px-4 py-2 rounded-full font-medium text-sm">
                      {team.name}
                      <button 
                        onClick={() => handleRemoveTeam(team.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-colors"
                        title="Eliminar equipo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FIXTURE TAB */}
        {activeTab === "fixture" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Fixture del Campeonato</h2>
                <p className="text-sm text-gray-500">Genera los partidos automáticamente basados en los equipos inscritos.</p>
              </div>
              <button className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                <CalendarDays className="w-5 h-5" />
                Generar Fixture Automático
              </button>
            </div>

            <div className="space-y-6">
              {Array.from(new Set(matches.map(m => m.round))).map(round => (
                <div key={round} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">{round}</h3>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {matches.filter(m => m.round === round).map(match => (
                      <li key={match.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex-1 text-right font-medium text-gray-800 pr-4">{getTeamName(match.home_team_id)}</div>
                        <div className="px-4 py-1 rounded bg-gray-100 text-gray-500 text-sm font-bold text-center w-16">
                          VS
                        </div>
                        <div className="flex-1 text-left font-medium text-gray-800 pl-4">{getTeamName(match.away_team_id)}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTADOS TAB */}
        {activeTab === "resultados" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Cargar Resultados</h2>
              <p className="text-sm text-gray-500 mb-6">Actualiza el marcador de los partidos. Al guardar, el partido se marcará como jugado.</p>
              
              <div className="space-y-4">
                {matches.map(match => (
                  <div key={match.id} className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border ${match.is_played ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-emerald-200 transition-colors'}`}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-full sm:w-24 text-center sm:text-left">
                      {match.round}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center sm:justify-end gap-3 font-medium text-gray-800 w-full">
                      <span className="truncate">{getTeamName(match.home_team_id)}</span>
                      <input 
                        type="number" 
                        className="w-12 h-10 text-center bg-gray-50 border border-gray-300 text-gray-900 rounded focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        defaultValue={match.home_goals ?? ""}
                      />
                    </div>

                    <div className="text-gray-400 font-medium">-</div>

                    <div className="flex-1 flex items-center justify-center sm:justify-start gap-3 font-medium text-gray-800 w-full">
                      <input 
                        type="number" 
                        className="w-12 h-10 text-center bg-gray-50 border border-gray-300 text-gray-900 rounded focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        defaultValue={match.away_goals ?? ""}
                      />
                      <span className="truncate">{getTeamName(match.away_team_id)}</span>
                    </div>

                    <div className="w-full sm:w-auto mt-2 sm:mt-0 flex justify-center">
                      <button className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        <Save className="w-4 h-4" />
                        Guardar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
