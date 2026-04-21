/* ============================================
   NFL Draft Tracker 2026 — Main Application
   ============================================ */

const POS_COLORS = {
  QB:'#FF6B35', WR:'#00C6FF', RB:'#44E67A', TE:'#FFE66D',
  OT:'#B8C7E0', OG:'#B8C7E0', C:'#B8C7E0', IOL:'#B8C7E0',
  EDGE:'#FF4757', DE:'#FF4757', DT:'#FF8C42', NT:'#FF8C42',
  LB:'#FFC312', ILB:'#FFC312', OLB:'#FFC312',
  CB:'#A29BFE', S:'#74B9FF', FS:'#74B9FF', SS:'#74B9FF',
  'WR/CB':'#C87FFF', K:'#95A5A6', P:'#95A5A6', LS:'#95A5A6'
};

const TEAM_COLORS = {
  ARI:'#97233F', ATL:'#A71930', BAL:'#241773', BUF:'#00338D',
  CAR:'#0085CA', CHI:'#C83803', CIN:'#FB4F14', CLE:'#FF3C00',
  DAL:'#003594', DEN:'#FB4F14', DET:'#0076B6', GB:'#203731',
  HOU:'#03202F', IND:'#002C5F', JAX:'#D7A22A', KC:'#E31837',
  LAC:'#002A5E', LAR:'#003594', LV:'#A5ACAF', MIA:'#008E97',
  MIN:'#4F2683', NE:'#002244', NO:'#D3BC8D', NYG:'#0B2265',
  NYJ:'#125740', PHI:'#004C54', PIT:'#FFB612', SEA:'#69BE28',
  SF:'#AA0000', TB:'#D50A0A', TEN:'#4B92DB', WSH:'#5A1414'
};

const CONFETTI_COLORS = ['#FFB300','#0078D4','#FF4757','#44E67A','#A29BFE','#FF6B35','#00C6FF','#FFC312','#FF8C42','#74B9FF','#ffffff'];

const RANKING_SOURCES = ['ESPN','NFL.com','PFF','The Athletic','Tankathon','Draft Network','SI','CFN','NFLDraftBuzz','Composite'];

// ---- State ----
let draftData = null;
let currentView = 'board';
let currentRound = 1;
let currentTeam = 'TEN';
let boardPosFilter = '';
let boardTeamFilter = '';
let particles = [];
let animating = false;
let searchResultsEl = null;

const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if(cls) e.className = cls; if(html) e.innerHTML = html; return e; };

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.DRAFT_DATA === 'undefined') {
    $('mainContent').innerHTML = `<div class="empty-state" style="padding:80px;">⚠️ Could not load draft data.<br><small style="font-size:13px;color:#4A5568;">Make sure draft-data.js loaded correctly.</small></div>`;
    return;
  }
  draftData = window.DRAFT_DATA;
  populateFilters();
  setupListeners();
  setupConfetti();
  renderView('board');
});

