const { neon } = require('@neondatabase/serverless');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=60');
  if (!process.env.DATABASE_URL) return res.status(503).json({ available:false, message:'DATABASE_URL belum diatur. Hubungkan Neon dan jalankan schema.sql.' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT day, total_players, total_servers, top_servers FROM daily_snapshots WHERE day >= CURRENT_DATE - INTERVAL '29 days' ORDER BY day ASC`;
    const leaders = await sql`SELECT server_id, server_name, country, MAX(players) AS peak_players FROM server_snapshots WHERE captured_at >= NOW() - INTERVAL '30 days' GROUP BY server_id, server_name, country ORDER BY peak_players DESC LIMIT 10`;
    return res.status(200).json({ available:true, days:rows, leaders });
  } catch (e) { return res.status(500).json({ available:false, message:'Database riwayat belum siap.', detail: e.message }); }
};
