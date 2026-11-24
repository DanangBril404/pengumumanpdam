# Perumda Air Minum Kota Magelang Studio

Editor pengumuman gangguan aliran air untuk Perumda Air Minum Kota Magelang.
Aplikasi web statis: cukup buka `index.html`, tanpa build, backend, atau database.

## Isi

- `index.html` — halaman editor (poster + panel pengaturan)
- `app.js` — logika editor (template, teks, layer, tata letak, ekspor PNG)
- `backgrounds.js`, `decorations.js`, `repair.js`, `social-icons.js` — pustaka gambar/hiasan
- `*.webp` — aset ilustrasi (pipa, kran, panel listrik, dokumentasi perbaikan)
- `social-icons-license.txt` — lisensi ikon media sosial

## Fitur

- Template perbaikan pipa & perbaikan listrik (termasuk **unggah template listrik sendiri** — otomatis tersimpan di galeri browser, bisa dihapus)
- Galeri hiasan poster: tambah dari pustaka, unggah gambar sendiri, hapus — semua tersimpan di browser
- **Warna dasar latar** bisa diganti (pemilih warna) sebelum/sesudah mengunggah latar; area transparan gambar mengikuti warna tersebut
- 12 template latar + galeri hiasan, bisa unggah gambar sendiri
- Semua blok teks bisa digeser (tombol **Magnet** untuk menempel ke garis bantu)
- **Pemilih font per blok teks** (tombol "Aa"): 14 font formal (tanpa kait & serif), tersimpan di draf
- Panel **Layer** untuk menyembunyikan/menampilkan elemen
- Simpan & panggil ulang **tata letak** (tersimpan di localStorage browser)
- Ekspor poster **PNG** dan salin teks pengumuman

## Menjalankan

Langsung: buka `index.html` di browser.

Sebagai situs statis di server (contoh yang dipakai):

```yaml
services:
  studio:
    image: nginx:stable-alpine
    container_name: perumda-studio
    restart: unless-stopped
    ports: ["3003:80"]
    volumes:
      - ./site:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

Alamat:

- LAN: http://192.168.0.20:3003
- Publik: https://pengumumanpdam.gsstudio.online (Cloudflare Tunnel)

## Catatan teknis

- `buatId()` memakai `crypto.randomUUID()` bila tersedia (HTTPS/localhost) dan
  fallback acak bila diakses lewat HTTP biasa, supaya **Simpan tata letak** tetap jalan.
- Rujukan skrip memakai penanda versi (`?v=...`) dan nginx mengirim
  `Cache-Control: no-cache` untuk HTML/JS agar perubahan langsung terlihat di balik Cloudflare.
