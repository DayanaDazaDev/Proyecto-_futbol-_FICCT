import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminPanelClient from "./AdminPanelClient";

export default async function AdminPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!tournament) redirect("/dashboard");

  return <AdminPanelClient tournament={tournament} />;
}
