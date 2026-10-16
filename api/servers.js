const COUNTRY_DATA = [
  ['Indonesia','ID',-2,118,['indonesia','indonesian','id-ID','id_ID']],['United States','US',39,-98,['united states','usa','american','en-US']],['Brazil','BR',-10,-52,['brazil','brasil','pt-BR']],['Thailand','TH',15,101,['thailand','thai','th-TH']],['Germany','DE',51,10,['germany','deutsch','de-DE']],['France','FR',46,2,['france','français','fr-FR']],['United Kingdom','GB',55,-3,['united kingdom','britain','uk','en-GB']],['Australia','AU',-25,133,['australia','en-AU']],['Canada','CA',57,-106,['canada','en-CA']],['Turkey','TR',39,35,['turkey','türkiye','tr-TR']],['Mexico','MX',23,-102,['mexico','es-MX']],['Japan','JP',36,138,['japan','ja-JP']],['Spain','ES',40,-4,['spain','es-ES']],['Italy','IT',42,12,['italy','it-IT']],['Russia','RU',60,90,['russia','ru-RU']],['Netherlands','NL',52,5,['netherlands','nl-NL']],['Poland','PL',52,19,['poland','pl-PL']],['Argentina','AR',-34,-64,['argentina','es-AR']],['Portugal','PT',39,-8,['portugal','pt-PT']],['Philippines','PH',13,122,['philippines','fil-ph']],['Malaysia','MY',4,102,['malaysia','ms-MY']],['Singapore','SG',1.35,103.8,['singapore']],['South Africa','ZA',-29,24,['south africa']],['Sweden','SE',62,15,['sweden','sv-SE']],['Ukraine','UA',49,32,['ukraine','uk-UA']],['South Korea','KR',36,128,['south korea','ko-KR']],['China','CN',35,103,['china','zh-CN']],['Vietnam','VN',16,108,['vietnam','vi-VN']],['New Zealand','NZ',-41,174,['new zealand','en-NZ']],['Belgium','BE',50.5,4.5,['belgium','nl-BE','fr-BE']]
];
const norm = s => String(s || '').toLowerCase();
function identifyCountry(server) {
  const vars = server.vars || {};
  const text = [vars.locale, vars.country, vars.countryCode, vars.tags, ...(server.vars?.tags ? [server.vars.tags] : []), server.hostname].flat().join(' ');
  const explicit = norm(vars.countryCode || vars.country_code || vars.country);
  for (const c of COUNTRY_DATA) if (explicit === c[1].toLowerCase() || explicit === norm(c[0])) return c;
  for (const c of COUNTRY_DATA) if (c[4].some(alias => norm(text).includes(norm(alias)))) return c;
  return null;
}
function cleanServer(s) {
  const vars = s.vars || {};
  const clients = Number(s.clients ?? s.players?.length ?? 0) || 0;
  const max = Number(s.sv_maxclients ?? vars.sv_maxClients ?? s.maxClients ?? 0) || 0;
  const c = identifyCountry(s);
  return { id: String(s.EndPoint || s.connectEndPoint || s.hostname || Math.random()), name: String(s.hostname || 'FiveM Server').replace(/<[^>]*>/g,'').slice(0,180), players: clients, capacity: max, country: c?.[0] || 'Unknown', countryCode: c?.[1] || '', lat: c?.[2] ?? null, lon: c?.[3] ?? null, tags: Array.isArray(s.tags) ? s.tags.slice(0,20) : String(vars.tags || '').split(',').filter(Boolean).slice(0,20), locale: vars.locale || '', projectName: vars.sv_projectName || '', connect: s.connectEndPoint || s.EndPoint || '', joinUrl: s.joinUrl || '', updatedAt: new Date().toISOString() };
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=240, stale-while-revalidate=60');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const url = 'https://servers-frontend.fivem.net/api/servers/stream/';
  try {
    const upstream = await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'fivemesports.id server dashboard' }, signal: AbortSignal.timeout(20000) });
    if (!upstream.ok) throw new Error(`Cfx.re returned ${upstream.status}`);
    const raw = await upstream.text();
    const servers = [];
    // Cfx.re's public stream is commonly newline-delimited JSON; tolerate JSON arrays/envelopes too.
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : (parsed.Data || parsed.data || parsed.servers || []);
      if (Array.isArray(arr)) servers.push(...arr);
    } catch (_) {
      for (const line of raw.split(/\r?\n/)) {
        const chunk = line.trim().replace(/^data:\s*/, '');
        if (!chunk || chunk === '[DONE]') continue;
        try { const obj = JSON.parse(chunk); if (Array.isArray(obj)) servers.push(...obj); else if (obj && typeof obj === 'object') servers.push(...(obj.Data || obj.data || obj.servers || [obj])); } catch (_) {}
      }
    }
    const unique = new Map();
    for (const s of servers) { if (!s || typeof s !== 'object') continue; const c = cleanServer(s); if (c.id && !unique.has(c.id)) unique.set(c.id, c); }
    const data = [...unique.values()];
    res.status(200).json({ source: 'Cfx.re public server listing', fetchedAt: new Date().toISOString(), count: data.length, servers: data, warning: data.length ? null : 'Cfx.re tidak mengembalikan data yang bisa dibaca. Coba refresh beberapa saat lagi.' });
  } catch (err) {
    res.status(502).json({ error: 'Tidak dapat mengambil daftar publik Cfx.re saat ini.', detail: String(err.message || err), source: 'Cfx.re public server listing' });
  }
};
