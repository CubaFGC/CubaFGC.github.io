// Historial de los 3 juegos principales del Mixup Clash Fest: Tekken 8, Strive, SF6
const STARTGG_TOKEN = "a7fafdd3139b23f9eef417bbe26fd91b";
const TOURNAMENT_SLUG = "mixup-clash-fest";

// IDs y slugs para los 3 eventos
const EVENTOS = [
  {
    id: 'tekken',
    slug: 'event/tekken-brackets',
    nombre: 'Tekken 8',
    status: 'status-tekken',
    info: 'info-tekken',
    btn: 'btn-tekken'
  },
  {
    id: 'strive',
    slug: 'event/ggst-brackets',
    nombre: 'Guilty Gear Strive',
    status: 'status-strive',
    info: 'info-strive',
    btn: 'btn-strive'
  },
  {
    id: 'sf6',
    slug: 'event/sf6-brackets',
    nombre: 'Street Fighter 6',
    status: 'status-sf6',
    info: 'info-sf6',
    btn: 'btn-sf6'
  }
];

// Ejecutar solo en la página de historial general
if (window.location.pathname.endsWith('/view/mcf/historial-mcf.html')) {
  window.addEventListener('DOMContentLoaded', function() {
    EVENTOS.forEach(ev => cargarEvento(ev));
  });
}

async function cargarEvento(ev) {
  const query = `
    query {
      event(slug: \"mixup-clash-fest/${ev.slug}\") {
        name
        startAt
        endAt
        state
        images { url type } // <-- Pedimos imágenes a nivel de evento
        videogame { name }
        tournament {
          name
          images { url type }
          owner { name }
          venueAddress
          city
          countryCode
          streams { streamName streamSource }
        }
        sets(page: 1, perPage: 8, sortType: RECENT) {
          nodes {
            id
            fullRoundText
            slots {
              entrant { id name }
              standing { stats { score { value } } }
            }
          }
        }
        standings(query: { perPage: 8, page: 1 }) {
          nodes {
            placement
            entrant { name }
          }
        }
        entrants(query: { perPage: 8 }) { nodes { name } }
      }
    }
  `;
  try {
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + STARTGG_TOKEN
      },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    mostrarEvento(ev, data.data.event);
  } catch (e) {
    document.getElementById(ev.status).textContent = 'Error';
  }
}

function mostrarEvento(ev, data) {
  if (!data) {
    document.getElementById(ev.status).textContent = 'No disponible';
    return;
  }
  // Estado
  let estado = 'Cerrado';
  if (data.state === 1 || data.state === 5) estado = 'Activo';
  else if (data.state === 2) estado = 'Finalizado';
  document.getElementById(ev.status).textContent = estado;
  document.getElementById(ev.status).className = 'event-access-status ' + (estado === 'Activo' ? 'disponible' : 'cerrado');
  document.getElementById(ev.btn).style.display = '';
  // Banner/background (solo el banner del evento, no el del torneo)
  // Limpieza: no se usa banner ni fondo dinámico
  const card = document.getElementById('card-' + ev.id);
  if (card) {
    card.removeAttribute('data-bg');
    card.style.background = 'rgba(36,28,42,0.68)';
    card.style.removeProperty('--event-bg-url');
  }
  // Info extra
  let html = '';
  html += `<div style='margin-bottom:0.5rem;'><strong>Fecha:</strong> ${data.startAt ? new Date(data.startAt*1000).toLocaleDateString() : '-'}</div>`;
  html += `<div style='margin-bottom:0.5rem;'><strong>Organizador:</strong> ${data.tournament.owner?.name || '-'}</div>`;
  html += `<div style='margin-bottom:0.5rem;'><strong>Lugar:</strong> ${data.tournament.venueAddress || data.tournament.city || '-'}</div>`;
  // Top 8
  html += `<h4 style='margin:0.7rem 0 0.2rem;'>Top 8</h4><ol style='padding-left:1.2rem;'>`;
  (data.standings?.nodes || []).forEach(s => {
    html += `<li><strong>#${s.placement}</strong> - ${s.entrant.name}</li>`;
  });
  html += `</ol>`;
  // VS Destacados
  html += `<h4 style='margin:0.7rem 0 0.2rem;'>VS Destacados</h4><table class='tabla-vs'><thead><tr><th>Jugador 1</th><th>Jugador 2</th><th>Ronda</th><th>Score</th></tr></thead><tbody>`;
  (data.sets?.nodes || []).forEach(set => {
    const s = set.slots;
    html += `<tr><td>${s[0]?.entrant?.name || '-'}</td><td>${s[1]?.entrant?.name || '-'}</td><td>${set.fullRoundText || '-'}</td><td>${(s[0]?.standing?.stats?.score?.value ?? '-') + ' - ' + (s[1]?.standing?.stats?.score?.value ?? '-')}</td></tr>`;
  });
  html += '</tbody></table>';
  // Participantes destacados
  html += `<h4 style='margin:0.7rem 0 0.2rem;'>Participantes destacados</h4><ul style='padding-left:1.2rem;'>`;
  (data.entrants?.nodes || []).forEach(p => {
    html += `<li>${p.name}</li>`;
  });
  html += '</ul>';
  document.getElementById(ev.info).innerHTML = html;
}

