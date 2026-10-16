(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  document.querySelectorAll('[data-icon]').forEach(el => { const name=el.dataset.icon; el.innerHTML=svg(name); });
  const state = { servers: [], page: 1, pageSize: 20, rank: 'global', map: null, markers: [], loading: false };
  const fmt = n => Number(n || 0).toLocaleString('en-US');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const flag = code => ({ID:'🇮🇩',US:'🇺🇸',BR:'🇧🇷',TH:'🇹🇭',DE:'🇩🇪',FR:'🇫🇷',GB:'🇬🇧',AU:'🇦🇺',CA:'🇨🇦',TR:'🇹🇷',MX:'🇲🇽',JP:'🇯🇵',ES:'🇪🇸',IT:'🇮🇹',RU:'🇷🇺',NL:'🇳🇱',PL:'🇵🇱',AR:'🇦🇷',PT:'🇵🇹',PH:'🇵🇭',MY:'🇲🇾',SG:'🇸🇬',ZA:'🇿🇦',SE:'🇸🇪',UA:'🇺🇦',KR:'🇰🇷',CN:'🇨🇳',VN:'🇻🇳',NZ:'🇳🇿',BE:'🇧🇪'}[code] || '🌐');
  const svg = (name) => ({
    server:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/></svg>',
    users:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    capacity:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h16M8 16v-4m4 4V8m4 8V3m4 13v-6"/></svg>',
    globe:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>'
  }[name] || '');
  function showError(message) {
    $('liveLabel').textContent = 'Data tidak tersedia';
    $('mapStatus').textContent = 'Menunggu koneksi data';
    $('serverTable').innerHTML = `<tr><td colspan="7" class="empty-state">${esc(message)}<br><button class="view-btn" id="retryInline">Coba lagi</button></td></tr>`;
    $('rankTable').innerHTML = `<tr><td colspan="6" class="empty-state">${esc(message)}</td></tr>`;
    const retry = $('retryInline'); if (retry) retry.onclick = loadServers;
  }
  async function loadServers() {
    if (state.loading) return; state.loading = true;
    $('liveLabel').textContent = 'Mengambil data'; $('refreshBtn').classList.add('spinning');
    try {
      const r = await fetch('/api/servers', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const payload = await r.json();
      if (!r.ok || !Array.isArray(payload.servers) || !payload.servers.length) throw new Error(payload.warning || payload.error || 'Daftar publik Cfx.re belum dapat dibaca.');
      state.servers = payload.servers.map(s => ({...s, players:Number(s.players)||0, capacity:Number(s.capacity)||0}));
      renderAll(); $('liveLabel').textContent = 'Live listing'; $('updatedAt').textContent = 'Update: ' + new Date(payload.fetchedAt || Date.now()).toLocaleTimeString('id-ID');
      $('mapStatus').textContent = `${fmt(state.servers.length)} server terindeks`;
      loadHistory();
    } catch (e) { showError(e.message || 'Gagal mengambil data server.'); }
    finally { state.loading = false; $('refreshBtn').classList.remove('spinning'); }
  }
  function renderAll() {
    const servers = state.servers, players = servers.reduce((n,s)=>n+s.players,0), capacity=servers.reduce((n,s)=>n+s.capacity,0);
    const countries = [...new Set(servers.map(s=>s.country).filter(c=>c && c!=='Unknown'))].sort();
    $('totalServers').textContent = fmt(servers.length); $('totalPlayers').textContent = fmt(players); $('totalCapacity').textContent = fmt(capacity); $('totalCountries').textContent = fmt(countries.length); $('mapPlayers').textContent = fmt(players);
    $('countryFilter').innerHTML = '<option value="all">Semua negara</option>' + countries.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    const current = $('countryTopFilter').value;
    $('countryTopFilter').innerHTML = countries.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (countries.includes(current)) $('countryTopFilter').value=current; else if (countries.includes('Indonesia')) $('countryTopFilter').value='Indonesia';
    renderCountryLeaders(); renderRank(); renderDirectory(); renderTop3(); renderMap();
  }
  function countryStats() {
    const map = new Map(); for (const s of state.servers) { if (s.country==='Unknown') continue; const x=map.get(s.country)||{name:s.country,code:s.countryCode,players:0,servers:0}; x.players+=s.players; x.servers++; map.set(s.country,x); } return [...map.values()].sort((a,b)=>b.players-a.players);
  }
  function renderCountryLeaders() {
    $('countryLeaders').innerHTML = countryStats().slice(0,10).map((c,i)=>`<div class="country-row"><span class="country-rank">${i+1}</span><span class="flag">${flag(c.code)}</span><span class="country-name">${esc(c.name)}</span><b>${fmt(c.players)}</b></div>`).join('') || '<p class="empty-state">Negara belum terdeteksi dari metadata publik.</p>';
  }
  function rankServers() {
    const rows = state.servers.filter(s => state.rank==='global' || s.country===state.rank).slice().sort((a,b)=>b.players-a.players);
    $('rankSubtitle').textContent = state.rank==='global' ? 'Pemain online terbanyak saat ini' : `Pemain online terbanyak di ${state.rank}`;
    $('rankTable').innerHTML = rows.slice(0,10).map((s,i)=>`<tr><td class="rank-num">${String(i+1).padStart(2,'0')}</td><td><div class="server-name">${esc(s.name)}</div><small class="server-id">${esc(s.id).slice(0,30)}</small></td><td>${flag(s.countryCode)} ${esc(s.country)}</td><td class="num">${fmt(s.players)}</td><td class="num">${fmt(s.capacity || '—')}</td><td><div class="meter"><i style="width:${s.capacity?Math.min(100,s.players/s.capacity*100):0}%"></i></div></td></tr>`).join('') || '<tr><td colspan="6" class="empty-state">Tidak ada server yang cocok dengan negara ini di data yang berhasil dimuat.</td></tr>';
    $('activityBars').innerHTML = rows.slice(0,5).map((s,i)=>`<div class="activity-row"><div class="activity-label"><span>${i+1}. ${esc(s.name)}</span><b>${fmt(s.players)}</b></div><div class="activity-track"><i style="width:${rows[0]?.players?Math.max(1,s.players/rows[0].players*100):0}%"></i></div></div>`).join('') || '<p class="empty-state">Belum ada data.</p>';
  }
  function renderRank(){ document.querySelectorAll('[data-rank]').forEach(b=>b.classList.toggle('selected',b.dataset.rank===state.rank)); rankServers(); }
  function filteredServers() {
    const q=$('serverSearch').value.trim().toLowerCase(), country=$('countryFilter').value, sort=$('sortFilter').value;
    let rows=state.servers.filter(s=>(country==='all'||s.country===country)&&(!q||[s.name,s.country,s.id,...s.tags].join(' ').toLowerCase().includes(q)));
    rows.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name):sort==='capacity'?(a,b)=>b.capacity-a.capacity:(a,b)=>b.players-a.players); return rows;
  }
  function renderDirectory() {
    const rows=filteredServers(), pages=Math.max(1,Math.ceil(rows.length/state.pageSize)); state.page=Math.min(state.page,pages); const start=(state.page-1)*state.pageSize;
    $('visibleCount').textContent=fmt(rows.length); $('pageInfo').textContent=rows.length?`${fmt(start+1)}–${fmt(Math.min(start+state.pageSize,rows.length))} dari ${fmt(rows.length)} server`:'Tidak ada hasil';
    $('prevPage').disabled=state.page<=1; $('nextPage').disabled=state.page>=pages;
    $('serverTable').innerHTML=rows.slice(start,start+state.pageSize).map(s=>`<tr><td><div class="server-name">${esc(s.name)}</div><small class="server-id">${esc(s.id).slice(0,34)}</small></td><td>${flag(s.countryCode)} ${esc(s.country)}</td><td><span class="status-pill"><i></i> ONLINE</span></td><td class="num">${fmt(s.players)}</td><td class="num">${s.capacity?fmt(s.capacity):'—'}</td><td><div class="meter"><i style="width:${s.capacity?Math.min(100,s.players/s.capacity*100):0}%"></i></div></td><td><button class="view-btn" data-view="${esc(s.id)}">Detail</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty-state">Tidak ada server yang cocok.</td></tr>';
  }
  function renderTop3() {
    const country=$('countryTopFilter').value; const rows=state.servers.filter(s=>s.country===country).sort((a,b)=>b.players-a.players).slice(0,3);
    $('countryTopCards').innerHTML=rows.length?`<article class="top3-card"><div class="top3-head"><span class="flag">${flag(rows[0].countryCode)}</span><div><b>${esc(country)}</b><small>Top 3 berdasarkan pemain online saat ini</small></div></div>${rows.map((s,i)=>`<div class="top3-item"><span class="medal">${i+1}</span><div class="top3-name"><b>${esc(s.name)}</b><small>${fmt(s.capacity)} slot kapasitas</small></div><strong>${fmt(s.players)}</strong></div>`).join('')}</article>`:'<article class="top3-card"><p class="empty-state">Belum ada server terdeteksi untuk negara ini. Coba negara lain atau periksa kembali nanti.</p></article>';
  }
  function renderMap() {
    if (!window.L) { $('mapStatus').textContent='Library peta tidak tersedia'; return; }
    if (!state.map) { state.map=L.map('worldMap',{zoomControl:false,worldCopyJump:true}).setView([20,0],2); L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OpenStreetMap &copy; CARTO',subdomains:'abcd',maxZoom:18}).addTo(state.map); }
    state.markers.forEach(m=>state.map.removeLayer(m)); state.markers=[];
    const seen=new Set(); for(const s of state.servers) { if(s.lat==null||s.lon==null||s.country==='Unknown') continue; const key=s.country; if(seen.has(key)) continue; seen.add(key); const countryServers=state.servers.filter(x=>x.country===key); const total=countryServers.reduce((n,x)=>n+x.players,0); const icon=L.divIcon({className:'server-pin',html:`<div class="pin-dot ${total>5000?'hot':total>1500?'warm':''}"></div>`,iconSize:[14,14],iconAnchor:[7,7]}); const marker=L.marker([s.lat,s.lon],{icon}).addTo(state.map); marker.bindPopup(`<strong>${flag(s.countryCode)} ${esc(key)}</strong><br>${fmt(countryServers.length)} server terdeteksi<br>${fmt(total)} pemain online`); state.markers.push(marker); }
    $('mapStatus').textContent=`${state.markers.length} negara dengan lokasi perkiraan`;
    setTimeout(()=>state.map.invalidateSize(),120);
  }
  function openDetails(id) {
    const s=state.servers.find(x=>x.id===id); if(!s)return;
    $('modalContent').innerHTML=`<div class="eyebrow">SERVER DETAILS</div><h2>${esc(s.name)}</h2><p>Informasi berasal dari listing publik Cfx.re. Nama dan jumlah pemain dapat berubah kapan saja.</p><div class="modal-grid"><div class="modal-stat"><small>Negara terdeteksi</small><b>${flag(s.countryCode)} ${esc(s.country)}</b></div><div class="modal-stat"><small>Pemain online</small><b>${fmt(s.players)}</b></div><div class="modal-stat"><small>Kapasitas</small><b>${s.capacity?fmt(s.capacity):'Tidak tersedia'}</b></div><div class="modal-stat"><small>ID listing</small><b style="font-size:10px;overflow-wrap:anywhere">${esc(s.id)}</b></div></div>${s.joinUrl?`<a class="modal-link" href="${esc(s.joinUrl)}" target="_blank" rel="noopener">Buka server ↗</a>`:''}`;
    $('serverModal').hidden=false;
  }
  async function loadHistory() {
    try { const r=await fetch('/api/history'); const data=await r.json(); if(!r.ok||!data.available) { $('historyStatus').textContent='Database belum terhubung'; return; }
      $('historyStatus').textContent=`${data.days.length} hari tercatat`; drawHistory(data.days); $('historyLeaders').innerHTML=data.leaders.length?data.leaders.map((s,i)=>`<div class="history-leader"><span class="history-rank">${String(i+1).padStart(2,'0')}</span><div><b>${esc(s.server_name)}</b><small>${esc(s.country)}</small></div><strong>${fmt(s.peak_players)}</strong></div>`).join(''):'<div class="empty-state">Riwayat belum tersedia.</div>';
    } catch (_) { $('historyStatus').textContent='Riwayat tersedia setelah database terhubung'; }
  }
  function drawHistory(days) {
    const canvas=$('historyChart'), rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1; canvas.width=Math.max(300,rect.width*dpr); canvas.height=210*dpr; const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr); const w=canvas.width/dpr,h=210; ctx.clearRect(0,0,w,h); const vals=days.map(d=>Number(d.total_players)||0); if(vals.length<2){ctx.fillStyle='#8994a3';ctx.font='12px sans-serif';ctx.fillText('Grafik 30 hari akan terbentuk setelah snapshot tersimpan.',12,45);return;} const max=Math.max(...vals,1),pad=20; ctx.strokeStyle='#26303c';ctx.lineWidth=1; for(let i=0;i<4;i++){let y=pad+i*(h-2*pad)/3;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();} const pts=vals.map((v,i)=>({x:i/(vals.length-1)*w,y:h-pad-v/max*(h-2*pad)})); const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'rgba(245,45,59,.36)');grad.addColorStop(1,'rgba(245,45,59,0)');ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStyle=grad;ctx.fill();ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#f43b49';ctx.lineWidth=2;ctx.stroke();
  }
  $('refreshBtn').addEventListener('click',loadServers); $('menuToggle').addEventListener('click',()=>$('mainNav').classList.toggle('open'));
  $('mainNav').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>$('mainNav').classList.remove('open')));
  $('rankTabs').addEventListener('click',e=>{const b=e.target.closest('[data-rank]');if(b){state.rank=b.dataset.rank;renderRank();}});
  ['serverSearch','countryFilter','sortFilter'].forEach(id=>$(id).addEventListener(id==='serverSearch'?'input':'change',()=>{state.page=1;renderDirectory();}));
  $('countryTopFilter').addEventListener('change',renderTop3); $('prevPage').addEventListener('click',()=>{state.page--;renderDirectory();}); $('nextPage').addEventListener('click',()=>{state.page++;renderDirectory();});
  $('serverTable').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)openDetails(b.dataset.view);});
  $('serverModal').addEventListener('click',e=>{if(e.target.dataset.close)$('serverModal').hidden=true;}); document.addEventListener('keydown',e=>{if(e.key==='Escape')$('serverModal').hidden=true;});
  $('zoomIn').addEventListener('click',()=>state.map&&state.map.zoomIn()); $('zoomOut').addEventListener('click',()=>state.map&&state.map.zoomOut()); $('year').textContent=new Date().getFullYear();
  window.addEventListener('resize',()=>{if(state.map)state.map.invalidateSize();});
  loadServers(); setInterval(loadServers,5*60*1000);
})();
