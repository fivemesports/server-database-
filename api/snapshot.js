const { neon } = require('@neondatabase/serverless');
module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) return res.status(401).json({ error:'Unauthorized' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error:'DATABASE_URL belum diatur' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://${req.headers.host}`;
    const response = await fetch(`${base}/api/servers`, { headers: { 'User-Agent':'fivemesports-snapshot' } });
    if (!response.ok) throw new Error(`Server API returned ${response.status}`);
    const payload = await response.json(); const servers = payload.servers || [];
    if (!servers.length) throw new Error('Cfx.re returned no readable servers; snapshot skipped');
    const players = servers.reduce((sum,s)=>sum+s.players,0);
    await sql`INSERT INTO daily_snapshots(day,total_players,total_servers,top_servers) VALUES (CURRENT_DATE,${players},${servers.length},${JSON.stringify(servers.slice().sort((a,b)=>b.players-a.players).slice(0,10))}::jsonb) ON CONFLICT(day) DO UPDATE SET total_players=EXCLUDED.total_players,total_servers=EXCLUDED.total_servers,top_servers=EXCLUDED.top_servers`;
    // Store per-server samples in batches to keep request size manageable.
    for (let i=0; i<servers.length; i+=100) {
      const batch=servers.slice(i,i+100).map(s=>({server_id:String(s.id),server_name:String(s.name),country:String(s.country||'Unknown'),players:Number(s.players)||0,capacity:Number(s.capacity)||0}));
      await sql`INSERT INTO server_snapshots(server_id,server_name,country,players,capacity,captured_at) SELECT x.server_id,x.server_name,x.country,x.players,x.capacity,NOW() FROM json_to_recordset(${JSON.stringify(batch)}::json) AS x(server_id text,server_name text,country text,players integer,capacity integer)`;
    }
    await sql`DELETE FROM server_snapshots WHERE captured_at < NOW() - INTERVAL '35 days'`;
    await sql`DELETE FROM daily_snapshots WHERE day < CURRENT_DATE - INTERVAL '35 days'`;
    return res.status(200).json({ ok:true, servers:servers.length, players, capturedAt:new Date().toISOString() });
  } catch(e) { return res.status(500).json({ error:'Snapshot gagal', detail:e.message }); }
};
