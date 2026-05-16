import { calculateStandings } from "@/lib/standingsCalculator";

const makeTeam = (id: string, name = `Team ${id}`) => ({ id, name, logo_url: null });
const makeMatch = (
  home: string, away: string,
  homeGoals: number | null, awayGoals: number | null,
  played = true
) => ({
  home_team_id: home,
  away_team_id: away,
  home_goals: homeGoals,
  away_goals: awayGoals,
  is_played: played,
});

describe("calculateStandings", () => {
  it("devuelve tabla vacía si no hay equipos", () => {
    expect(calculateStandings([], [])).toEqual([]);
  });

  it("devuelve todos los equipos con 0 puntos si no hay partidos jugados", () => {
    const teams = [makeTeam("a"), makeTeam("b")];
    const standings = calculateStandings(teams, []);
    expect(standings).toHaveLength(2);
    standings.forEach((s) => {
      expect(s.pts).toBe(0);
      expect(s.pj).toBe(0);
    });
  });

  it("3 puntos al ganador, 0 al perdedor", () => {
    const teams = [makeTeam("home"), makeTeam("away")];
    const matches = [makeMatch("home", "away", 2, 0)];
    const standings = calculateStandings(teams, matches);
    const home = standings.find((s) => s.teamId === "home")!;
    const away = standings.find((s) => s.teamId === "away")!;
    expect(home.pts).toBe(3);
    expect(home.pg).toBe(1);
    expect(away.pts).toBe(0);
    expect(away.pp).toBe(1);
  });

  it("1 punto a cada equipo en empate", () => {
    const teams = [makeTeam("a"), makeTeam("b")];
    const matches = [makeMatch("a", "b", 1, 1)];
    const standings = calculateStandings(teams, matches);
    standings.forEach((s) => {
      expect(s.pts).toBe(1);
      expect(s.pe).toBe(1);
    });
  });

  it("calcula diferencia de goles correctamente", () => {
    const teams = [makeTeam("a"), makeTeam("b")];
    const matches = [makeMatch("a", "b", 3, 1)];
    const standings = calculateStandings(teams, matches);
    const a = standings.find((s) => s.teamId === "a")!;
    const b = standings.find((s) => s.teamId === "b")!;
    expect(a.dg).toBe(2);   // +2
    expect(b.dg).toBe(-2);  // -2
    expect(a.gf).toBe(3);
    expect(b.gc).toBe(3);
  });

  it("ordena por puntos descendente", () => {
    const teams = [makeTeam("a"), makeTeam("b"), makeTeam("c")];
    const matches = [
      makeMatch("a", "b", 1, 0), // a=3pts
      makeMatch("b", "c", 2, 0), // b=3pts
      makeMatch("a", "c", 0, 0), // a=4pts total, c=1pt
    ];
    const standings = calculateStandings(teams, matches);
    expect(standings[0].teamId).toBe("a"); // 4pts
    expect(standings[1].teamId).toBe("b"); // 3pts
    expect(standings[2].teamId).toBe("c"); // 1pt
  });

  it("ignora partidos no jugados (is_played=false)", () => {
    const teams = [makeTeam("a"), makeTeam("b")];
    const matches = [makeMatch("a", "b", 5, 0, false)]; // not played
    const standings = calculateStandings(teams, matches);
    standings.forEach((s) => expect(s.pts).toBe(0));
  });

  it("ignora partidos con goles null", () => {
    const teams = [makeTeam("a"), makeTeam("b")];
    const matches = [makeMatch("a", "b", null, null, true)];
    const standings = calculateStandings(teams, matches);
    standings.forEach((s) => expect(s.pj).toBe(0));
  });

  it("PJ se incrementa para ambos equipos", () => {
    const teams = [makeTeam("a"), makeTeam("b")];
    const matches = [
      makeMatch("a", "b", 1, 0),
      makeMatch("b", "a", 2, 1),
    ];
    const standings = calculateStandings(teams, matches);
    standings.forEach((s) => expect(s.pj).toBe(2));
  });
});
