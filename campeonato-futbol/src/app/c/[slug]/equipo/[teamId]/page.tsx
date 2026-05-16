import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Shield } from "lucide-react";

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
    .from("tournaments")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();
  if (!tournament) notFound();

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();
  if (!team) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", team.id)
    .order("number", { ascending: true, nullsFirst: false });

  const playersList = players || [];
  const verifiedCount = playersList.filter((p) => p.is_verified).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1f13] via-[#122b19] to-[#0d1f13] pb-16">

      {/* Header con identidad FICCT */}
      <header className="relative overflow-hidden pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a5c38]/60 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Volver */}
          <Link
            href={`/c/${tournament.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a {tournament.name}
          </Link>

          {/* Branding FICCT mini */}
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-4 h-4 text-[#c8a84b]" />
            <span className="text-[#c8a84b] text-xs font-black uppercase tracking-[0.2em]">
              FICCT · {tournament.name}
            </span>
          </div>

          {/* Perfil del equipo */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Logo */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/10 border-4 border-[#c8a84b]/60 shadow-2xl overflow-hidden shrink-0 flex items-center justify-center">
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={`Escudo ${team.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl font-black text-white/40">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {team.name}
              </h1>
              <p className="text-[#c8a84b] text-sm font-semibold tracking-wider mt-1">
                Plantilla Oficial
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                <span className="text-xs text-white/60 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  {playersList.length} jugadores
                </span>
                {verifiedCount > 0 && (
                  <span className="text-xs text-green-300 bg-green-900/40 px-3 py-1 rounded-full border border-green-700/40">
                    ✓ {verifiedCount} verificados
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Plantilla */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6 px-1">
          <Users className="w-5 h-5 text-[#c8a84b]" />
          <h2 className="text-xl font-black text-white uppercase tracking-wider">
            Jugadores
          </h2>
        </div>

        {playersList.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 font-medium">
              Este equipo aún no ha registrado su plantilla.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playersList.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 hover:border-[#c8a84b]/40 hover:bg-white/10 transition-all group"
              >
                {/* Foto / Avatar */}
                <div className="shrink-0">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/20 group-hover:border-[#c8a84b]/60 transition-colors shadow-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1a5c38] to-[#c8a84b]/60 border-2 border-white/10 flex items-center justify-center shadow-lg">
                      <span className="text-white font-black text-lg">
                        {player.number ?? player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info jugador */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm truncate group-hover:text-[#c8a84b] transition-colors mb-0.5">
                    {player.name}
                  </h3>
                  <p className="text-xs text-white/50 uppercase tracking-wider">
                    {player.position ? POSITION_LABELS[player.position] || player.position : "Sin posición"}
                    {player.number ? ` · #${player.number}` : ""}
                  </p>
                  {/* Badge verificación — descriptivo */}
                  {player.is_verified ? (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-black text-green-300 bg-green-900/50 border border-green-700/40 px-2 py-0.5 rounded-full">
                      ✓ Estudiante FICCT Verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-yellow-400/70 bg-yellow-900/20 border border-yellow-700/20 px-2 py-0.5 rounded-full">
                      ⚠ Pendiente de verificación
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leyenda verificación */}
        {playersList.length > 0 && (
          <p className="text-center text-white/20 text-xs mt-8">
            ✓ Verificado por administrador FICCT&nbsp;&nbsp;·&nbsp;&nbsp;⚠ Verificación pendiente
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="w-3 h-3 text-[#c8a84b]" />
          <span className="text-[#c8a84b] text-xs font-bold uppercase tracking-widest">FICCT · UAGRM</span>
        </div>
        <p className="text-white/20 text-xs">Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones</p>
      </footer>
    </div>
  );
}
