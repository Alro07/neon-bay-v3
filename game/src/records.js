// records.js — the player's run statistics for Neon Bay v3: jobs, money,
// cars, distance, stashes, fares, busts and shots. The pause menu shows them
// and the save file keeps them.
export function createRecords() {
  return {
    jobsDone: 0,
    cashEarned: 0,
    carsStolen: 0,
    distanceM: 0,
    stashesFound: 0,
    faresDone: 0,
    busts: 0,
    shotsFired: 0,
    copsDown: 0,
    playSeconds: 0,
  };
}

export function recordLines(s) {
  const mins = Math.floor(s.playSeconds / 60);
  return [
    ['Story jobs completed', String(s.jobsDone) + ' / 10'],
    ['Cash earned', '$' + Math.floor(s.cashEarned).toLocaleString('en-US')],
    ['Cars stolen', String(s.carsStolen)],
    ['Distance driven', (s.distanceM / 1000).toFixed(1) + ' km'],
    ['Stashes found', String(s.stashesFound)],
    ['Fares completed', String(s.faresDone)],
    ['Cops taken down', String(s.copsDown)],
    ['Times busted', String(s.busts)],
    ['Shots fired', String(s.shotsFired)],
    ['Time played', mins + ' min'],
  ];
}
