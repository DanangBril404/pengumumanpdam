# Backend Admin Perumda Studio

Backend kecil (hanya pustaka standar Python + SQLite) untuk mengelola data yang dipakai
aplikasi poster: template, hiasan poster, hiasan pipa, jenis pengumuman, penyebab gangguan,
dan pilihan wilayah.

## Berkas

| Berkas | Isi |
|---|---|
| `server.py` | API + halaman admin (`/admin`), SQLite di `$STUDIO_DATA/studio.db` |
| `admin.html` | Halaman admin (satu berkas, tanpa build) |
| `seed.json` | Data awal (template bawaan, hiasan, jenis, penyebab, wilayah) |

## Menjalankan lokal

```bash
STUDIO_DATA=./data STUDIO_PORT=8123 python3 backend/server.py
# admin : http://127.0.0.1:8123/admin
# data  : http://127.0.0.1:8123/api/data
# aplikasi poster (uji): http://127.0.0.1:8099/index.html?api=http://127.0.0.1:8123
```

Sandi admin dibuat saat pertama membuka `/admin` (minimal 8 karakter), disimpan sebagai
PBKDF2-SHA256 (200.000 iterasi) di SQLite — tidak ada sandi di dalam kode.

## Endpoint

| Metode | Jalur | Keterangan |
|---|---|---|
| GET | `/api/data` | semua data publik yang dipakai aplikasi poster |
| GET | `/api/media/<berkas>` | gambar hasil unggahan admin |
| GET | `/api/session` | status login + `needsSetup` |
| POST | `/api/setup` | buat sandi admin (hanya bila belum ada) |
| POST | `/api/login` / `/api/logout` | sesi cookie HMAC (30 hari) |
| POST | `/api/upload` | `{name, data: dataURL}` → `{url}` (maks 6 MB) |
| POST | `/api/items` | tambah `{kind, name, body}` |
| PUT | `/api/items/<id>` | ubah `{name, body, enabled}` |
| DELETE | `/api/items/<id>` | hapus |
| POST | `/api/items/<id>/move` | geser urutan `{dir: -1\|1}` |

`kind`: `hiasan`, `pipa`, `template`, `jenis`, `penyebab`, `wilayah`.

## Deploy (PDAM-Cloud 192.168.0.20)

```bash
# di server
mkdir -p ~/perumda-studio/api ~/perumda-studio/api-data
scp backend/{server.py,admin.html,seed.json} security@192.168.0.20:~/perumda-studio/api/
scp deploy/{docker-compose.yml,nginx.conf} security@192.168.0.20:~/perumda-studio/
ssh security@192.168.0.20 'cd ~/perumda-studio && docker compose up -d'
```

nginx meneruskan `/api/` dan `/admin` ke container `perumda-studio-api` (port 8000, tanpa
port host). Data tersimpan di `~/perumda-studio/api-data` (SQLite + `uploads/`) — **cadangkan
folder itu**.

Bila `nginx.conf` berubah, muat ulang nginx tanpa mematikan situs:
`docker exec perumda-studio nginx -s reload`.

## Cadangan & pulihkan

```bash
# cadangan
tar czf ~/backup-studio-$(date +%F).tar.gz -C ~/perumda-studio api-data
# pulihkan
tar xzf ~/backup-studio-YYYY-MM-DD.tar.gz -C ~/perumda-studio
```
