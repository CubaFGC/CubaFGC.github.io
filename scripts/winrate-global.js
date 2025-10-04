// winrate-global.js
// Calcula el winrate global de jugadores sumando los sets de todos los torneos asociados al token.
// Busca automáticamente todos los torneos del usuario y procesa los eventos del juego especificado.

const STARTGG_TOKEN = "a7fafdd3139b23f9eef417bbe26fd91b";

// Cache para almacenar los torneos obtenidos de la API
let torneosCache = null;
let torneosCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Obtiene todos los torneos del usuario automáticamente
async function obtenerTorneos() {
  // Usar cache si está disponible y no ha expirado
  const now = Date.now();
  if (torneosCache && (now - torneosCacheTime) < CACHE_DURATION) {
    return torneosCache;
  }

  try {
    const query = `
      query {
        currentUser {
          tournaments(query: {
            perPage: 50
            page: 1
          }) {
            nodes {
              name
              slug
            }
          }
        }
      }
    `;
    
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + STARTGG_TOKEN
      },
      body: JSON.stringify({ query })
    });
    
    const data = await res.json();
    const torneos = data.data?.currentUser?.tournaments?.nodes || [];
    
    // Guardar en cache
    torneosCache = torneos;
    torneosCacheTime = now;
    
    return torneos;
  } catch (error) {
    console.error('[Winrate Global] Error al obtener torneos:', error);
    return [];
  }
}

// Mapa de alias para nombres de juegos
const GAME_ALIASES = {
  "smash": ["super smash", "smash bros", "ssbu", "ultimate", "bros", "smash"],
  "tekken": ["tekken", "tk8", "tekken 8"],
  "sf6": ["sf6", "street fighter", "street fighter 6"],
  "strive": ["strive", "guilty gear", "ggst", "guilty gear strive"]
};

// Función para buscar evento por nombre de juego con múltiples alias
function buscarEventoPorJuego(eventos, juego) {
  const juegoLower = juego.toLowerCase();
  const aliases = GAME_ALIASES[juegoLower] || [juegoLower];
  
  // Ordenar aliases por longitud (más largos primero para coincidencias más precisas)
  const sortedAliases = [...aliases].sort((a, b) => b.length - a.length);
  
  // Buscar usando todos los alias posibles
  for (const alias of sortedAliases) {
    const event = eventos.find(ev => ev.name.toLowerCase().includes(alias.toLowerCase()));
    if (event) {
      return event;
    }
  }
  
  return null;
}

// Devuelve un diccionario: { jugador: { victorias, derrotas, sets } }
async function obtenerStatsGlobal(juego) {
  const statsGlobal = {};
  const isSmash = juego.toLowerCase() === 'smash';
  
  // Obtener todos los torneos automáticamente
  const torneos = await obtenerTorneos();
  
  if (torneos.length === 0) {
    console.warn('[Winrate Global] No se encontraron torneos para procesar');
    return statsGlobal;
  }
  
  for (const torneo of torneos) {
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
    
    // Usar la función mejorada de búsqueda con alias
    const event = buscarEventoPorJuego(eventos, juego);
    
    if (!event) {
      continue;
    }
    
    // 2. Obtener todos los sets (sin filtro de estado para Smash)
    const querySets = `query { 
      event(slug: \"${event.slug}\") { 
        sets(
          page: 1
          perPage: 200
          sortType: STANDARD
        ) { 
          nodes { 
            displayScore
            winnerId
            state
            slots { 
              entrant { 
                id
                name 
              } 
              standing { 
                placement
                stats { 
                  score { 
                    value 
                    displayValue
                  } 
                } 
              } 
            } 
          } 
        } 
      } 
    }`;
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
    
    if (isSmash && sets.length > 0) {
      console.log(`[SMASH] ${torneo.name}: ${sets.length} sets encontrados`);
      console.log('[SMASH] Primer set completo:', JSON.stringify(sets[0], null, 2));
    }
    
    let setsCount = 0;
    let setsRechazados = 0;
    
    sets.forEach((set) => {
      const s = set.slots;
      
      // Verificar que los slots existan y tengan nombres
      if (!s || s.length < 2 || !s[0]?.entrant?.name || !s[1]?.entrant?.name) {
        if (isSmash) setsRechazados++;
        return;
      }
      
      const p1 = s[0].entrant.name;
      const p2 = s[1].entrant.name;
      const p1Id = s[0].entrant.id;
      const p2Id = s[1].entrant.id;
      
      // Método 1: Intentar obtener score de stats.score.value
      let score1 = s[0]?.standing?.stats?.score?.value;
      let score2 = s[1]?.standing?.stats?.score?.value;
      
      // Método 2: Usar placement (1 = ganador, 2 = perdedor)
      if ((typeof score1 !== 'number' || typeof score2 !== 'number') && 
          s[0]?.standing?.placement && s[1]?.standing?.placement) {
        const p1Placement = s[0].standing.placement;
        const p2Placement = s[1].standing.placement;
        if (p1Placement === 1 && p2Placement === 2) {
          score1 = 1;
          score2 = 0;
        } else if (p1Placement === 2 && p2Placement === 1) {
          score1 = 0;
          score2 = 1;
        }
      }
      
      // Método 3: Intentar obtener score de displayScore (formato "2 - 1")
      if ((typeof score1 !== 'number' || typeof score2 !== 'number') && set.displayScore) {
        const scoreMatch = set.displayScore.match(/(\d+)\s*-\s*(\d+)/);
        if (scoreMatch) {
          score1 = parseInt(scoreMatch[1]);
          score2 = parseInt(scoreMatch[2]);
        }
      }
      
      // Método 4: Usar winnerId si existe pero no hay scores
      if ((typeof score1 !== 'number' || typeof score2 !== 'number') && set.winnerId) {
        // Asignar 1-0 basado en el ganador
        if (set.winnerId === p1Id) {
          score1 = 1;
          score2 = 0;
        } else if (set.winnerId === p2Id) {
          score1 = 0;
          score2 = 1;
        }
      }
      
      // Si no hay score válido o no hay ganador claro, saltar este set
      if (typeof score1 !== 'number' || typeof score2 !== 'number' || score1 === score2) {
        if (isSmash) setsRechazados++;
        return;
      }
      
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
      setsCount++;
    });
    
    if (isSmash && sets.length > 0) {
      console.log(`[SMASH] ${torneo.name}: ${setsCount} procesados, ${setsRechazados} rechazados`);
    }
  }
  
  if (isSmash) {
    console.log('[SMASH] Total jugadores en statsGlobal:', Object.keys(statsGlobal).length);
    console.log('[SMASH] Primeros 3 jugadores:', Object.keys(statsGlobal).slice(0, 3).map(k => ({
      nombre: k,
      stats: statsGlobal[k]
    })));
  }
  
  return statsGlobal;
}

// Ejemplo de uso:
// obtenerStatsGlobal('tekken').then(console.log);
// Para agregar al ranking, combinar con el render de la tabla y añadir columna Winrate Global.
