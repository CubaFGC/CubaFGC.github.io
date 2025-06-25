// Historial de los 3 juegos principales del Mixup Clash Fest: Tekken 8, Strive, SF6
const STARTGG_TOKEN = "a7fafdd3139b23f9eef417bbe26fd91b";
const TOURNAMENT_SLUG = "mixup-clash-fest-vol-2";

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
if (window.location.pathname.endsWith('/view/mcf/historial-mcf-2.html')) {
  window.addEventListener('DOMContentLoaded', function() {
    EVENTOS.forEach(ev => cargarEvento(ev));
  });
}

async function cargarEvento(ev) {
  const query = `
    query {
      event(slug: "${TOURNAMENT_SLUG}/${ev.slug}") {
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
      html += `<tr><td data-label='Posición'>#${s.placement}</td><td data-label='Jugador'>${s.entrant?.name || '-'}</td></tr>`;
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
      html += `<tr><td data-label='Jugador'>${jugador}</td><td data-label='Victorias'>${st.victorias}</td><td data-label='Derrotas'>${st.derrotas}</td><td data-label='Winrate (%)'>${winrate}</td></tr>`;
    });
    html += `</tbody></table>`;
    // --- Tabla de matches ---
    html += `<h2 style='text-align:center;color:#ffd600;'>Matches Tekken 8</h2>`;
    html += `<table class='tabla-vs' style='margin:0 auto;max-width:500px;'>`;
    html += `<thead><tr><th>Jugador 1</th><th>Jugador 2</th><th>Ronda</th></tr></thead><tbody>`;
    sets.forEach((set, idx) => {
      const s = set.slots;
      html += `<tr${idx % 2 === 0 ? ' class="par"' : ''}>
        <td data-label='Jugador 1'>${s[0]?.entrant?.name || '-'}</td>
        <td data-label='Jugador 2'>${s[1]?.entrant?.name || '-'}</td>
        <td data-label='Ronda'>${set.fullRoundText || '-'}</td>
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
    cont.innerHTML = `
      <div class="skeleton-title" aria-live="polite"></div>
      <table class="skeleton-table" aria-live="polite">
        <tbody>
          <tr class="skeleton-row">
            <td class="skeleton-cell" style="width:25%"></td>
            <td class="skeleton-cell" style="width:25%"></td>
            <td class="skeleton-cell" style="width:25%"></td>
            <td class="skeleton-cell" style="width:25%"></td>
          </tr>
          <tr class="skeleton-row">
            <td class="skeleton-cell"></td>
            <td class="skeleton-cell"></td>
            <td class="skeleton-cell"></td>
            <td class="skeleton-cell"></td>
          </tr>
          <tr class="skeleton-row">
            <td class="skeleton-cell"></td>
            <td class="skeleton-cell"></td>
            <td class="skeleton-cell"></td>
            <td class="skeleton-cell"></td>
          </tr>
        </tbody>
      </table>
    `;
  }
  const torneoSlug = "mixup-clash-fest-vol-2";
  let eventSlug = null;
  let errorMsg = (msg) => {
    showToast(msg, 'error');
    if (cont) cont.innerHTML = `<div class='loader-svg' aria-live='assertive' style='color:#ff4d4f;text-align:center;'>
      <svg class='loader-svg__circle' viewBox='22 22 44 44'><circle class='loader-svg__anim' style='stroke:#ff4d4f;' cx='44' cy='44' r='20'></circle></svg>
      <span class='loader-svg__text error' aria-live='assertive'>${msg}</span><br>
      <button class='event-access-btn' onclick='window.location.reload()' style='margin-top:1rem;'>Reintentar</button>
    </div>`;
  };
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
      errorMsg(`No se encontró el evento ${nombreJuego} en el torneo.`);
      return;
    }
    eventSlug = event.slug;
  } catch (e) {
    errorMsg(`Error al buscar el slug de ${nombreJuego}.`);
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
      errorMsg(`No hay datos disponibles para ${nombreJuego}.`);
      return;
    }
    let html = '';
    // --- Podio visual para el top 3 ---
    if (standings.length > 0) {
      const medallas = [
        '<span style="font-size:2rem;vertical-align:middle;">🥇</span>',
        '<span style="font-size:2rem;vertical-align:middle;">🥈</span>',
        '<span style="font-size:2rem;vertical-align:middle;">🥉</span>'
      ];
      html += `<div style='display:flex;justify-content:center;gap:2.5rem;margin:1.2rem 0 1.7rem 0;'>`;
      standings.slice(0,3).forEach((s, idx) => {
        html += `<div style='text-align:center;'>
          ${medallas[idx]||''}<br>
          <span style='font-weight:bold;color:#ffd600;font-size:1.1rem;'>${s.entrant?.name||'-'}</span><br>
          <span style='color:#ffd60099;font-size:0.98rem;'>#${s.placement}</span>
        </div>`;
      });
      html += `</div>`;
    }
    // --- Tabla de standings (ordenable) ---
    html += `<h2 style='text-align:center;color:#ffd600;'>Top ${nombreJuego}</h2>`;
    html += `<table class='tabla-vs sortable-table' id='standings-table-${contentId}' style='margin:0 auto 2rem;max-width:500px;'>`;
    html += `<thead><tr><th data-sort="number">Posición</th><th data-sort="string">Jugador</th></tr></thead><tbody>`;
    standings.forEach(s => {
      html += `<tr><td data-label='Posición'>#${s.placement}</td><td data-label='Jugador'>${s.entrant?.name || '-'}</td></tr>`;
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
    // --- Tabla de estadísticas (ordenable) ---
    html += `<h2 style='text-align:center;color:#ffd600;'>Estadísticas ${nombreJuego}</h2>`;
    html += `<table class='tabla-vs sortable-table' id='stats-table-${contentId}' style='margin:0 auto 2rem;max-width:500px;'>`;
    html += `<thead><tr><th data-sort="string">Jugador</th><th data-sort="number">Victorias</th><th data-sort="number">Derrotas</th><th data-sort="number">Winrate (%)</th></tr></thead><tbody>`;
    Object.entries(stats).forEach(([jugador, st]) => {
      const winrate = st.sets > 0 ? ((st.victorias / st.sets) * 100).toFixed(1) : '0.0';
      html += `<tr><td data-label='Jugador'>${jugador}</td><td data-label='Victorias'>${st.victorias}</td><td data-label='Derrotas'>${st.derrotas}</td><td data-label='Winrate (%)'>${winrate}</td></tr>`;
    });
    html += `</tbody></table>`;
    // --- Script para ordenar tablas ---
    html += `<script>(function(){
      function sortTable(table, col, type, asc) {
        const tbody = table.tBodies[0];
        Array.from(tbody.rows)
          .sort((a, b) => {
            let v1 = a.cells[col].textContent.replace('#','');
            let v2 = b.cells[col].textContent.replace('#','');
            if(type==='number') { v1 = parseFloat(v1)||0; v2 = parseFloat(v2)||0; }
            else { v1 = v1.toLowerCase(); v2 = v2.toLowerCase(); }
            return asc ? (v1 > v2 ? 1 : v1 < v2 ? -1 : 0) : (v1 < v2 ? 1 : v1 > v2 ? -1 : 0);
          })
          .forEach(row => tbody.appendChild(row));
      }
      document.querySelectorAll('.sortable-table').forEach(table => {
        table.querySelectorAll('th').forEach((th, i) => {
          th.style.cursor = 'pointer';
          th.onclick = function() {
            const type = th.getAttribute('data-sort')||'string';
            const asc = !(th.asc = !th.asc);
            sortTable(table, i, type, asc);
          };
        });
      });
    })();<\/script>`;
    // --- Input de búsqueda y filtro de ronda ---
    // Obtener rondas únicas
    const rondasUnicas = Array.from(new Set(sets.map(set => set.fullRoundText || '-'))).sort();
    html += `<div style='text-align:center;margin-bottom:1rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;'>
      <input type='text' id='search-matches-${contentId}' class='search-matches-input' placeholder='Buscar jugador...' style='padding:0.4rem 1rem;border-radius:6px;border:1px solid #ffd600;max-width:220px;width:90%;font-size:1rem;'>
      <select id='filter-round-${contentId}' style='padding:0.4rem 1rem;border-radius:6px;border:1px solid #ffd600;font-size:1rem;max-width:180px;'>
        <option value=''>Todas las rondas</option>
        ${rondasUnicas.map(r => `<option value='${r}'>${r}</option>`).join('')}
      </select>
    </div>`;
    // --- Tabla de matches ---
    html += `<h2 style='text-align:center;color:#ffd600;'>Matches ${nombreJuego}</h2>`;
    html += `<table class='tabla-vs' id='tabla-matches-${contentId}' style='margin:0 auto;max-width:500px;'>`;
    html += `<thead><tr><th>Jugador 1</th><th>Jugador 2</th><th>Ronda</th></tr></thead><tbody id='tbody-matches-${contentId}'>`;
    sets.forEach((set, idx) => {
      const s = set.slots;
      html += `<tr${idx % 2 === 0 ? ' class=\"par\"' : ''}>
        <td data-label='Jugador 1'>${s[0]?.entrant?.name || '-'}</td>
        <td data-label='Jugador 2'>${s[1]?.entrant?.name || '-'}</td>
        <td data-label='Ronda'>${set.fullRoundText || '-'}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    // --- Script de filtrado ---
    html += `<script>(function(){
      const input = document.getElementById('search-matches-${contentId}');
      const select = document.getElementById('filter-round-${contentId}');
      const tbody = document.getElementById('tbody-matches-${contentId}');
      function filtrar() {
        const val = input.value.toLowerCase();
        const ronda = select.value;
        Array.from(tbody.rows).forEach(row => {
          const jugador1 = row.cells[0].textContent.toLowerCase();
          const jugador2 = row.cells[1].textContent.toLowerCase();
          const rondaCell = row.cells[2].textContent;
          const matchJugador = (jugador1.includes(val) || jugador2.includes(val));
          const matchRonda = (!ronda || rondaCell === ronda);
          row.style.display = (matchJugador && matchRonda) ? '' : 'none';
        });
      }
      if (input && select && tbody) {
        input.addEventListener('input', filtrar);
        select.addEventListener('change', filtrar);
      }
    })();<\/script>`;
    const cont = document.getElementById(contentId);
    if (cont) {
      cont.innerHTML = `<div class='fade-in'>${html}</div>`;
    }
  } catch (e) {
    const cont = document.getElementById(contentId);
    if (cont) cont.innerHTML = `<p style=\"color:red;\">Error al cargar matches de ${nombreJuego}.</p>`;
  }
}

// --- NUEVO: Mostrar solo la sección deseada del acordeón para cualquier juego ---
async function mostrarSeccionHistorialJuego(nombreJuego, seccion, contentId) {
  const cont = document.getElementById(contentId);
  if (cont) {
    cont.innerHTML = `<div class="loader-modern"><span class="loader-dot"></span><span class="loader-dot"></span><span class="loader-dot"></span></div>`;
  }
  const torneoSlug = "mixup-clash-fest-vol-2";
  let eventSlug = null;
  try {
    const queryEventos = `query { tournament(slug: \"${torneoSlug}\") { events { name slug } } }`;
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
      if (cont) cont.innerHTML = `<span style='color:red;'>No se encontró el evento ${nombreJuego}.</span>`;
      return;
    }
    eventSlug = event.slug;
  } catch (e) {
    if (cont) cont.innerHTML = `<span style='color:red;'>Error al buscar el evento ${nombreJuego}.</span>`;
    return;
  }
  // 2. Consultar standings y sets
  const query = `query { event(slug: \"${eventSlug}\") { standings(query: { perPage: 16 }) { nodes { placement entrant { name } } } sets(page: 1, perPage: 64, sortType: RECENT) { nodes { id fullRoundText slots { entrant { name } standing { stats { score { value } } } } } } } }`;
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
    const standings = event?.standings?.nodes || [];
    const sets = event?.sets?.nodes || [];
    if (seccion === 'top') {
      // Podio y tabla de standings completa
      let podio = `<div class='fade-in' style='display:flex;justify-content:center;gap:2.5rem;margin:1.2rem 0 1.7rem 0;'>`;
      const medallas = ['🥇','🥈','🥉'];
      standings.slice(0,3).forEach((s,idx) => {
        podio += `<div style='text-align:center;'>
          <span style='font-size:2.2rem;vertical-align:middle;'>${medallas[idx]||''}</span><br>
          <span style='font-weight:bold;color:#ffd600;font-size:1.1rem;'>${s.entrant?.name||'-'}</span><br>
          <span style='color:#ffd60099;font-size:0.98rem;'>#${s.placement}</span>
        </div>`;
      });
      podio += `</div>`;
      let tabla = `<table class='tabla-vs sortable-table' id='standings-table-${contentId}' style='margin:0 auto 2rem;max-width:500px;'>`;
      tabla += `<thead><tr><th data-sort="number">Posición</th><th data-sort="string">Jugador</th></tr></thead><tbody>`;
      standings.forEach(s => {
        tabla += `<tr><td data-label='Posición'>#${s.placement}</td><td data-label='Jugador'>${s.entrant?.name || '-'}</td></tr>`;
      });
      tabla += `</tbody></table>`;
      cont.innerHTML = podio + tabla;
    } else if (seccion === 'stats') {
      // Tabla de estadísticas completa y ordenable
      const stats = {};
      sets.forEach(set => {
        const s = set.slots;
        if (!s[0]?.entrant?.name || !s[1]?.entrant?.name) return;
        const p1 = s[0].entrant.name;
        const p2 = s[1].entrant.name;
        const score1 = s[0]?.standing?.stats?.score?.value;
        const score2 = s[1]?.standing?.stats?.score?.value;
        if (typeof score1 !== 'number' || typeof score2 !== 'number') return;
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
      let tabla = `<table class='tabla-vs sortable-table' id='stats-table-${contentId}' style='margin:0 auto 2rem;max-width:500px;'>`;
      tabla += `<thead><tr><th data-sort="string">Jugador</th><th data-sort="number">Victorias</th><th data-sort="number">Derrotas</th><th data-sort="number">Winrate (%)</th></tr></thead><tbody>`;
      Object.entries(stats).forEach(([jugador, st]) => {
        const winrate = st.sets > 0 ? ((st.victorias / st.sets) * 100).toFixed(1) : '0.0';
        tabla += `<tr><td data-label='Jugador'>${jugador}</td><td data-label='Victorias'>${st.victorias}</td><td data-label='Derrotas'>${st.derrotas}</td><td data-label='Winrate (%)'>${winrate}</td></tr>`;
      });
      tabla += `</tbody></table>`;
      cont.innerHTML = tabla;
    } else if (seccion === 'matches') {
      // Buscador, filtro de ronda y tabla de matches premium (sin icono VS)
      const rondasUnicas = Array.from(new Set(sets.map(set => set.fullRoundText || '-'))).sort();
      let filtros = `<div style='text-align:center;margin-bottom:1rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;'>`;
      filtros += `<input type='text' id='search-matches-${contentId}' class='search-matches-input' placeholder='Buscar jugador...' style='padding:0.4rem 1rem;border-radius:6px;border:1px solid #ffd600;max-width:220px;width:90%;font-size:1rem;'>`;
      filtros += `<select id='filter-round-${contentId}' style='padding:0.4rem 1rem;border-radius:6px;border:1px solid #ffd600;font-size:1rem;max-width:180px;'>`;
      filtros += `<option value=''>Todas las rondas</option>`;
      filtros += rondasUnicas.map(r => `<option value='${r}'>${r}</option>`).join('');
      filtros += `</select></div>`;
      let tabla = `<div class='matches-table-scroll'><table class='tabla-vs tabla-vs-matches' id='tabla-matches-${contentId}' style='margin:0 auto;max-width:500px;width:100%;text-align:center;'>`;
      tabla += `<thead><tr><th style='text-align:center;'>Jugador 1</th><th style='text-align:center;'>Jugador 2</th><th style='text-align:center;'>Ronda</th></tr></thead><tbody id='tbody-matches-${contentId}'>`;
      sets.forEach((set, idx) => {
        const s = set.slots;
        tabla += `<tr${idx % 2 === 0 ? ' class="par"' : ''} style='text-align:center;'>
          <td style='text-align:center;vertical-align:middle;'>${s[0]?.entrant?.name || '-'}</td>
          <td style='text-align:center;vertical-align:middle;'>${s[1]?.entrant?.name || '-'}</td>
          <td style='text-align:center;vertical-align:middle;'>${set.fullRoundText || '-'}</td>
        </tr>`;
      });
      tabla += `</tbody></table></div>`;
      // Script de filtrado
      tabla += `<script>(function(){
        const input = document.getElementById('search-matches-${contentId}');
        const select = document.getElementById('filter-round-${contentId}');
        const tbody = document.getElementById('tbody-matches-${contentId}');
        function filtrar() {
          const val = input.value.toLowerCase();
          const ronda = select.value;
          Array.from(tbody.rows).forEach(row => {
            const jugador1 = row.cells[0].textContent.toLowerCase();
            const jugador2 = row.cells[1].textContent.toLowerCase();
            const rondaCell = row.cells[2].textContent;
            const matchJugador = (jugador1.includes(val) || jugador2.includes(val));
            const matchRonda = (!ronda || rondaCell === ronda);
            row.style.display = (matchJugador && matchRonda) ? '' : 'none';
          });
        }
        if (input && select && tbody) {
          input.addEventListener('input', filtrar);
          select.addEventListener('change', filtrar);
        }
      })();<\/script>`;
      cont.innerHTML = filtros + tabla;
    }
  } catch (e) {
    if (cont) cont.innerHTML = `<span style='color:red;'>Error al cargar datos de ${nombreJuego}.</span>`;
  }
}

// Toasts de notificación reutilizables (si no existen)
function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' toast--' + type : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.4s forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 3200);
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
