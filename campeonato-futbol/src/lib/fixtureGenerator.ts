export function generateLeagueFixture(teamIds: string[], dobleVuelta = false) {
  const matches: { round_or_group: string; home_team_id: string; away_team_id: string }[] = []; const list = [...teamIds];
  if (list.length % 2 !== 0) list.push(null as any);
  const fixed = list[0]; const rotating = list.slice(1); const totalRounds = list.length - 1;
  const rounds: { home: string; away: string }[][] = [];

  for (let r=0; r<totalRounds; r++) {
    const round: { home: string; away: string }[] = []; const current = [fixed, ...rotating];
    for (let i=0; i<current.length/2; i++) {
      const h=current[i], a=current[current.length-1-i];
      if (h && a) round.push({home:h as string, away:a as string});
    }
    rounds.push(round); rotating.unshift(rotating.pop()!);
  }

  rounds.forEach((round, idx) => round.forEach(m => matches.push({round_or_group:`Jornada ${idx+1}`, home_team_id:m.home, away_team_id:m.away})));

  if (dobleVuelta) {
    const vuelta = matches.map(m => ({...m, home_team_id:m.away_team_id, away_team_id:m.home_team_id, round_or_group:`Jornada ${parseInt(m.round_or_group.split(' ')[1])+totalRounds}`}));
    matches.push(...vuelta);
  }
  return matches;
}
