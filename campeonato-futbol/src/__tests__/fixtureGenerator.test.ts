import {
  generateLeagueFixture,
  generateKnockoutFixture,
  generateGroupsFixture,
} from "@/lib/fixtureGenerator";

const TEAMS = ["t1", "t2", "t3", "t4"];

describe("generateLeagueFixture", () => {
  it("genera partidos para todos los emparejamientos (todos vs todos)", () => {
    const matches = generateLeagueFixture(TEAMS);
    // Con 4 equipos, ida sola = 6 partidos
    expect(matches).toHaveLength(6);
  });

  it("no genera partido de un equipo contra sí mismo", () => {
    const matches = generateLeagueFixture(TEAMS);
    matches.forEach((m) =>
      expect(m.home_team_id).not.toBe(m.away_team_id)
    );
  });

  it("genera jornadas con nombres 'Jornada N'", () => {
    const matches = generateLeagueFixture(TEAMS);
    matches.forEach((m) => expect(m.round).toMatch(/^Jornada \d+$/));
  });

  it("doble vuelta duplica los partidos", () => {
    const single = generateLeagueFixture(TEAMS, false).length;
    const double = generateLeagueFixture(TEAMS, true).length;
    expect(double).toBe(single * 2);
  });

  it("funciona con 2 equipos (mínimo)", () => {
    const matches = generateLeagueFixture(["a", "b"]);
    expect(matches).toHaveLength(1);
    expect(matches[0].home_team_id).not.toBe(matches[0].away_team_id);
  });

  it("funciona con número impar de equipos (usa bye interno)", () => {
    const teams = ["a", "b", "c"];
    const matches = generateLeagueFixture(teams);
    // 3 equipos → rellena con null internamente → genera partidos válidos sin self-matches
    matches.forEach((m) =>
      expect(m.home_team_id).not.toBe(m.away_team_id)
    );
  });
});

describe("generateKnockoutFixture", () => {
  it("genera pares de emparejamientos (n/2 partidos para n par)", () => {
    const matches = generateKnockoutFixture(TEAMS);
    expect(matches).toHaveLength(2); // 4 equipos → 2 partidos
  });

  it("no genera partido de un equipo contra sí mismo", () => {
    const matches = generateKnockoutFixture(TEAMS);
    matches.forEach((m) =>
      expect(m.home_team_id).not.toBe(m.away_team_id)
    );
  });

  it("asigna nombre de etapa correcto para 2 equipos (Final)", () => {
    const matches = generateKnockoutFixture(["a", "b"]);
    expect(matches[0].round).toBe("Final");
  });

  it("asigna nombre de etapa correcto para 4 equipos (Semifinal)", () => {
    const matches = generateKnockoutFixture(TEAMS);
    matches.forEach((m) => expect(m.round).toBe("Semifinal"));
  });

  it("asigna nombre de etapa correcto para 8 equipos (Cuartos de Final)", () => {
    const teams8 = Array.from({ length: 8 }, (_, i) => `t${i + 1}`);
    const matches = generateKnockoutFixture(teams8);
    matches.forEach((m) => expect(m.round).toBe("Cuartos de Final"));
  });
});

describe("generateGroupsFixture", () => {
  it("genera partidos con prefix 'Grupo A' y 'Grupo B'", () => {
    const matches = generateGroupsFixture(TEAMS, 2);
    const rounds = Array.from(new Set(matches.map((m) => m.round.split(" - ")[0])));
    expect(rounds).toContain("Grupo A");
    expect(rounds).toContain("Grupo B");
  });

  it("no genera partido de un equipo contra sí mismo", () => {
    const matches = generateGroupsFixture(TEAMS, 2);
    matches.forEach((m) =>
      expect(m.home_team_id).not.toBe(m.away_team_id)
    );
  });

  it("distribuye equipos entre grupos", () => {
    const matches = generateGroupsFixture(TEAMS, 2);
    const groupA = matches.filter((m) => m.round.startsWith("Grupo A"));
    const groupB = matches.filter((m) => m.round.startsWith("Grupo B"));
    expect(groupA.length).toBeGreaterThan(0);
    expect(groupB.length).toBeGreaterThan(0);
  });
});