// --- NUEVO: Mostrar tabla de matches de Tekken 8 desde historial-mcf.js ---
async function mostrarTablaTekken8() {
  // 1. Obtener el slug real de Tekken 8 desde la API
  const torneoSlug = "mixup-clash-fest";
  let tekkenSlug = null;
  try {
    const queryEventos = `
      query {
        tournament(slug: "${torneoSlug}") {
          events { name slug }
        }
      }
    `;
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
    const tekkenEvent = eventos.find(ev => ev.name.toLowerCase().includes('tekken'));
    if (!tekkenEvent) {
      const cont = document.getElementById('tekken8-historial-content');
      if (cont) cont.innerHTML = `<pre style='color:red;'>No se encontró el evento Tekken 8 en el torneo.</pre>`;
      return;
    }
    tekkenSlug = tekkenEvent.slug;
  } catch (e) {
    const cont = document.getElementById('tekken8-historial-content');
    if (cont) cont.innerHTML = '<p style="color:red;">Error al buscar el slug de Tekken 8.</p>';
    return;
  }
  // 2. Consultar los sets usando el slug real
  const query = `
    query {
      event(slug: "${tekkenSlug}") {
        name
        state
        standings(query: { perPage: 16 }) {
          nodes {
            placement
            entrant { name }
          }
        }
        sets(page: 1, perPage: 64, sortType: RECENT) {
          nodes {
            id
            fullRoundText
            slots {
              entrant { name }
              standing { stats { score { value } } }
            }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + STARTGG_TOKEN
      },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    const event = data.data?.event;
    const sets = event?.sets?.nodes || [];
    const standings = event?.standings?.nodes || [];
    if (sets.length === 0 && standings.length === 0) {
      const cont = document.getElementById('tekken8-historial-content');
      if (cont) cont.innerHTML = `<pre style='color:red;white-space:pre-wrap;'>Respuesta API:\n${JSON.stringify(data, null, 2)}</pre>`;
      return;
    }
    // --- Tabla de standings ---
    let html = `<h2 style='text-align:center;color:#ffd600;'>Top Tekken 8</h2>`;
    html += `<table class='tabla-vs' style='margin:0 auto 2rem;max-width:500px;'>`;
    html += `<thead><tr><th>Posición</th><th>Jugador</th></tr></thead><tbody>`;
    standings.forEach(s => {
      html += `<tr><td>#${s.placement}</td><td>${s.entrant?.name || '-'}</td></tr>`;
    });
    html += `</tbody></table>`;
    // --- Calcular estadísticas ---
    const stats = {};
    sets.forEach(set => {
      const s = set.slots;
      if (!s[0]?.entrant?.name || !s[1]?.entrant?.name) return;
      const p1 = s[0].entrant.name;
      const p2 = s[1].entrant.name;
      const score1 = s[0]?.standing?.stats?.score?.value;
      const score2 = s[1]?.standing?.stats?.score?.value;
      if (typeof score1 !== 'number' || typeof score2 !== 'number') return;
      // Inicializar
      if (!stats[p1]) stats[p1] = { victorias: 0, derrotas: 0, sets: 0 };
      if (!stats[p2]) stats[p2] = { victorias: 0, derrotas: 0, sets: 0 };
      stats[p1].sets++;
      stats[p2].sets++;
      if (score1 > score2) {
        stats[p1].victorias++;
        stats[p2].derrotas++;
      } else if (score2 > score1) {
        stats[p2].victorias++;
        stats[p1].derrotas++;
      }
    });
    // --- Tabla de estadísticas ---
    html += `<h2 style='text-align:center;color:#ffd600;'>Estadísticas Tekken 8</h2>`;
    html += `<table class='tabla-vs' style='margin:0 auto 2rem;max-width:500px;'>`;
    html += `<thead><tr><th>Jugador</th><th>Victorias</th><th>Derrotas</th><th>Winrate (%)</th></tr></thead><tbody>`;
    Object.entries(stats).forEach(([jugador, st]) => {
      const winrate = st.sets > 0 ? ((st.victorias / st.sets) * 100).toFixed(1) : '0.0';
      html += `<tr><td>${jugador}</td><td>${st.victorias}</td><td>${st.derrotas}</td><td>${winrate}</td></tr>`;
    });
    html += `</tbody></table>`;
    // --- Tabla de matches ---
    html += `<h2 style='text-align:center;color:#ffd600;'>Matches Tekken 8</h2>`;
    html += `<table class='tabla-vs' style='margin:0 auto;max-width:500px;'>`;
    html += `<thead><tr><th>Jugador 1</th><th>Jugador 2</th><th>Ronda</th></tr></thead><tbody>`;
    sets.forEach((set, idx) => {
      const s = set.slots;
      html += `<tr${idx % 2 === 0 ? ' class="par"' : ''}>
        <td>${s[0]?.entrant?.name || '-'}</td>
        <td>${s[1]?.entrant?.name || '-'}</td>
        <td>${set.fullRoundText || '-'}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    const cont = document.getElementById('tekken8-historial-content');
    if (cont) cont.innerHTML = html;
  } catch (e) {
    const cont = document.getElementById('tekken8-historial-content');
    if (cont) cont.innerHTML = '<p style="color:red;">Error al cargar matches de Tekken 8.</p>';
  }
}

// --- NUEVO: Mostrar tabla de standings, estadísticas y matches para cualquier juego ---
async function mostrarTablaHistorialJuego(nombreJuego, contentId) {
  const cont = document.getElementById(contentId);
  if (cont) {
    cont.innerHTML = `<div class="loader" style="display:flex;justify-content:center;align-items:center;height:120px;">
      <div class="spinner"></div>
      <span style="margin-left:1rem;color:#ffd600;font-size:1.2rem;">Cargando datos...</span>
    </div>`;
  }
  const torneoSlug = "mixup-clash-fest";
  let eventSlug = null;
  try {
    const queryEventos = `
      query {
        tournament(slug: "${torneoSlug}") {
          events { name slug }
        }
      }
    `;
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
    const event = eventos.find(ev => ev.name.toLowerCase().includes(nombreJuego.toLowerCase()));
    if (!event) {
      const cont = document.getElementById(contentId);
      if (cont) cont.innerHTML = `<pre style='color:red;'>No se encontró el evento ${nombreJuego} en el torneo.</pre>`;
      return;
    }
    eventSlug = event.slug;
  } catch (e) {
    const cont = document.getElementById(contentId);
    if (cont) cont.innerHTML = `<p style=\"color:red;\">Error al buscar el slug de ${nombreJuego}.</p>`;
    return;
  }
  // 2. Consultar standings y sets usando el slug real
  const query = `
    query {
      event(slug: "${eventSlug}") {
        name
        state
        standings(query: { perPage: 16 }) {
          nodes {
            placement
            entrant { name }
          }
        }
        sets(page: 1, perPage: 64, sortType: RECENT) {
          nodes {
            id
            fullRoundText
            slots {
              entrant { name }
              standing { stats { score { value } } }
            }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + STARTGG_TOKEN
      },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    const event = data.data?.event;
    const sets = event?.sets?.nodes || [];
    const standings = event?.standings?.nodes || [];
    if (sets.length === 0 && standings.length === 0) {
      const cont = document.getElementById(contentId);
      if (cont) cont.innerHTML = `<pre style='color:red;white-space:pre-wrap;'>Respuesta API:\n${JSON.stringify(data, null, 2)}</pre>`;
      return;
    }
    // --- Tabla de standings ---
    let html = `<h2 style='text-align:center;color:#ffd600;'>Top ${nombreJuego}</h2>`;
    html += `<table class='tabla-vs' style='margin:0 auto 2rem;max-width:500px;'>`;
    html += `<thead><tr><th>Posición</th><th>Jugador</th></tr></thead><tbody>`;
    standings.forEach(s => {
      html += `<tr><td>#${s.placement}</td><td>${s.entrant?.name || '-'}</td></tr>`;
    });
    html += `</tbody></table>`;
    // --- Calcular estadísticas ---
    const stats = {};
    sets.forEach(set => {
      const s = set.slots;
      if (!s[0]?.entrant?.name || !s[1]?.entrant?.name) return;
      const p1 = s[0].entrant.name;
      const p2 = s[1].entrant.name;
      const score1 = s[0]?.standing?.stats?.score?.value;
      const score2 = s[1]?.standing?.stats?.score?.value;
      if (typeof score1 !== 'number' || typeof score2 !== 'number') return;
      // Inicializar
      if (!stats[p1]) stats[p1] = { victorias: 0, derrotas: 0, sets: 0 };
      if (!stats[p2]) stats[p2] = { victorias: 0, derrotas: 0, sets: 0 };
      stats[p1].sets++;
      stats[p2].sets++;
      if (score1 > score2) {
        stats[p1].victorias++;
        stats[p2].derrotas++;
      } else if (score2 > score1) {
        stats[p2].victorias++;
        stats[p1].derrotas++;
      }
    });
    // --- Tabla de estadísticas ---
    html += `<h2 style='text-align:center;color:#ffd600;'>Estadísticas ${nombreJuego}</h2>`;
    html += `<table class='tabla-vs' style='margin:0 auto 2rem;max-width:500px;'>`;
    html += `<thead><tr><th>Jugador</th><th>Victorias</th><th>Derrotas</th><th>Winrate (%)</th></tr></thead><tbody>`;
    Object.entries(stats).forEach(([jugador, st]) => {
      const winrate = st.sets > 0 ? ((st.victorias / st.sets) * 100).toFixed(1) : '0.0';
      html += `<tr><td>${jugador}</td><td>${st.victorias}</td><td>${st.derrotas}</td><td>${winrate}</td></tr>`;
    });
    html += `</tbody></table>`;
    // --- Tabla de matches ---
    html += `<h2 style='text-align:center;color:#ffd600;'>Matches ${nombreJuego}</h2>`;
    html += `<table class='tabla-vs' style='margin:0 auto;max-width:500px;'>`;
    html += `<thead><tr><th>Jugador 1</th><th>Jugador 2</th><th>Ronda</th></tr></thead><tbody>`;
    sets.forEach((set, idx) => {
      const s = set.slots;
      html += `<tr${idx % 2 === 0 ? ' class="par"' : ''}>
        <td>${s[0]?.entrant?.name || '-'}</td>
        <td>${s[1]?.entrant?.name || '-'}</td>
        <td>${set.fullRoundText || '-'}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    const cont = document.getElementById(contentId);
    if (cont) cont.innerHTML = html;
  } catch (e) {
    const cont = document.getElementById(contentId);
    if (cont) cont.innerHTML = `<p style=\"color:red;\">Error al cargar matches de ${nombreJuego}.</p>`;
  }
}

// Inicialización automática para los contenedores de historial de cada juego
if (document.getElementById('tekken8-historial-content')) {
  mostrarTablaHistorialJuego('Tekken', 'tekken8-historial-content');
}
if (document.getElementById('strive-historial-content')) {
  mostrarTablaHistorialJuego('Strive', 'strive-historial-content');
}
if (document.getElementById('sf6-historial-content')) {
  mostrarTablaHistorialJuego('Street Fighter', 'sf6-historial-content');
}
