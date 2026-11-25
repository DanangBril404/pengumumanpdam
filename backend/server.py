#!/usr/bin/env python3
"""Backend data Perumda Studio — hanya pustaka standar Python + SQLite.

Melayani:
  GET  /api/data                  daftar template/hiasan/jenis/penyebab/wilayah (publik)
  GET  /api/media/<berkas>        gambar hasil unggahan admin
  GET  /api/session               status login admin
  POST /api/setup  {password}     membuat sandi admin (sekali, saat belum ada)
  POST /api/login  {password}
  POST /api/logout
  POST /api/upload {name, data}   simpan gambar (data URL base64) -> {url}
  POST /api/items                 tambah item  {kind, name, body}
  PUT  /api/items/<id>            ubah item    {name, body, enabled}
  DELETE /api/items/<id>          hapus item
  POST /api/items/<id>/move       geser urutan {dir: -1|1}
  GET  /admin                     halaman admin
  GET  /healthz

Data tersimpan di SQLite ($STUDIO_DATA/studio.db, bawaan ./data).
"""

import base64
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get('STUDIO_DATA', os.path.join(BASE_DIR, 'data'))
DB_PATH = os.path.join(DATA_DIR, 'studio.db')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
SEED_PATH = os.path.join(BASE_DIR, 'seed.json')
ADMIN_PAGE = os.path.join(BASE_DIR, 'admin.html')
PORT = int(os.environ.get('STUDIO_PORT', '8000'))
KINDS = ('hiasan', 'pipa', 'template', 'jenis', 'penyebab', 'wilayah')
COOKIE = 'studio_auth'
SESSION_AGE = 60 * 60 * 24 * 30
MAX_BODY = 12 * 1024 * 1024
MAX_IMAGE = 6 * 1024 * 1024
ALLOWED_IMAGE = ('image/png', 'image/jpeg', 'image/webp')


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    conn = connect()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            name TEXT NOT NULL,
            body TEXT NOT NULL DEFAULT '{}',
            sort INTEGER NOT NULL DEFAULT 0,
            enabled INTEGER NOT NULL DEFAULT 1,
            updated TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            salt TEXT NOT NULL,
            hash TEXT NOT NULL,
            iterations INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    ''')
    count = conn.execute('SELECT COUNT(*) AS n FROM items').fetchone()['n']
    if count == 0 and os.path.exists(SEED_PATH):
        with open(SEED_PATH, encoding='utf-8') as handle:
            seed = json.load(handle)
        now = time.strftime('%Y-%m-%d %H:%M:%S')
        for index, item in enumerate(seed.get('items', [])):
            conn.execute(
                'INSERT OR IGNORE INTO items (id, kind, name, body, sort, enabled, updated) VALUES (?,?,?,?,?,?,?)',
                (item['id'], item['kind'], item['name'], json.dumps(item.get('body') or {}, ensure_ascii=False),
                 index * 10, int(item.get('enabled', 1)), now))
    if not conn.execute("SELECT value FROM meta WHERE key='secret'").fetchone():
        conn.execute("INSERT INTO meta (key, value) VALUES ('secret', ?)", (secrets.token_hex(32),))
    conn.commit()
    conn.close()


def meta(key, value=None):
    conn = connect()
    if value is None:
        row = conn.execute('SELECT value FROM meta WHERE key=?', (key,)).fetchone()
        conn.close()
        return row['value'] if row else None
    conn.execute('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', (key, value))
    conn.commit()
    conn.close()
    return value


def has_admin():
    conn = connect()
    row = conn.execute('SELECT COUNT(*) AS n FROM admin').fetchone()
    conn.close()
    return row['n'] > 0


def set_password(password):
    salt = secrets.token_hex(16)
    iterations = 200_000
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), bytes.fromhex(salt), iterations).hex()
    conn = connect()
    conn.execute('DELETE FROM admin')
    conn.execute('INSERT INTO admin (id, salt, hash, iterations) VALUES (1, ?, ?, ?)', (salt, digest, iterations))
    conn.commit()
    conn.close()


def check_password(password):
    conn = connect()
    row = conn.execute('SELECT salt, hash, iterations FROM admin WHERE id=1').fetchone()
    conn.close()
    if not row:
        return False
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), bytes.fromhex(row['salt']), row['iterations']).hex()
    return hmac.compare_digest(digest, row['hash'])


def make_token():
    stamp = str(int(time.time()))
    signature = hmac.new((meta('secret') or '').encode(), stamp.encode(), hashlib.sha256).hexdigest()
    return stamp + '.' + signature


def token_valid(token):
    if not token or '.' not in token:
        return False
    stamp, signature = token.split('.', 1)
    expected = hmac.new((meta('secret') or '').encode(), stamp.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return False
    try:
        return int(stamp) + SESSION_AGE > time.time()
    except ValueError:
        return False


def rows_for(kind, only_enabled=True):
    conn = connect()
    query = 'SELECT * FROM items WHERE kind=?'
    if only_enabled:
        query += ' AND enabled=1'
    rows = conn.execute(query + ' ORDER BY sort, name', (kind,)).fetchall()
    conn.close()
    return rows


def payload():
    def pack(rows):
        hasil = []
        for row in rows:
            try:
                body = json.loads(row['body'])
            except ValueError:
                body = {}
            hasil.append({'id': row['id'], 'name': row['name'], 'body': body,
                          'enabled': bool(row['enabled']), 'sort': row['sort']})
        return hasil

    def template(item):
        body = item['body']
        return {
            'id': item['id'], 'name': item['name'],
            'category': body.get('category', 'pipa'),
            'image': body.get('image', ''),
            'colors': body.get('colors') or ['#071c35', '#125071', '#9eecff'],
            'animation': body.get('animation', '')
        }

    return {
        'templates': [template(item) for item in pack(rows_for('template'))],
        'decorations': [{'id': item['id'], 'name': item['name'], 'image': item['body'].get('image', '')}
                        for item in pack(rows_for('hiasan'))],
        'pipeArt': [{'id': item['id'], 'name': item['name'], 'image': item['body'].get('image', '')}
                    for item in pack(rows_for('pipa'))],
        'types': [{'id': item['id'], 'name': item['name']} for item in pack(rows_for('jenis'))],
        'causes': pack(rows_for('penyebab')),
        'areas': pack(rows_for('wilayah')),
        'generated': time.strftime('%Y-%m-%d %H:%M:%S')
    }


def slug(text):
    bersih = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return (bersih or 'item')[:40]


class Handler(BaseHTTPRequestHandler):
    server_version = 'PerumdaStudio/1.0'

    def log_message(self, format, *args):  # noqa: A002 - mengikuti nama parameter kelas dasar
        print('%s - %s' % (self.address_string(), format % args), flush=True)

    # ---------- utilitas ----------
    def kirim(self, status, body, headers=None, content_type='application/json; charset=utf-8'):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode('utf-8')
        elif isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Content-Type-Options', 'nosniff')
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def baca_json(self):
        panjang = int(self.headers.get('Content-Length') or 0)
        if panjang <= 0:
            return {}
        if panjang > MAX_BODY:
            raise ValueError('Data terlalu besar.')
        return json.loads(self.rfile.read(panjang).decode('utf-8'))

    def cookie_auth(self):
        raw = self.headers.get('Cookie') or ''
        for bagian in raw.split(';'):
            if '=' in bagian:
                nama, nilai = bagian.strip().split('=', 1)
                if nama == COOKIE:
                    return token_valid(nilai)
        return False

    def butuh_auth(self):
        if self.cookie_auth():
            return True
        self.kirim(401, {'ok': False, 'pesan': 'Sesi admin tidak valid. Silakan masuk lagi.'})
        return False

    def route(self):
        return urllib_parse(self.path)

    # ---------- GET ----------
    def do_GET(self):
        jalur = self.route().path
        if jalur in ('/healthz', '/api/healthz'):
            return self.kirim(200, {'ok': True, 'db': os.path.exists(DB_PATH), 'versi': '1.0'})
        if jalur == '/api/data':
            return self.kirim(200, payload())
        if jalur == '/api/session':
            return self.kirim(200, {'authenticated': self.cookie_auth(), 'needsSetup': not has_admin()})
        if jalur.startswith('/api/media/'):
            return self.serve_media(jalur[len('/api/media/'):])
        if jalur in ('/admin', '/admin/', '/admin.html'):
            return self.serve_admin()
        if jalur == '/':
            return self.kirim(302, '', {'Location': '/admin'}, 'text/plain; charset=utf-8')
        self.kirim(404, {'ok': False, 'pesan': 'Tidak ditemukan.'})

    def serve_admin(self):
        if not os.path.exists(ADMIN_PAGE):
            return self.kirim(500, {'ok': False, 'pesan': 'admin.html tidak ada.'})
        with open(ADMIN_PAGE, 'rb') as handle:
            isi = handle.read()
        self.kirim(200, isi, {'Cache-Control': 'no-store'}, 'text/html; charset=utf-8')

    def serve_media(self, nama):
        nama = os.path.basename(urllib_unquote(nama))
        if not re.fullmatch(r'[A-Za-z0-9._-]{1,120}', nama):
            return self.kirim(400, {'ok': False, 'pesan': 'Nama berkas tidak sah.'})
        lokasi = os.path.join(UPLOAD_DIR, nama)
        if not os.path.isfile(lokasi):
            return self.kirim(404, {'ok': False, 'pesan': 'Berkas tidak ada.'})
        tipe = mimetypes.guess_type(nama)[0] or 'application/octet-stream'
        with open(lokasi, 'rb') as handle:
            isi = handle.read()
        self.kirim(200, isi, {'Cache-Control': 'public, max-age=604800'}, tipe)

    # ---------- POST/PUT/DELETE ----------
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        jalur = self.route().path
        try:
            data = self.baca_json()
        except ValueError:
            return self.kirim(400, {'ok': False, 'pesan': 'Isi permintaan bukan JSON yang sah.'})

        if jalur == '/api/setup':
            if has_admin():
                return self.kirim(409, {'ok': False, 'pesan': 'Sandi admin sudah dibuat.'})
            sandi = str(data.get('password') or '')
            if len(sandi) < 8:
                return self.kirim(400, {'ok': False, 'pesan': 'Sandi minimal 8 karakter.'})
            set_password(sandi)
            return self.login_cookie()

        if jalur == '/api/login':
            if not has_admin():
                return self.kirim(409, {'ok': False, 'pesan': 'Buat sandi admin lebih dulu.'})
            if not check_password(str(data.get('password') or '')):
                time.sleep(1.2)
                return self.kirim(401, {'ok': False, 'pesan': 'Sandi salah.'})
            return self.login_cookie()

        if jalur == '/api/logout':
            return self.kirim(200, {'ok': True}, {'Set-Cookie': COOKIE + '=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'})

        if jalur == '/api/upload':
            if not self.butuh_auth():
                return
            return self.simpan_gambar(data)

        if jalur == '/api/items':
            if not self.butuh_auth():
                return
            return self.tambah_item(data)

        cocok = re.fullmatch(r'/api/items/([A-Za-z0-9_-]{1,64})/move', jalur)
        if cocok:
            if not self.butuh_auth():
                return
            return self.geser_item(cocok.group(1), data)

        self.kirim(404, {'ok': False, 'pesan': 'Tidak ditemukan.'})

    def do_PUT(self):
        cocok = re.fullmatch(r'/api/items/([A-Za-z0-9_-]{1,64})', self.route().path)
        if not cocok:
            return self.kirim(404, {'ok': False, 'pesan': 'Tidak ditemukan.'})
        if not self.butuh_auth():
            return
        try:
            data = self.baca_json()
        except ValueError:
            return self.kirim(400, {'ok': False, 'pesan': 'Isi permintaan bukan JSON yang sah.'})
        return self.ubah_item(cocok.group(1), data)

    def do_DELETE(self):
        cocok = re.fullmatch(r'/api/items/([A-Za-z0-9_-]{1,64})', self.route().path)
        if not cocok:
            return self.kirim(404, {'ok': False, 'pesan': 'Tidak ditemukan.'})
        if not self.butuh_auth():
            return
        conn = connect()
        conn.execute('DELETE FROM items WHERE id=?', (cocok.group(1),))
        conn.commit()
        conn.close()
        self.kirim(200, {'ok': True})

    # ---------- aksi ----------
    def login_cookie(self):
        token = make_token()
        self.kirim(200, {'ok': True}, {
            'Set-Cookie': '%s=%s; Path=/; Max-Age=%d; HttpOnly; SameSite=Lax' % (COOKIE, token, SESSION_AGE)
        })

    def simpan_gambar(self, data):
        nama = str(data.get('name') or 'gambar')
        isi = str(data.get('data') or '')
        cocok = re.match(r'data:([\w/+.-]+);base64,(.*)$', isi, re.S)
        if not cocok:
            return self.kirim(400, {'ok': False, 'pesan': 'Format gambar tidak dikenal.'})
        tipe, mentah = cocok.group(1), cocok.group(2)
        if tipe not in ALLOWED_IMAGE:
            return self.kirim(400, {'ok': False, 'pesan': 'Hanya PNG, JPG, atau WebP.'})
        try:
            biner = base64.b64decode(mentah)
        except ValueError:
            return self.kirim(400, {'ok': False, 'pesan': 'Data gambar rusak.'})
        if len(biner) > MAX_IMAGE:
            return self.kirim(413, {'ok': False, 'pesan': 'Gambar lebih dari 6 MB.'})
        ekstensi = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp'}[tipe]
        berkas = time.strftime('%Y%m%d%H%M%S') + '-' + secrets.token_hex(4) + '-' + slug(os.path.splitext(nama)[0]) + ekstensi
        with open(os.path.join(UPLOAD_DIR, berkas), 'wb') as handle:
            handle.write(biner)
        self.kirim(200, {'ok': True, 'url': '/api/media/' + berkas})

    def tambah_item(self, data):
        kind = str(data.get('kind') or '')
        name = str(data.get('name') or '').strip()
        if kind not in KINDS:
            return self.kirim(400, {'ok': False, 'pesan': 'Jenis data tidak dikenal.'})
        if not name:
            return self.kirim(400, {'ok': False, 'pesan': 'Nama wajib diisi.'})
        body = data.get('body') if isinstance(data.get('body'), dict) else {}
        conn = connect()
        nomor = (conn.execute('SELECT MAX(sort) AS n FROM items WHERE kind=?', (kind,)).fetchone()['n'] or 0) + 10
        dasar = kind + '-' + slug(name)
        item_id = dasar
        urut = 2
        while conn.execute('SELECT 1 FROM items WHERE id=?', (item_id,)).fetchone():
            item_id = dasar + '-' + str(urut)
            urut += 1
        conn.execute('INSERT INTO items (id, kind, name, body, sort, enabled, updated) VALUES (?,?,?,?,?,1,?)',
                     (item_id, kind, name, json.dumps(body, ensure_ascii=False), nomor,
                      time.strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()
        conn.close()
        self.kirim(200, {'ok': True, 'id': item_id})

    def ubah_item(self, item_id, data):
        conn = connect()
        row = conn.execute('SELECT * FROM items WHERE id=?', (item_id,)).fetchone()
        if not row:
            conn.close()
            return self.kirim(404, {'ok': False, 'pesan': 'Item tidak ada.'})
        name = str(data.get('name', row['name'])).strip() or row['name']
        body = data.get('body') if isinstance(data.get('body'), dict) else json.loads(row['body'])
        enabled = row['enabled'] if data.get('enabled') is None else (1 if data.get('enabled') else 0)
        conn.execute('UPDATE items SET name=?, body=?, enabled=?, updated=? WHERE id=?',
                     (name, json.dumps(body, ensure_ascii=False), enabled,
                      time.strftime('%Y-%m-%d %H:%M:%S'), item_id))
        conn.commit()
        conn.close()
        self.kirim(200, {'ok': True})

    def geser_item(self, item_id, data):
        arah = -1 if int(data.get('dir', -1)) < 0 else 1
        conn = connect()
        row = conn.execute('SELECT * FROM items WHERE id=?', (item_id,)).fetchone()
        if not row:
            conn.close()
            return self.kirim(404, {'ok': False, 'pesan': 'Item tidak ada.'})
        tetangga = conn.execute(
            'SELECT * FROM items WHERE kind=? AND sort %s ? ORDER BY sort %s LIMIT 1'
            % ('<' if arah < 0 else '>', 'DESC' if arah < 0 else 'ASC'),
            (row['kind'], row['sort'])).fetchone()
        if tetangga:
            conn.execute('UPDATE items SET sort=? WHERE id=?', (tetangga['sort'], row['id']))
            conn.execute('UPDATE items SET sort=? WHERE id=?', (row['sort'], tetangga['id']))
            conn.commit()
        conn.close()
        self.kirim(200, {'ok': True})


def urllib_parse(path):
    from urllib.parse import urlsplit
    return urlsplit(path)


def urllib_unquote(text):
    from urllib.parse import unquote
    return unquote(text)


if __name__ == '__main__':
    init_db()
    server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print('Perumda Studio API siap di port %d (data: %s)' % (PORT, DATA_DIR), flush=True)
    server.serve_forever()
