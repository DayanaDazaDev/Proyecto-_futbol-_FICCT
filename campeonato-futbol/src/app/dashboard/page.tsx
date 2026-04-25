import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, Plus, Trophy, Calendar, Settings } from "lucide-react";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: tournaments } = await supabase.from("tournaments").select("*").eq("creator_id", user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="text-emerald-600 w-6 h-6" />
              <span>Hola, {user.email?.split('@')[0] || "Usuario"}</span>
            </h1>
            <form action={async () => {
              "use server";
              const supabase = await createClient();
              await supabase.auth.signOut();
              redirect("/auth");
            }}>
              <button 
                type="submit" 
                className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 mt-4">
        {/* Actions Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tus Campeonatos</h2>
            <p className="text-sm text-gray-500 mt-1">Administra tus torneos, fixtures y resultados.</p>
          </div>
          <Link 
            href="/admin/nuevo" 
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Plus className="w-5 h-5" />
            Crear Nuevo Campeonato
          </Link>
        </div>

        {/* Tournaments Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments?.length === 0 ? (
            <div className="col-span-full bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No tienes torneos</h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">Empieza creando tu primer campeonato ahora.</p>
              <Link href="/admin/nuevo" className="text-emerald-600 font-medium hover:underline">Crear campeonato →</Link>
            </div>
          ) : (
            tournaments?.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{t.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      t.status === "draft" ? "bg-gray-100 text-gray-700 border-gray-200" : 
                      t.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                      "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {t.status === "draft" ? "Borrador" : t.status === "active" ? "Activo" : "Finalizado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 border-t border-gray-100 p-3 px-5 flex items-center justify-between gap-3">
                  <Link 
                    href={`/c/${t.slug}`} 
                    className="text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors"
                  >
                    Ver público
                  </Link>
                  <Link 
                    href={`/admin/${t.id}`} 
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Administrar
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
