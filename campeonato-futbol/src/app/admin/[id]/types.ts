export type Tournament = {
  id: string;
  name: string;
  format: "liga" | "eliminacion" | "grupos";
  status: "draft" | "active" | "completed";
  slug: string;
  creator_id: string;
  created_at: string;
};

export type Team = {
  id: string;
  tournament_id: string;
  name: string;
  logo_url: string | null;
};

export type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  position: string | null;
  carnet: string | null;
  is_verified: boolean;
  photo_url: string | null;
};

export type Match = {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  round: string;
  home_goals: number | null;
  away_goals: number | null;
  is_played: boolean;
  status: "scheduled" | "live" | "finished" | "cancelled";
  match_date: string | null;
  match_time: string | null;
  location: string | null;
  referee_notes: string | null;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  event_type: "goal" | "yellow_card" | "red_card" | "assist" | "mvp" | "best_goalkeeper";
  is_own_goal: boolean;
  minute: number | null;
};

export const EVENT_LABELS: Record<MatchEvent["event_type"], { label: string; icon: string }> = {
  goal: { label: "Gol", icon: "⚽" },
  yellow_card: { label: "Tarjeta Amarilla", icon: "🟨" },
  red_card: { label: "Tarjeta Roja", icon: "🟥" },
  assist: { label: "Asistencia", icon: "🤝" },
  mvp: { label: "MVP", icon: "⭐" },
  best_goalkeeper: { label: "Mejor Portero", icon: "🧤" },
};

export const STATUS_CONFIG = {
  scheduled: { label: "Programado", color: "bg-gray-100 text-gray-600" },
  live: { label: "En Juego", color: "bg-green-100 text-green-700" },
  finished: { label: "Finalizado", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Suspendido", color: "bg-orange-100 text-orange-700" },
};

export const POSITIONS = [
  { value: "", label: "Posición..." },
  { value: "POR", label: "Portero" },
  { value: "DEF", label: "Defensa" },
  { value: "MED", label: "Mediocampista" },
  { value: "DEL", label: "Delantero" },
];
