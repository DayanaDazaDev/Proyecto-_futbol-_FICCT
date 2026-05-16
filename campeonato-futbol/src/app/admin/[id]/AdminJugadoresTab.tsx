"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Team, Player } from "./types";
import { POSITIONS } from "./types";

interface Props {
  teams: Team[];
  tournamentId: string;
}

export default function AdminJugadoresTab({ teams, tournamentId }: Props) {
  const supabase = createClient();
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || "");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [position, setPosition] = useState("");
  const [carnet, setCarnet] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const loadPlayers = async (teamId: string) => {
    if (!teamId) return;
    setLoadingPlayers(true);
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });
    setPlayers(data || []);
    setLoadingPlayers(false);
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    loadPlayers(teamId);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("tournaments_media")
      .upload(`players/${fileName}`, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage
      .from("tournaments_media")
      .getPublicUrl(`players/${fileName}`);
    return publicUrl;
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedTeamId) return;
    setAddingPlayer(true);

    let photo_url: string | null = null;
    if (photoFile) photo_url = await uploadPhoto(photoFile);

    const { data, error } = await supabase
      .from("players")
      .insert({
        team_id: selectedTeamId,
        name: name.trim(),
        number: number ? parseInt(number) : null,
        position: position || null,
        carnet: carnet.trim() || null,
        photo_url,
        is_verified: false,
      })
      .select()
      .single();

    if (data) {
      setPlayers((prev) => [...prev, data]);
      setName(""); setNumber(""); setPosition(""); setCarnet(""); setPhotoFile(null);
    } else {
      alert("Error al agregar jugador: " + error?.message);
    }
    setAddingPlayer(false);
  };

  const handleRemovePlayer = async (id: string) => {
    if (!confirm("¿Eliminar este jugador?")) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (!error) setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleVerified = async (player: Player) => {
    const { data } = await supabase
      .from("players")
      .update({ is_verified: !player.is_verified, updated_at: new Date().toISOString() })
      .eq("id", player.id)
      .select()
      .single();
    if (data) setPlayers((prev) => prev.map((p) => (p.id === player.id ? data : p)));
  };

  // Load players for first team on mount
  useEffect(() => { if (teams[0]?.id) loadPlayers(teams[0].id); }, []);

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
        Registra al menos un equipo primero.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de equipo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Seleccionar Equipo</label>
        <select
          className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-500"
          value={selectedTeamId}
          onChange={(e) => handleTeamChange(e.target.value)}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Formulario nuevo jugador */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Agregar Jugador</h2>
        <form onSubmit={handleAddPlayer} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text" placeholder="Nombre completo *" required
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-green-500"
              value={name} onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text" placeholder="N° Carnet universitario"
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-green-500"
              value={carnet} onChange={(e) => setCarnet(e.target.value)}
            />
            <input
              type="number" placeholder="Número (ej: 10)"
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-green-500"
              value={number} onChange={(e) => setNumber(e.target.value)}
            />
            <select
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-green-500"
              value={position} onChange={(e) => setPosition(e.target.value)}
            >
              {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* Upload foto */}
          <div>
            <input type="file" accept="image/*" id="player-photo" className="hidden"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
            <label htmlFor="player-photo"
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg p-2.5 cursor-pointer hover:bg-gray-100 transition-colors w-full">
              <ImagePlus className="w-4 h-4 text-gray-400" />
              <span className="text-sm truncate">{photoFile ? photoFile.name : "Foto del jugador (opcional)"}</span>
            </label>
          </div>

          <button type="submit" disabled={addingPlayer}
            className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {addingPlayer ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Agregar Jugador
          </button>
        </form>
      </div>

      {/* Lista de jugadores */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-800 mb-4">
          Plantilla ({players.length} jugadores)
        </h3>
        {loadingPlayers ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
        ) : players.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
            No hay jugadores en este equipo.
          </div>
        ) : (
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-200 transition-colors">
                {/* Foto */}
                {player.photo_url ? (
                  <img src={player.photo_url} alt={player.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black text-sm border-2 border-green-200 shrink-0">
                    {player.number || player.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm truncate">{player.name}</span>
                    {player.carnet && (
                      <span className="text-xs text-gray-400">#{player.carnet}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">
                    {player.position || "Sin posición"}
                    {player.number ? ` · #${player.number}` : ""}
                  </div>
                </div>

                {/* Badge verificado */}
                <button
                  onClick={() => handleToggleVerified(player)}
                  title={player.is_verified ? "Marcar como pendiente" : "Marcar como verificado"}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                    player.is_verified
                      ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                      : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300"
                  }`}
                >
                  {player.is_verified ? "✓ Verificado" : "⚠ Pendiente"}
                </button>

                {/* Eliminar */}
                <button onClick={() => handleRemovePlayer(player.id)}
                  className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg p-1.5 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
