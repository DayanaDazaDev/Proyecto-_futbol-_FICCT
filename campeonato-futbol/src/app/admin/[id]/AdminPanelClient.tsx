"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, CalendarDays, Hash, LayoutGrid,
  UserPlus, Loader2, ImagePlus, Plus, Trash2, Save, Settings
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { generateLeagueFixture, generateKnockoutFixture, generateGroupsFixture } from "@/lib/fixtureGenerator";
import type { Tournament, Team, Match } from "./types";
import AdminJugadoresTab from "./AdminJugadoresTab";
import AdminResultadosTab from "./AdminResultadosTab";

type Tab = "equipos" | "jugadores" | "fixture" | "resultados";

export default function AdminPanelClient({ tournament }: { tournament: Tournament }) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("equipos");
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Equipos form
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLogoFile, setNewTeamLogoFile] = useState<File | null>(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [generatingFixture, setGeneratingFixture] = useState(false);

  // Fixture editing
  const [editingFixture, setEditingFixture] = useState(false);
  const [fixtureEdits, setFixtureEdits] = useState<Record<string, { home_team_id: string; away_team_id: string }>>({});
  const [savingFixtureEdit, setSavingFixtureEdit] = useState<Record<string, boolean>>({});

  // Load initial data
  useEffect(() => {
    async function load() {
      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from("teams").select("*").eq("tournament_id", tournament.id).order("created_at"),
        supabase.from("matches").select("*").eq("tournament_id", tournament.id).order("created_at"),
      ]);
      if (teamsRes.data) setTeams(teamsRes.data);
      if (matchesRes.data) {
        setMatches(matchesRes.data);
        const edits: Record<string, { home_team_id: string; away_team_id: string }> = {};
        matchesRes.data.forEach((m: Match) => {
          edits[m.id] = { home_team_id: m.home_team_id, away_team_id: m.away_team_id };
        });
        setFixtureEdits(edits);
      }
      setLoading(false);
    }
    load();
  }, [tournament.id]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setAddingTeam(true);

    let logo_url: string | null = null;
    if (newTeamLogoFile) {
      const ext = newTeamLogoFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("tournaments_media").upload(`logos/${fileName}`, newTeamLogoFile);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("tournaments_media").getPublicUrl(`logos/${fileName}`);
        logo_url = publicUrl;
      }
    }

    const { data } = await supabase.from("teams").insert({
      tournament_id: tournament.id, name: newTeamName.trim(), logo_url
    }).select().single();

    if (data) {
      setTeams(prev => [...prev, data]);
      setNewTeamName(""); setNewTeamLogoFile(null);
    } else alert("Error al agregar equipo");
    setAddingTeam(false);
  };

  const handleRemoveTeam = async (id: string) => {
    if (!confirm("¿Eliminar este equipo y todos sus jugadores?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (!error) {
      setTeams(prev => prev.filter(t => t.id !== id));
      setMatches(prev => prev.filter(m => m.home_team_id !== id && m.away_team_id !== id));
    }
  };

  const handleGenerateFixture = async () => {
    if (teams.length < 2) return alert("Se necesitan al menos 2 equipos.");
    if (matches.length > 0 && !confirm("Ya existe un fixture. ¿Sobreescribir?")) return;
    setGeneratingFixture(true);

    await supabase.from("matches").delete().eq("tournament_id", tournament.id);
    const teamIds = teams.map(t => t.id);
    let generated: any[] = [];
    if (tournament.format === "liga") generated = generateLeagueFixture(teamIds);
    else if (tournament.format === "eliminacion") generated = generateKnockoutFixture(teamIds);
    else generated = generateGroupsFixture(teamIds);

    const payload = generated
      .filter(m => m.home_team_id !== m.away_team_id)
      .map(m => ({ tournament_id: tournament.id, home_team_id: m.home_team_id, away_team_id: m.away_team_id, round: m.round }));

    if (payload.length > 0) {
      const { data } = await supabase.from("matches").insert(payload).select();
      if (data) setMatches(data);
    }
    if (tournament.status === "draft") {
      await supabase.from("tournaments").update({ status: "active" }).eq("id", tournament.id);
    }
    setGeneratingFixture(false);
    alert("✅ Fixture generado correctamente");
  };

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || "Equipo";

  const handleSaveFixtureEdit = async (matchId: string) => {
    const edit = fixtureEdits[matchId];
    if (!edit) return;
    if (edit.home_team_id === edit.away_team_id) {
      alert("Un equipo no puede jugar contra sí mismo.");
      return;
    }
    setSavingFixtureEdit(prev => ({ ...prev, [matchId]: true }));
    const { data } = await supabase
      .from("matches")
      .update({ home_team_id: edit.home_team_id, away_team_id: edit.away_team_id })
      .eq("id", matchId)
      .select()
      .single();
    if (data) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...edit } : m));
    } else {
      alert("Error al guardar el cambio.");
    }
    setSavingFixtureEdit(prev => ({ ...prev, [matchId]: false }));
  };

  const tabs: { id: Tab; name: string; Icon: any }[] = [
    { id: "equipos", name: "Equipos", Icon: Users },
    { id: "jugadores", name: "Jugadores", Icon: UserPlus },
    { id: "fixture", name: "Fixture", Icon: CalendarDays },
    { id: "resultados", name: "Resultados", Icon: Hash },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Link href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{tournament.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">Formato: {tournament.format}</p>
            </div>
            <Link href={`/c/${tournament.slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors w-fit">
              <LayoutGrid className="w-4 h-4" /> Vista Pública
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-6 overflow-x-auto scrollbar-hide">
            {tabs.map(({ id, name, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <Icon className={`w-4 h-4 ${activeTab === id ? "text-green-600" : "text-gray-400"}`} />
                {name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* ── TAB EQUIPOS ── */}
        {activeTab === "equipos" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Agregar Nuevo Equipo</h2>
              <form onSubmit={handleAddTeam} className="flex flex-col sm:flex-row gap-3">
                <input type="text" placeholder="Nombre del equipo..." required
                  className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-green-500"
                  value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                <div className="relative flex-1">
                  <input type="file" accept="image/*" id="logo-upload" className="hidden"
                    onChange={e => setNewTeamLogoFile(e.target.files?.[0] || null)} />
                  <label htmlFor="logo-upload"
                    className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg p-2.5 cursor-pointer hover:bg-gray-100 transition-colors w-full">
                    <ImagePlus className="w-4 h-4 text-gray-400" />
                    <span className="truncate text-sm">{newTeamLogoFile ? newTeamLogoFile.name : "Logo (Opcional)"}</span>
                  </label>
                </div>
                <button type="submit" disabled={addingTeam}
                  className="inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                  {addingTeam ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Agregar
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Equipos Registrados ({teams.length})</h2>
              {teams.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay equipos registrados aún.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 p-3 rounded-xl hover:border-green-200 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt={team.name} className="w-9 h-9 rounded-full object-cover border border-gray-200 bg-white shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black text-sm border border-green-200 shrink-0">
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-gray-800 text-sm truncate">{team.name}</span>
                      </div>
                      <button onClick={() => handleRemoveTeam(team.id)}
                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg p-1.5 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB JUGADORES ── */}
        {activeTab === "jugadores" && (
          <AdminJugadoresTab teams={teams} tournamentId={tournament.id} />
        )}

        {/* ── TAB FIXTURE ── */}
        {activeTab === "fixture" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Fixture del Campeonato</h2>
                <p className="text-sm text-gray-500">{matches.length} partido(s) generado(s).</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {matches.length > 0 && (
                  <button
                    onClick={() => {
                      if (editingFixture) {
                        // Reset edits to current DB state when exiting
                        const edits: Record<string, { home_team_id: string; away_team_id: string }> = {};
                        matches.forEach(m => { edits[m.id] = { home_team_id: m.home_team_id, away_team_id: m.away_team_id }; });
                        setFixtureEdits(edits);
                      }
                      setEditingFixture(!editingFixture);
                    }}
                    className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-colors ${
                      editingFixture
                        ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    {editingFixture ? "Salir de Edición" : "Editar Equipos"}
                  </button>
                )}
                <button onClick={handleGenerateFixture} disabled={generatingFixture}
                  className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-sm">
                  {generatingFixture ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarDays className="w-5 h-5" />}
                  Generar Fixture
                </button>
              </div>
            </div>

            {editingFixture && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700">
                  <strong>Modo edición activo.</strong> Cambia los equipos de cada partido y guarda individualmente. Los cambios no guardados se descartan al salir.
                </p>
              </div>
            )}

            {matches.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
                Aún no hay partidos. Haz clic en "Generar Fixture".
              </div>
            ) : (
              Array.from(new Set(matches.map(m => m.round))).map(round => (
                <div key={round} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-green-700 px-6 py-2.5">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">{round}</h3>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {matches.filter(m => m.round === round).map(match => {
                      const edit = fixtureEdits[match.id] ?? { home_team_id: match.home_team_id, away_team_id: match.away_team_id };
                      const isDirty = edit.home_team_id !== match.home_team_id || edit.away_team_id !== match.away_team_id;
                      return (
                        <li key={match.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-3 hover:bg-gray-50/50 transition-colors">
                          {editingFixture ? (
                            <>
                              <select
                                className="flex-1 bg-white border border-gray-200 text-gray-800 rounded-lg p-2 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500"
                                value={edit.home_team_id}
                                onChange={e => setFixtureEdits(prev => ({ ...prev, [match.id]: { ...edit, home_team_id: e.target.value } }))}
                              >
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              <div className="px-3 py-1 rounded bg-gray-100 text-gray-500 text-sm font-bold shrink-0">VS</div>
                              <select
                                className="flex-1 bg-white border border-gray-200 text-gray-800 rounded-lg p-2 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500"
                                value={edit.away_team_id}
                                onChange={e => setFixtureEdits(prev => ({ ...prev, [match.id]: { ...edit, away_team_id: e.target.value } }))}
                              >
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              {isDirty && (
                                <button
                                  onClick={() => handleSaveFixtureEdit(match.id)}
                                  disabled={savingFixtureEdit[match.id]}
                                  className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                                >
                                  {savingFixtureEdit[match.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                  Guardar
                                </button>
                              )}
                              {match.is_played && (
                                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded shrink-0">JUGADO</span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-right font-semibold text-gray-800 text-sm truncate pr-4">{getTeamName(match.home_team_id)}</span>
                              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold shrink-0">
                                {match.is_played ? `${match.home_goals} – ${match.away_goals}` : "vs"}
                              </span>
                              <span className="flex-1 text-left font-semibold text-gray-800 text-sm truncate pl-4">{getTeamName(match.away_team_id)}</span>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB RESULTADOS ── */}
        {activeTab === "resultados" && (
          <AdminResultadosTab initialMatches={matches} teams={teams} tournamentId={tournament.id} />
        )}

      </main>
    </div>
  );
}
