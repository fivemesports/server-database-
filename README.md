# fivemesports.id — Global FiveM Server Intelligence

Dashboard statis + Vercel Functions untuk mengambil listing server publik Cfx.re secara otomatis. Tidak membutuhkan input ID server manual.

## Fitur
- Dashboard server/pemain/kapasitas dari listing publik Cfx.re
- Refresh otomatis tiap 5 menit
- World map 2D dengan marker negara dari metadata yang dapat dikenali
- Ranking global dan ranking negara, direktori server dengan pencarian/filter/paginasi
- Top 3 server per negara yang dipilih
- Grafik dan Top 30 hari setelah database Neon dikonfigurasi
- Banner video looping dan logo yang disediakan pemilik

## Jalankan lokal
Butuh Node.js 20+.

```bash
npm install
npx vercel dev
```

`/api/servers` adalah API proxy backend. Buka website melalui `vercel dev` supaya endpoint API berjalan; membuka `index.html` langsung dari file manager tidak akan menjalankan fungsi API.

## Deploy GitHub + Vercel
1. Upload isi folder ini ke repository GitHub.
2. Di Vercel pilih **Add New → Project**, lalu import repository.
3. Framework preset: **Other**. Build command dan output directory bisa dikosongkan untuk website statis dengan Vercel Functions.
4. Deploy. Domain `fivemesports.id` ditambahkan di Project → Settings → Domains, lalu ikuti pengaturan DNS yang diberikan Vercel.
5. Periksa `/api/servers` di domain deploy. Jika sumber Cfx.re sedang membatasi request atau mengubah format, API akan menampilkan error dan dashboard tidak mengarang data.

## Aktifkan statistik 30 hari (opsional, disarankan)
1. Buat database PostgreSQL di Neon.
2. Jalankan isi `schema.sql` lewat SQL Editor Neon.
3. Tambahkan Environment Variables di Vercel:
   - `DATABASE_URL` = connection string Neon (gunakan pooled connection jika tersedia)
   - `CRON_SECRET` = string acak rahasia yang panjang
4. Redeploy.
5. Vercel Cron menjalankan `/api/snapshot` sekali sehari. Pastikan paket Vercel yang digunakan mendukung Cron Jobs sesuai kebutuhan akun saat ini.
6. Data historis mulai terkumpul setelah snapshot pertama. Sistem tidak dapat mengisi ulang riwayat 30 hari sebelum website mulai menyimpan data.

## Catatan penting soal data
- Endpoint Cfx.re adalah listing publik, bukan jaminan seluruh server privat/tersembunyi masuk hasil.
- Negara hanya diperkirakan dari metadata/locale/tag publik yang cocok; lokasi marker adalah titik tengah negara, bukan lokasi fisik server.
- Server tanpa metadata negara ditandai `Unknown` dan tidak dipetakan agar tidak membuat lokasi palsu.
- Ranking 30 hari adalah puncak pemain yang berhasil tersimpan dalam snapshot, bukan histori resmi Cfx.re.
- Jangan menaruh `DATABASE_URL` atau `CRON_SECRET` di JavaScript frontend atau repository publik.