// ---- Setup ----
function populateFilters() {
  const teamSel = $('boardTeamFilter');
  draftData.teams.sort((a,b) => a.name.localeCompare(b.name)).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.id} — ${t.name}`;
    teamSel.appendChild(opt);
  });
}

function setupListeners() {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderView(btn.dataset.view);
    });
  });

  // Round buttons
  document.querySelectorAll('.round-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.round-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRound = parseInt(btn.dataset.round);
      renderBoardView();
    });
  });

  // Board filters
  $('boardPosFilter').addEventListener('change', e => { boardPosFilter = e.target.value; renderBoardView(); });
  $('boardTeamFilter').addEventListener('change', e => { boardTeamFilter = e.target.value; renderBoardView(); });

  // Remaining filters
  $('remainingSearch').addEventListener('input', () => renderRemainingView());
  $('remainingPosFilter').addEventListener('change', () => renderRemainingView());
  $('remainingCollegeFilter').addEventListener('input', () => renderRemainingView());

  // Modal close
  $('modalClose').addEventListener('click', closeModal);
  $('modalOverlay').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  // Global search
  const searchInput = $('globalSearch');
  const clearBtn = $('searchClear');
  searchInput.addEventListener('input', e => {
    const q = e.target.value.trim();
    clearBtn.classList.toggle('hidden', !q);
    if(q.length >= 2) showSearchResults(q);
    else hideSearchResults();
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    hideSearchResults();
  });
  document.addEventListener('click', e => {
    if(!e.target.closest('.search-wrap') && !e.target.closest('.search-results-overlay')) hideSearchResults();
  });
}

// ---- View Router ----
function renderView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(`${view}View`).classList.add('active');
  if(view === 'board') renderBoardView();
  else if(view === 'teams') renderTeamsView();
  else if(view === 'remaining') renderRemainingView();
  else if(view === 'trades') renderTradesView();
  else if(view === 'stats') renderStatsView();
}

// ---- Board View ----
function renderBoardView() {
  const grid = $('picksGrid');
  const picks = draftData.picks.filter(p => {
    if(p.round !== currentRound) return false;
    if(boardPosFilter && normalizePos(p.player.pos) !== boardPosFilter) return false;
    if(boardTeamFilter && p.team !== boardTeamFilter) return false;
    return true;
  });

  if(picks.length === 0) {
    grid.innerHTML = '<div class="empty-state">No picks match the current filters.</div>';
    return;
  }

  grid.innerHTML = '';
  picks.forEach(pick => grid.appendChild(buildPickCard(pick)));
}

function normalizePos(pos) {
  if(!pos) return '';
  const p = pos.toUpperCase();
  if(p.includes('OT') || p === 'LT' || p === 'RT') return 'OT';
  if(p === 'OG' || p === 'LG' || p === 'RG') return 'OG';
  if(p === 'DE') return 'EDGE';
  return p;
}

function buildPickCard(pick) {
  const color = TEAM_COLORS[pick.team] || '#2A3550';
  const posColor = POS_COLORS[pick.player.pos] || '#95A5A6';
  const isTop = pick.overall <= 10;
  const gradeClass = pick.grade >= 85 ? 'grade-elite' : pick.grade >= 75 ? 'grade-great' : pick.grade >= 60 ? 'grade-good' : 'grade-ok';

  const card = document.createElement('div');
  card.className = `pick-card${isTop ? ' top-pick' : ''}`;
  card.dataset.overall = pick.overall;
  card.style.setProperty('--team-color', color);

  card.innerHTML = `
    <div class="pick-card-header">
      <div class="pick-number">${pick.overall}</div>
      <div class="pick-card-meta">
        ${pick.tradeId ? `<div class="trade-flag">⇄ TRADE</div>` : ''}
        <div class="team-badge">${pick.team}</div>
        <div class="round-badge">RD ${pick.round} · PK ${pick.pick}</div>
      </div>
    </div>
    <div class="player-name">${pick.player.name}</div>
    <div class="pick-card-info">
      <span class="pos-badge" style="background:${posColor}">${pick.player.pos}</span>
      <span class="college-name">${pick.player.college}</span>
    </div>
    <div class="pick-card-footer">
      <span class="contract-value">${pick.contract?.val || pick.contract?.value || '—'}</span>
      <span class="pick-grade"><span class="grade-dot ${gradeClass}"></span>${pick.grade || '—'}</span>
    </div>
  `;

  card.addEventListener('click', () => {
    if(pick.overall <= 5) triggerConfetti(card);
    openPickModal(pick);
  });

  return card;
}

// ---- Pick Modal ----
function openPickModal(pick) {
  const modal = $('pickModal');
  const color = TEAM_COLORS[pick.team] || '#2A3550';
  const posColor = POS_COLORS[pick.player.pos] || '#95A5A6';
  const team = draftData.teams.find(t => t.id === pick.team);
  const trade = pick.tradeId ? draftData.trades.find(t => t.id === pick.tradeId) : null;

  let combineHtml = '';
  if(pick.combine) {
    const c = pick.combine;
    const stats = [
      {label:'40 YD', val: c['40'] || '—', unit:'s'},
      {label:'VERTICAL', val: c['vert'] || '—', unit:'"'},
      {label:'BENCH', val: c['bp'] || '—', unit:' reps'},
      {label:'3-CONE', val: c['3cone'] || '—', unit:'s'},
      {label:'SHUTTLE', val: c['shu'] || '—', unit:'s'},
      {label:'HEIGHT', val: pick.player.ht || '—', unit:''},
    ];
    combineHtml = `
      <div class="modal-section-title">COMBINE & MEASURABLES</div>
      <div class="combine-grid" style="margin-bottom:20px">
        ${stats.map(s => `
          <div class="combine-stat">
            <span class="cs-label">${s.label}</span>
            <span class="cs-value ${s.val === '—' ? 'null-val' : ''}">${s.val}${s.val !== '—' ? `<span style="font-size:12px;font-family:Inter,sans-serif;color:#A0AEC0;">${s.unit}</span>` : ''}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  let rankingsHtml = '';
  if(pick.rankings) {
    const r = pick.rankings;
    const sources = [
      {key:'espn', label:'ESPN'}, {key:'nfl', label:'NFL.com'}, {key:'pff', label:'PFF'},
      {key:'athletic', label:'Athletic'}, {key:'tankathon', label:'Tankathon'},
      {key:'dn', label:'Draft Net'}, {key:'si', label:'SI'}, {key:'cfn', label:'CFN'},
      {key:'nfldraftbuzz', label:'DraftBuzz'}, {key:'composite', label:'COMPOSITE'}
    ];
    rankingsHtml = `
      <div class="modal-section-title">CONSENSUS RANKINGS (10 SOURCES)</div>
      <div class="rankings-grid" style="margin-bottom:20px">
        ${sources.map(s => {
          const v = r[s.key];
          const cls = v === 1 ? 'rank-1' : v <= 5 ? 'rank-top' : 'rank-mid';
          return `<div class="ranking-chip"><span class="source">${s.label}</span><span class="rank ${cls}">#${v || '—'}</span></div>`;
        }).join('')}
      </div>
    `;
  }

  let tradeHtml = '';
  if(trade) {
    tradeHtml = `
      <div style="background:rgba(255,179,0,0.06);border:1px solid rgba(255,179,0,0.2);border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div class="modal-section-title" style="margin-bottom:8px">⇄ TRADE DETAILS</div>
        <div style="font-size:13px;color:#A0AEC0;margin-bottom:6px;">${trade.description}</div>
        <div style="font-size:12px;color:#4A5568;font-style:italic">${trade.analysis}</div>
      </div>
    `;
  }

  let mockBar = '';
  if(pick.mockRange) {
    const [lo, hi] = pick.mockRange.split('-').map(Number);
    const barW = Math.min(100, Math.max(10, 100 - (lo / 32) * 100));
    mockBar = `
      <div class="modal-section-title">MOCK DRAFT RANGE</div>
      <div style="font-size:13px;color:#A0AEC0;margin-bottom:6px;">Pick ${pick.mockRange} consensus range</div>
      <div class="mock-range-bar" style="margin-bottom:20px"><div class="mock-range-fill" style="width:${barW}%;left:${(lo/32)*100}%"></div></div>
    `;
  }

  $('modalContent').innerHTML = `
    <div class="modal-hero" data-pick-num="${pick.overall}" style="--team-color:${color}">
      <div class="modal-pick-line">
        <div class="modal-overall" style="--team-color:${color}">#${pick.overall}</div>
        <div class="modal-pick-info">
          <div class="modal-team-name" style="--team-color:${color}">${team ? team.city + ' ' + team.name : pick.team}</div>
          <div class="modal-round-pick">ROUND ${pick.round} · PICK ${pick.pick}</div>
        </div>
        ${pick.tradeId ? `<span class="modal-trade-badge">⇄ TRADE</span>` : ''}
      </div>
      <div class="modal-player-name">${pick.player.name}</div>
      <div class="modal-player-badges">
        <span class="pos-badge" style="background:${posColor}">${pick.player.pos}</span>
        <span class="modal-college">${pick.player.college}</span>
        ${pick.player.ht ? `<span style="font-size:12px;color:#A0AEC0">${pick.player.ht}  ·  ${pick.player.wt ? pick.player.wt + ' lbs' : ''}</span>` : ''}
      </div>
    </div>
    <div class="modal-body">
      ${pick.notes ? `<div class="scouting-box">"${pick.notes}"</div>` : ''}
      ${tradeHtml}
      <div class="modal-grid">
        <div>
          <div class="modal-section-title">CONTRACT (ROOKIE DEAL)</div>
          ${pick.contract ? `
            <div class="stat-row"><span class="stat-label">Total Value</span><span class="stat-value green">${pick.contract.val || pick.contract.value || '—'}</span></div>
            ${pick.contract.yrs ? `<div class="stat-row"><span class="stat-label">Years</span><span class="stat-value">${pick.contract.yrs}</span></div>` : ''}
            ${pick.contract.sb ? `<div class="stat-row"><span class="stat-label">Signing Bonus</span><span class="stat-value">${pick.contract.sb}</span></div>` : ''}
            ${pick.contract.gtd ? `<div class="stat-row"><span class="stat-label">Guaranteed</span><span class="stat-value">${pick.contract.gtd}</span></div>` : ''}
            ${pick.contract.aav ? `<div class="stat-row"><span class="stat-label">AAV</span><span class="stat-value">${pick.contract.aav}</span></div>` : ''}
          ` : '<div class="stat-row"><span class="stat-value">—</span></div>'}
        </div>
        <div>
          <div class="modal-section-title">PLAYER INFO</div>
          <div class="stat-row"><span class="stat-label">Position</span><span class="stat-value">${pick.player.pos}</span></div>
          <div class="stat-row"><span class="stat-label">College</span><span class="stat-value">${pick.player.college}</span></div>
          ${pick.player.ht ? `<div class="stat-row"><span class="stat-label">Height</span><span class="stat-value">${pick.player.ht}</span></div>` : ''}
          ${pick.player.wt ? `<div class="stat-row"><span class="stat-label">Weight</span><span class="stat-value">${pick.player.wt} lbs</span></div>` : ''}
          ${pick.player.age ? `<div class="stat-row"><span class="stat-label">Age</span><span class="stat-value">${pick.player.age}</span></div>` : ''}
          <div class="stat-row"><span class="stat-label">Draft Grade</span><span class="stat-value gold">${pick.grade || '—'}</span></div>
        </div>
      </div>
      ${mockBar}
      ${rankingsHtml}
      ${combineHtml}
      ${team ? `
        <div class="modal-section-title">TEAM CONTEXT</div>
        <div class="scouting-box">${team.roster?.need || 'No team context available.'}</div>
      ` : ''}
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('pickModal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ---- Teams View ----
function renderTeamsView() {
  const carousel = $('teamCarousel');
  carousel.innerHTML = '';
  draftData.teams.forEach(team => {
    const chip = document.createElement('button');
    chip.className = `team-chip${team.id === currentTeam ? ' active' : ''}`;
    chip.style.setProperty('--team-color', TEAM_COLORS[team.id] || '#2A3550');
    chip.innerHTML = `<span class="team-chip-abbr">${team.id}</span><span class="team-chip-name">${team.name}</span>`;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.team-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentTeam = team.id;
      renderTeamDetail();
    });
    carousel.appendChild(chip);
  });
  renderTeamDetail();
}

function renderTeamDetail() {
  const team = draftData.teams.find(t => t.id === currentTeam);
  if(!team) return;

  const teamPicks = draftData.picks.filter(p => p.team === currentTeam);
  const color = TEAM_COLORS[currentTeam] || '#2A3550';

  const detail = $('teamDetail');
  detail.style.setProperty('--team-color', color);

  // Group picks by round
  const byRound = {};
  teamPicks.forEach(p => {
    if(!byRound[p.round]) byRound[p.round] = [];
    byRound[p.round].push(p);
  });

  // Build depth chart projections
  const offenseRows = buildOffenseDepth(team, teamPicks);
  const defenseRows = buildDefenseDepth(team, teamPicks);

  detail.innerHTML = `
    <div class="team-hero" data-abbr="${team.id}" style="--team-color:${color}">
      <div>
        <div class="team-hero-city">${team.city} · ${team.conf} ${team.div}</div>
        <div class="team-hero-name" style="color:${color}">${team.name}</div>
        <div class="team-hero-need">${team.roster?.need || ''}</div>
      </div>
      <div class="team-hero-picks">
        <div class="hero-picks-label">2026 PICKS</div>
        <div class="hero-picks-count">${teamPicks.length}</div>
        <div class="hero-picks-sub">${teamPicks.map(p => `#${p.overall}`).join(' · ')}</div>
      </div>
    </div>

    <div class="team-sections">
      <div class="team-section-card">
        <div class="team-section-header">DRAFT PICKS — 2026</div>
        <div class="depth-chart">
          ${teamPicks.length === 0 ? '<div class="depth-row"><span class="depth-name text-muted">No picks</span></div>' :
            teamPicks.map(p => `
              <div class="depth-row depth-drafted" style="cursor:pointer" onclick="openPickModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                <span class="depth-pos" style="color:${POS_COLORS[p.player.pos] || '#95A5A6'}">${p.player.pos}</span>
                <span class="depth-name">${p.player.name}</span>
                <span class="depth-info">${p.player.college}</span>
                <span class="depth-draft-badge">#${p.overall}</span>
              </div>
            `).join('')
          }
        </div>
      </div>

      <div class="team-section-card">
        <div class="team-section-header">PROJECTED DEPTH CHART</div>
        <div class="depth-chart">
          ${[...offenseRows, ...defenseRows].map(r => `
            <div class="depth-row${r.drafted ? ' depth-drafted' : ''}">
              <span class="depth-pos">${r.pos}</span>
              <span class="depth-name">${r.name}</span>
              ${r.drafted ? `<span class="depth-draft-badge">RD${r.rd}</span>` : `<span class="depth-slot">${r.slot || ''}</span>`}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function buildOffenseDepth(team, picks) {
  const rows = [];
  const r = team.roster || {};

  // Existing
  if(r.QB) rows.push({pos:'QB', name: r.QB, slot:'STARTER'});
  rows.push({pos:'QB', name:'Backup QB', slot:'BACKUP'});

  // Check for QB draft pick
  const draftedQB = picks.find(p => p.player.pos === 'QB');
  if(draftedQB) rows.push({pos:'QB', name: draftedQB.player.name, slot:'RD'+draftedQB.round, drafted:true, rd:draftedQB.round});

  ['WR','WR','WR'].forEach((p,i) => {
    const name = i===0 ? (r.star || 'WR1') : i===1 ? 'WR2' : 'WR3';
    rows.push({pos:'WR', name, slot:['WR1','WR2','WR3'][i]});
  });
  const draftedWRs = picks.filter(p => p.player.pos === 'WR');
  draftedWRs.forEach(p => rows.push({pos:'WR', name:p.player.name, slot:'', drafted:true, rd:p.round}));

  rows.push({pos:'RB', name:'Starter RB', slot:'STARTER'});
  const draftedRBs = picks.filter(p => p.player.pos === 'RB');
  draftedRBs.forEach(p => rows.push({pos:'RB', name:p.player.name, slot:'', drafted:true, rd:p.round}));

  rows.push({pos:'TE', name:'Starter TE', slot:'STARTER'});
  const draftedTEs = picks.filter(p => p.player.pos === 'TE');
  draftedTEs.forEach(p => rows.push({pos:'TE', name:p.player.name, slot:'', drafted:true, rd:p.round}));

  ['LT','LG','C','RG','RT'].forEach(pos => rows.push({pos, name:`${pos} Starter`, slot:'STARTER'}));
  const draftedOL = picks.filter(p => ['OT','OG','C'].includes(p.player.pos));
  draftedOL.forEach(p => rows.push({pos:p.player.pos, name:p.player.name, slot:'', drafted:true, rd:p.round}));

  return rows;
}

function buildDefenseDepth(team, picks) {
  const rows = [];
  const r = team.roster || {};

  ['EDGE','EDGE'].forEach((p,i) => {
    const name = i===0 ? (r.edge || 'DE Starter') : 'DE Backup';
    rows.push({pos:'EDGE', name, slot:i===0?'STARTER':'BACKUP'});
  });
  const draftedEdge = picks.filter(p => ['EDGE','DE'].includes(p.player.pos));
  draftedEdge.forEach(p => rows.push({pos:'EDGE', name:p.player.name, slot:'', drafted:true, rd:p.round}));

  rows.push({pos:'DT', name:'DT Starter', slot:'STARTER'});
  const draftedDT = picks.filter(p => p.player.pos === 'DT');
  draftedDT.forEach(p => rows.push({pos:'DT', name:p.player.name, slot:'', drafted:true, rd:p.round}));

  rows.push({pos:'LB', name:'LB Starter', slot:'STARTER'});
  const draftedLB = picks.filter(p => p.player.pos === 'LB');
  draftedLB.forEach(p => rows.push({pos:'LB', name:p.player.name, slot:'', drafted:true, rd:p.round}));

  ['CB','CB'].forEach((p,i) => rows.push({pos:'CB', name:`CB${i+1} Starter`, slot:'STARTER'}));
  const draftedCB = picks.filter(p => p.player.pos === 'CB');
  draftedCB.forEach(p => rows.push({pos:'CB', name:p.player.name, slot:'', drafted:true, rd:p.round}));

  ['S','S'].forEach((p,i) => rows.push({pos:'S', name:`S${i+1} Starter`, slot:'STARTER'}));
  const draftedS = picks.filter(p => p.player.pos === 'S');
  draftedS.forEach(p => rows.push({pos:'S', name:p.player.name, slot:'', drafted:true, rd:p.round}));

  return rows;
}

// ---- Remaining View ----
function renderRemainingView() {
  const search = ($('remainingSearch').value || '').toLowerCase();
  const posFilter = $('remainingPosFilter').value;
  const collegeFilter = ($('remainingCollegeFilter').value || '').toLowerCase();

  let prospects = draftData.prospects.filter(p => p.drafted === false);

  if(search) prospects = prospects.filter(p => p.name.toLowerCase().includes(search));
  if(posFilter) prospects = prospects.filter(p => p.pos === posFilter);
  if(collegeFilter) prospects = prospects.filter(p => p.college.toLowerCase().includes(collegeFilter));

  $('remainingCount').textContent = prospects.length;

  const table = $('prospectsTable');
  if(prospects.length === 0) {
    table.innerHTML = '<div class="empty-state">No undrafted prospects match your filters.</div>';
    return;
  }

  table.innerHTML = prospects.map(p => {
    const posColor = POS_COLORS[p.pos] || '#95A5A6';
    return `
      <div class="prospect-row">
        <div class="prospect-rank">${p.rank}</div>
        <div class="prospect-info">
          <div class="prospect-name">${p.name}</div>
          <div class="prospect-college">${p.college}</div>
        </div>
        <span class="pos-badge" style="background:${posColor};margin-right:8px">${p.pos}</span>
        <div class="prospect-grade">${p.grade}</div>
      </div>
    `;
  }).join('');
}

// ---- Trades View ----
function renderTradesView() {
  const list = $('tradesList');
  list.innerHTML = draftData.trades.map(trade => {
    const acq = trade.picksAcquired || [];
    const sent = trade.picksSent || [];
    const teams = trade.teams || [];

    return `
      <div class="trade-card">
        <div class="trade-card-header">
          <div>
            <div class="trade-headline">${trade.headline}</div>
          </div>
          <div class="trade-teams">
            ${teams.map((t,i) => `
              <span style="color:${TEAM_COLORS[t] || '#fff'}">${t}</span>
              ${i < teams.length-1 ? '<span class="trade-arrow">⇄</span>' : ''}
            `).join('')}
          </div>
        </div>
        <div class="trade-card-body">
          <div class="trade-description">${trade.description}</div>
          <div class="trade-analysis">${trade.analysis}</div>
          <div class="trade-exchange">
            <div class="trade-exchange-side">
              <div class="exchange-header exchange-receives">${teams[0]} RECEIVES</div>
              ${acq.map(p => `<div class="exchange-item">${p.desc}</div>`).join('')}
            </div>
            <div class="trade-exchange-side">
              <div class="exchange-header exchange-sends">${teams[0]} SENDS</div>
              ${sent.map(p => `<div class="exchange-item">${p.desc}</div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Stats View ----
function renderStatsView() {
  const picks = draftData.picks;
  const byPos = {};
  picks.forEach(p => {
    const pos = p.player.pos;
    if(!byPos[pos]) byPos[pos] = [];
    byPos[pos].push(p);
  });

  const posOrder = ['QB','WR','RB','TE','OT','OG','C','EDGE','DT','LB','CB','S'];
  const allPos = posOrder.filter(p => byPos[p]);

  const summaryHtml = `
    <div class="stats-summary-row">
      ${allPos.map(pos => `
        <div class="stats-summary-chip">
          <div class="summary-pos"><span style="color:${POS_COLORS[pos] || '#95A5A6'}">${pos}</span></div>
          <div class="summary-count" style="color:${POS_COLORS[pos] || '#95A5A6'}">${byPos[pos].length}</div>
        </div>
      `).join('')}
    </div>
  `;

  const detailHtml = allPos.map(pos => {
    const posColor = POS_COLORS[pos] || '#95A5A6';
    const list = byPos[pos];
    return `
      <div class="pos-group-section">
        <div class="pos-group-header">
          <span class="pos-group-title" style="color:${posColor}">${pos}</span>
          <span class="pos-group-count" style="background:${posColor}">${list.length} SELECTED</span>
        </div>
        <div class="pos-picks-list">
          ${list.map(p => `
            <div class="pos-pick-row" onclick="openPickModal(${JSON.stringify(p).replace(/"/g,'&quot;')})">
              <span class="pos-pick-num">${p.overall}</span>
              <span class="pos-pick-team" style="color:${TEAM_COLORS[p.team] || '#fff'}">${p.team}</span>
              <span class="pos-pick-name">${p.player.name}</span>
              <span class="pos-pick-college">${p.player.college}</span>
              <span class="pos-round-badge">RD ${p.round}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  $('statsContent').innerHTML = summaryHtml + detailHtml;
}

// ---- Global Search ----
function showSearchResults(query) {
  hideSearchResults();
  const q = query.toLowerCase();
  const results = draftData.picks.filter(p =>
    p.player.name.toLowerCase().includes(q) ||
    p.team.toLowerCase().includes(q) ||
    (p.player.college || '').toLowerCase().includes(q) ||
    (p.player.pos || '').toLowerCase().includes(q)
  ).slice(0, 20);

  if(results.length === 0) return;

  const overlay = document.createElement('div');
  overlay.className = 'search-results-overlay';
  overlay.id = 'searchResultsOverlay';

  overlay.innerHTML = `
    <div class="search-results-header">${results.length} RESULTS</div>
    ${results.map(p => `
      <div class="search-result-item" data-overall="${p.overall}">
        <span class="sr-num">${p.overall}</span>
        <div class="sr-info">
          <div class="sr-name">${p.player.name} <span style="color:${POS_COLORS[p.player.pos]||'#95A5A6'};font-size:11px">${p.player.pos}</span></div>
          <div class="sr-sub">${p.team} · ${p.player.college} · Rd ${p.round}</div>
        </div>
        <span style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:${TEAM_COLORS[p.team]||'#fff'}">${p.team}</span>
      </div>
    `).join('')}
  `;

  overlay.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const overall = parseInt(item.dataset.overall);
      const pick = draftData.picks.find(p => p.overall === overall);
      if(pick) {
        hideSearchResults();
        $('globalSearch').value = '';
        $('searchClear').classList.add('hidden');
        openPickModal(pick);
      }
    });
  });

  document.body.appendChild(overlay);
  searchResultsEl = overlay;
}

function hideSearchResults() {
  if(searchResultsEl) { searchResultsEl.remove(); searchResultsEl = null; }
  const existing = $('searchResultsOverlay');
  if(existing) existing.remove();
}

// ---- Confetti ----
function setupConfetti() {
  const canvas = $('confettiCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function triggerConfetti(sourceEl) {
  const rect = sourceEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for(let i = 0; i < 80; i++) {
    particles.push(createParticle(cx, cy));
  }
  if(!animating) runConfetti();
}

function createParticle(x, y) {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -18 - 4,
    size: Math.random() * 10 + 4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 12,
    gravity: 0.55,
    life: 1.0,
    decay: 0.012 + Math.random() * 0.008,
    wide: Math.random() > 0.5
  };
}

function runConfetti() {
  animating = true;
  const canvas = $('confettiCanvas');
  const ctx = canvas.getContext('2d');

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.life > 0);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      if(p.wide) ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      else ctx.fillRect(-p.size/4, -p.size/2, p.size/2, p.size);
      ctx.restore();
    });

    if(particles.length > 0) requestAnimationFrame(frame);
    else { animating = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  requestAnimationFrame(frame);
}
