# Deploy dengan Docker Compose di Coolify

Gunakan `docker-compose.yml` sebagai build pack Docker Compose. Stack hanya berisi
service aplikasi:

- `app`: Nuxt/Nitro pada port internal `3000`.

MinIO tidak disertakan karena aplikasi tidak memakai object storage atau API S3.
PostgreSQL juga tidak dibuat oleh Compose karena aplikasi menggunakan database lama
yang sudah tersedia di Coolify.

## Environment variables

- `DATABASE_URL` — wajib, isi dengan connection string PostgreSQL database lama.
  Jika database adalah resource Coolify dalam server yang sama, gunakan internal URL
  database tersebut, bukan public URL.
- `JWT_SECRET` — wajib, gunakan nilai acak yang panjang dan jangan diubah setelah
  aplikasi digunakan.
- `JWT_EXPIRES_IN` — opsional, default `7d`.
- `APP_PORT` — opsional, default `3018`; merupakan port host yang diteruskan ke
  port aplikasi `3000`.

`NODE_ENV` tidak perlu dibuat sebagai build-time variable di Coolify. Dockerfile
memakai mode development hanya saat memasang build dependencies, kemudian image
akhir tetap berjalan dengan `NODE_ENV=production`.

## Konfigurasi Coolify

1. Buat resource baru dari repository dan pilih Docker Compose.
2. Pilih service `app` sebagai service yang diberi domain.
3. Atur port tujuan ke `3000` jika tidak terdeteksi otomatis.
4. Tambahkan `DATABASE_URL` milik database lama dan `JWT_SECRET` ke Environment
   Variables.
5. Pastikan external network bernama `coolify` tersedia. Network ini sudah tersedia
   pada instalasi Coolify normal.

Build Nuxt dibatasi ke heap Node.js 512 MB agar proses build tidak menghabiskan memori
server Coolify. Nilai ini dapat diganti dengan build argument `BUILD_NODE_OPTIONS`
jika kapasitas server berbeda.

Stack ini menggunakan database yang sudah ada dan tidak membuat akun atau data
bootstrap apa pun. Saat container `app` dimulai, `prisma migrate deploy` dijalankan
sebelum server.
Health check `/api/health` memeriksa server sekaligus koneksi database.
