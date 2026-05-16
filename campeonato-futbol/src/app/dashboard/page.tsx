import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, Plus, Trophy, Calendar, Settings, Users, Swords, Eye } from "lucide-react";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const allTournamentIds = tournaments?.map(t => t.id) || [];

  // Quick stats
  const [teamsRes, matchesRes] = await Promise.all([
    allTournamentIds.length > 0
      ? supabase.from("teams").select("id", { count: "exact" }).in("tournament_id", allTournamentIds)
      : Promise.resolve({ count: 0 }),
    allTournamentIds.length > 0
      ? supabase.from("matches").select("id", { count: "exact" }).in("tournament_id", allTournamentIds).eq("is_played", true)
      : Promise.resolve({ count: 0 }),
  ]);

  const activeCount = tournaments?.filter(t => t.status === "active").length || 0;
  const teamsCount = (teamsRes as any).count || 0;
  const matchesCount = (matchesRes as any).count || 0;

  const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    draft:     { label: "Borrador",  cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    active:    { label: "Activo",    cls: "bg-green-100 text-green-800 border-green-200" },
    completed: { label: "Finalizado", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header FICCT */}
      <header className="bg-gradient-to-r from-[#0d1f13] via-[#1a5c38] to-[#0d1f13] shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c8a84b]/20 border border-[#c8a84b]/50 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-[#c8a84b]" />
              </div>
              <div>
                <p className="text-[#c8a84b] font-black text-sm tracking-widest uppercase leading-none">FICCT</p>
                <p className="text-white/60 text-[10px] tracking-wider leading-none">Hola, {user.email?.split("@")[0]}</p>
              </div>
            </div>
            <form action={async () => {
              "use server";
              const supabase = await createClient();
              await supabase.auth.signOut();
              redirect("/auth");
            }}>
              <button type="submit"
                className="flex items-center gap-2 text-sm font-medium text-red-300 hover:text-red-200 bg-red-900/30 hover:bg-red-900/50 px-3 py-1.5 rounded-lg transition-colors border border-red-800/40">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Torneos Activos", value: activeCount, icon: Trophy, color: "text-green-700", bg: "bg-green-50 border-green-100" },
            { label: "Partidos Jugados", value: matchesCount, icon: Swords, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
            { label: "Equipos Registrados", value: teamsCount, icon: Users, color: "text-purple-700", bg: "bg-purple-50 border-purple-100" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} border rounded-2xl p-4 sm:p-5 text-center shadow-sm`}>
              <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
              <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Header acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tus Campeonatos</h2>
            <p className="text-sm text-gray-500 mt-0.5">Administra torneos, fixtures y resultados.</p>
          </div>
          <Link href="/admin/nuevo"
            className="inline-flex items-center justify-center gap-2 bg-[#1a5c38] hover:bg-[#14472b] text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all w-fit">
            <Plus className="w-5 h-5" />
            Nuevo Campeonato
          </Link>
        </div>

        {/* Grid torneos */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {!tournaments || tournaments.length === 0 ? (
            <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
              <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-700 mb-1">No tienes torneos</h3>
              <p className="text-gray-400 text-sm mb-4">Empieza creando tu primer campeonato.</p>
              <Link href="/admin/nuevo" className="text-[#1a5c38] font-semibold hover:underline text-sm">
                Crear campeonato →
              </Link>
            </div>
          ) : tournaments.map(t => {
            const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft;
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                {/* Barra superior color */}
                <div className="h-1.5 bg-gradient-to-r from-[#1a5c38] to-[#c8a84b]" />
                <div className="p-5 flex-grow">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="font-bold text-base text-gray-900 line-clamp-2 group-hover:text-[#1a5c38] transition-colors">{t.name}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${sc.cls}`}>{sc.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(t.created_at).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <span>·</span>
                    <span className="capitalize">{t.format}</span>
                  </div>
                </div>
                <div className="border-t border-gray-50 p-3 px-5 flex items-center justify-between gap-3 bg-gray-50/50">
                  <Link href={`/c/${t.slug}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#1a5c38] transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                    Ver público
                  </Link>
                  <Link href={`/admin/${t.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-[#1a5c38] hover:text-white hover:border-[#1a5c38] px-3 py-1.5 rounded-lg shadow-sm transition-all">
                    <Settings className="w-3.5 h-3.5" />
                    Administrar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
