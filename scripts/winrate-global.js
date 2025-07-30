// winrate-global.js
// Calcula el winrate global de jugadores sumando los sets de dos torneos (vol1 y vol2) para un juego específico.
// Requiere: STARTGG_TOKEN válido y slugs de ambos torneos.

const STARTGG_TOKEN = "a7fafdd3139b23f9eef417bbe26fd91b";
const TOURNAMENTS = [
  { slug: "mixup-clash-fest", nombre: "Vol.1" },
  { slug: "mixup-clash-fest-vol-2", nombre: "Vol.2" },
  { slug: "tekken-open-match", nombre: "Tekken Open Match" },
  { slug: "tekken-open-match-vol-2", nombre: "Tekken Open Match Vol.2" }
];

// Devuelve un diccionario: { jugador: { victorias, derrotas, sets } }
async function obtenerStatsGlobal(juego) {
  const statsGlobal = {};
  for (const torneo of TOURNAMENTS) {
    // 1. Buscar el slug del evento del juego en el torneo
    const queryEventos = `query { tournament(slug: \"${torneo.slug}\") { events { name slug } } }`;
    const resEv = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + STARTGG_TOKEN
      },
      body: JSON.stringify({ query: queryEventos })
    });
    const dataEv = await resEv.json();
    const eventos = dataEv.data?.tournament?.events || [];
    const event = eventos.find(ev => ev.name.toLowerCase().includes(juego.toLowerCase()));
    if (!event) continue;
    // 2. Obtener sets del evento
    const querySets = `query { event(slug: \"${event.slug}\") { sets(page: 1, perPage: 128, sortType: RECENT) { nodes { slots { entrant { name } standing { stats { score { value } } } } } } } }`;
    const resSets = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + STARTGG_TOKEN
      },
      body: JSON.stringify({ query: querySets })
    });
    const dataSets = await resSets.json();
    const sets = dataSets.data?.event?.sets?.nodes || [];
    sets.forEach(set => {
      const s = set.slots;
      if (!s[0]?.entrant?.name || !s[1]?.entrant?.name) return;
      const p1 = s[0].entrant.name;
      const p2 = s[1].entrant.name;
      const score1 = s[0]?.standing?.stats?.score?.value;
      const score2 = s[1]?.standing?.stats?.score?.value;
      if (typeof score1 !== 'number' || typeof score2 !== 'number') return;
      if (!statsGlobal[p1]) statsGlobal[p1] = { victorias: 0, derrotas: 0, sets: 0 };
      if (!statsGlobal[p2]) statsGlobal[p2] = { victorias: 0, derrotas: 0, sets: 0 };
      statsGlobal[p1].sets++;
      statsGlobal[p2].sets++;
      if (score1 > score2) {
        statsGlobal[p1].victorias++;
        statsGlobal[p2].derrotas++;
      } else if (score2 > score1) {
        statsGlobal[p2].victorias++;
        statsGlobal[p1].derrotas++;
      }
    });
  }
  return statsGlobal;
}

// Ejemplo de uso:
// obtenerStatsGlobal('tekken').then(console.log);
// Para agregar al ranking, combinar con el render de la tabla y añadir columna Winrate Global.
