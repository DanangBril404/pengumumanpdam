const form = document.querySelector('#editor')
/* id unik: crypto.randomUUID() hanya tersedia di secure context (HTTPS/localhost).
   Di akses HTTP biasa (mis. http://192.168.0.20:3003) API itu tidak ada, sehingga
   "Simpan tata letak" gagal tanpa pesan. Fallback di bawah menjaga fitur tetap jalan. */
const uuidAsli = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
  ? crypto.randomUUID.bind(crypto) : null
const buatId = () => (uuidAsli ? uuidAsli()
  : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10))

/* Pilihan font formal untuk setiap blok teks poster. Semua font sistem/web-safe
   agar hasil PNG konsisten tanpa menunggu unduhan font tambahan. */
const formalFonts = {
  dm: { name: 'DM Sans', stack: '"DM Sans", system-ui, sans-serif', group: 'Tanpa kait' },
  manrope: { name: 'Manrope', stack: 'Manrope, system-ui, sans-serif', group: 'Tanpa kait' },
  arial: { name: 'Arial', stack: 'Arial, Helvetica, sans-serif', group: 'Tanpa kait' },
  helvetica: { name: 'Helvetica', stack: 'Helvetica, Arial, sans-serif', group: 'Tanpa kait' },
  tahoma: { name: 'Tahoma', stack: 'Tahoma, Verdana, sans-serif', group: 'Tanpa kait' },
  verdana: { name: 'Verdana', stack: 'Verdana, Geneva, sans-serif', group: 'Tanpa kait' },
  trebuchet: { name: 'Trebuchet MS', stack: '"Trebuchet MS", Tahoma, sans-serif', group: 'Tanpa kait' },
  segoe: { name: 'Segoe UI', stack: '"Segoe UI", Tahoma, sans-serif', group: 'Tanpa kait' },
  georgia: { name: 'Georgia', stack: 'Georgia, "Times New Roman", serif', group: 'Berkait (serif)' },
  times: { name: 'Times New Roman', stack: '"Times New Roman", Times, serif', group: 'Berkait (serif)' },
  cambria: { name: 'Cambria', stack: 'Cambria, Georgia, serif', group: 'Berkait (serif)' },
  garamond: { name: 'Garamond', stack: 'Garamond, "Palatino Linotype", serif', group: 'Berkait (serif)' },
  palatino: { name: 'Palatino', stack: '"Palatino Linotype", "Book Antiqua", Palatino, serif', group: 'Berkait (serif)' },
  bookman: { name: 'Bookman', stack: '"Bookman Old Style", Georgia, serif', group: 'Berkait (serif)' }
}
const fontLabels = {
  title: 'Judul', extra: 'Teks tambahan', note: 'Rincian penyebab',
  area: 'Wilayah terdampak', advice: 'Imbauan pelanggan', adviceTitle: 'Judul imbauan',
  caption1: 'Keterangan media 1', caption2: 'Keterangan media 2'
}
const canvas = document.querySelector('#poster')
const ctx = canvas.getContext('2d')
const status = document.querySelector('#status')
let agency = 'Perumda Air Minum Kota Magelang'
/* Identitas dari back office (menu “Identitas & Video”): logo & backsound video. */
let logoKustom = ''
let backsoundUrl = ''
let backsoundNama = ''
/* Gaya huruf per aset/tabel: ukuran (%), warna, dan outline. Disimpan di localStorage. */
let gayaAset = readStorage('kabar-air-gaya-aset', {}) || {}
let gayaAktif = null
const WARNA_OUTLINE_BAWAAN = '#0b2943'
const gayaBawaan = { size: 100, color: '', outline: false, outlineColor: WARNA_OUTLINE_BAWAAN, outlineWidth: 2 }

function gayaUntuk(id) {
  const simpan = (id && gayaAset[id]) || {}
  return Object.assign({}, gayaBawaan, simpan)
}

function simpanGayaAset() {
  storeLocal('kabar-air-gaya-aset', gayaAset)
}

/* Sekali jalan: buang outline bawaan lama pada Wilayah Terdampak. */
if (readStorage('kabar-air-gaya-versi', '') !== '2') {
  if (gayaAset.areas) delete gayaAset.areas.outline
  storeLocal('kabar-air-gaya-versi', '2')
  simpanGayaAset()
}

function skalaHuruf(id) {
  const nilai = Number(gayaUntuk(id).size)
  return Math.max(0.5, Math.min(2, (Number.isFinite(nilai) ? nilai : 100) / 100))
}

function outlineTeks(teks, x, y, gaya) {
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = Math.max(1, Number(gaya.outlineWidth) || 2) * 2
  ctx.strokeStyle = gaya.outlineColor || WARNA_OUTLINE_BAWAAN
  ctx.strokeText(teks, x, y)
}
const socials = [
  'Instagram  @perumdamkotamagelang.official',
  'Facebook  pdamkotamagelang.official',
  'X  Perumda Air Minum Kota Magelang',
  'WhatsApp  0857-0047-4001'
]
const sampleAreas = [
  'Kelurahan Tidar Utara', 'Kelurahan Tidar Selatan', 'Kelurahan Magersari',
  'Kelurahan Jurangombo Utara', 'Kelurahan Jurangombo Selatan', 'Kelurahan Cacaban',
  'Kelurahan Rejowinangun Utara', 'Kelurahan Rejowinangun Selatan', 'Kelurahan Kemirirejo',
  'Melati Purna dan sekitarnya', 'Perum Lembah Hijau', 'RSUD Kota Magelang'
]
const previousCauses = {
  pln: {
    title: 'Gangguan Listrik PLN',
    note: 'Pemeliharaan jaringan listrik oleh ULTG di Gardu Induk Sanggrahan, Kota Magelang, menyebabkan aliran air dari Mata Air Tuk Pecah terganggu sementara.'
  },
  leak: {
    title: 'Kebocoran Pipa',
    note: 'Perbaikan kebocoran pipa distribusi sedang dilakukan. Aliran air di wilayah terdampak dapat berkurang atau terhenti sementara.'
  },
  electrical: {
    title: 'Perbaikan Panel Listrik',
    note: 'Perbaikan panel listrik pada fasilitas distribusi air sedang dilakukan. Aliran air di wilayah terdampak dapat berkurang atau terhenti sementara.'
  },
  other: { title: 'Penyebab Lainnya', note: '' }
}
const example = {
  type: 'Gangguan Aliran Air',
  customTitle: '',
  titleScale: '100',
  causeTitle: '',
  cause: '',
  area: sampleAreas.join('\n'),
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  finishMode: 'scheduled',
  note: '',
  advice: 'Pelanggan di wilayah terdampak diimbau menampung air secukupnya untuk kebutuhan rumah tangga.',
  adviceTitle: 'IMBAUAN PELANGGAN',
  adviceScale: '100',
  docX: '',
  docY: '',
  photoLayout: '0',
  caption1: '',
  caption2: ''
}
const storageKey = 'kabar-air-studio-draft'
let template = defaultTemplate
let fonts = {}
let baseColor = ''
let activeFont = formalFonts.dm.stack
let customBackground = null
let manualImage = null
let posterScale = 1
let previewZoom = 100
/* Ukuran poster: preset + ukuran bebas (lebar & tinggi bisa diatur sendiri). */
const sizePresets = {
  /* Ukuran tetap: isi poster yang menyesuaikan, bukan ukurannya. */
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  custom: { width: 1080 }
}
const WIDTH_MIN = 720, WIDTH_MAX = 1620
const HEIGHT_MIN = 960, HEIGHT_MAX = 2600
let posterSize = 'portrait'
let posterWidth = 1080
let posterHeight = 1350
let posterHeightAuto = false
let docBounds = null
const photoDrag = document.querySelector('#photo-drag')
const documentationWidth = 840
const photos = [null, null]
/* Slot foto yang sedang memutar video (dipakai saat merekam video). */
const videoSlots = []
/* Alamat MP3 terpilih untuk backsound video (kosong = tanpa backsound). */
let backsoundDipilih = ''
let daftarBacksound = []
const posterWrap = document.querySelector('#poster-wrap')
const repairSpray = document.querySelector('#repair-spray')
const motion = document.querySelector('#motion')
const motionControl = document.querySelector('#motion-control')
const iconPaths = socialIcons.map(icon => new Path2D(icon.data))
let draft = null
try { draft = JSON.parse(localStorage.getItem(storageKey)) } catch {}
fonts = draft?.fonts && typeof draft.fonts === 'object' ? { ...draft.fonts } : {}
baseColor = typeof draft?.baseColor === 'string' ? draft.baseColor : ''
let blockPositions = draft?.blockPositions || {}
/* Posisi awal tiap preset. `square` = susunan tetap Master (dua kolom: rincian/jadwal/imbauan
   di kiri, wilayah terdampak di kanan). Nilai x dalam ruang 1080, y dalam satuan logika render. */
const presetPositions = {
  square: {
    cause: { x: 57, y: 590 },
    schedule: { x: 57, y: 807 },
    areas: { x: 571, y: 635 },
    advice: { x: 56, y: 1048 }
  }
}
let blockPositionsByPreset = draft?.blockPositionsByPreset && typeof draft.blockPositionsByPreset === 'object'
  ? draft.blockPositionsByPreset : {}
function applyPresetPositions(size) {
  const saved = blockPositionsByPreset[size] ?? presetPositions[size] ?? {}
  blockPositions = structuredClone(saved)
}
/* Atur ulang: buang geseran pengguna, kembali ke posisi awal bawaan preset. */
function resetPresetPositions(size) {
  delete blockPositionsByPreset[size]
  blockPositions = structuredClone(presetPositions[size] || {})
}
const hiddenLayers = new Set(draft?.hiddenLayers || [])
const decorationNames = {
  waves: 'Kran Krom & Arus Air', ripples: 'Menara Air & Katup', drops: 'Percikan Air Jernih',
  river: 'Kran Kuningan', pipes: 'Jaringan Pipa PDAM'
}
const legacyDecoration = draft?.values?.waterSilhouette || 'waves'
let decorationLayers = draft?.decorationLayers ?? (legacyDecoration === 'none' ? [] : [{
  id: 'silhouette', type: legacyDecoration, width: Number(draft?.values?.decorationWidth) || 100,
  ...(legacyDecoration === 'custom' ? { sourceKey: 'kabar-air-custom-decoration', name: 'Hiasan sendiri' } : {})
}])
let selectedDecorationId = decorationLayers.at(-1)?.id
const ornamentGalleryKey = 'kabar-air-ornament-gallery'
let ornamentTemplates = readStorage(ornamentGalleryKey, [
  ...Object.keys(decorationNames).map(type => ({ id: type, type, name: decorationNames[type] })),
  ...decorationLayers.filter(layer => layer.type === 'custom').map(layer => ({
    id: layer.id, type: layer.type, name: layer.name, sourceKey: layer.sourceKey
  }))
])
const savedLayoutsKey = 'kabar-air-poster-layouts'
let savedLayouts = readStorage(savedLayoutsKey, [])

const magnetButton = document.querySelector('#magnet')
const snapX = document.querySelector('#snap-x')
const snapY = document.querySelector('#snap-y')
let magnetEnabled = draft?.magnetEnabled === true
magnetButton.setAttribute('aria-pressed', String(magnetEnabled))

function clearSnapGuides() {
  snapX.hidden = snapY.hidden = true
}

magnetButton.addEventListener('click', () => {
  magnetEnabled = !magnetEnabled
  magnetButton.setAttribute('aria-pressed', String(magnetEnabled))
  clearSnapGuides()
  save()
})

function snapAxis(position, size, targets, threshold, min, max) {
  let result = position
  let guide = null
  let distance = threshold
  for (const target of targets) {
    for (const anchor of [0, size / 2, size]) {
      const candidate = target - anchor
      const difference = Math.abs(candidate - position)
      if (candidate < min || candidate > max || difference >= distance) continue
      result = candidate
      guide = target
      distance = difference
    }
  }
  return { position: result, guide }
}

function snapPosterPosition(id, x, y, box, limits) {
  if (!magnetEnabled) return { x, y }
  const width = layoutWidth
  const height = canvas.height / posterScale
  const horizontal = [0, 64, width / 2, width - 64, width]
  const vertical = [0, 64, height / 2, height - 64, height]
  const others = [...posterBlocks.entries()].filter(([key, entry]) => key !== id && entry.bounds)
    .map(([, entry]) => entry.bounds)
  if (id !== 'photos' && docBounds) others.push(docBounds)
  for (const item of others) {
    horizontal.push(item.x, item.x + item.width / 2, item.x + item.width)
    vertical.push(item.y, item.y + item.height / 2, item.y + item.height)
  }
  const threshold = 8 * canvas.width / (canvas.getBoundingClientRect().width * posterScale)
  const sx = snapAxis(x, box.width, horizontal, threshold, limits.minX, limits.maxX)
  const sy = snapAxis(y, box.height, vertical, threshold, limits.minY, limits.maxY)
  snapX.hidden = sx.guide === null
  snapY.hidden = sy.guide === null
  if (!snapX.hidden) snapX.style.left = ((canvas.width - width * posterScale) / 2 + sx.guide * posterScale) / canvas.width * 100 + '%'
  if (!snapY.hidden) snapY.style.top = sy.guide * posterScale / canvas.height * 100 + '%'
  return { x: sx.position, y: sy.position }
}

const posterBlocks = new Map()
const blockSizeKey = 'kabar-air-block-size'
const lockedKey = 'kabar-air-locked-layers'
let blockSizes = readStorage(blockSizeKey, {})
let lockedLayers = new Set(readStorage(lockedKey, []))

/* Lebar/tinggi kotak aset terpilih (persen dari ukuran aslinya). Hanya kotak
   aset yang berubah; ukuran huruf tetap karena tidak ada penskalaan kanvas. */
function ukuranBlok(id) {
  const nilai = blockSizes[id] || {}
  const lebar = Number(nilai.w)
  const tinggi = Number(nilai.h)
  return {
    w: lebar >= 30 && lebar <= 220 ? lebar : 100,
    h: tinggi >= 30 && tinggi <= 220 ? tinggi : 100
  }
}

function aturUkuranBlok(id, sumbu, nilai) {
  const batas = Math.max(30, Math.min(220, Number(nilai) || 100))
  const next = { ...ukuranBlok(id), [sumbu]: batas }
  if (next.w === 100 && next.h === 100) delete blockSizes[id]
  else blockSizes[id] = next
  storeLocal(blockSizeKey, blockSizes)
}

function kotakBlok(id, w, h) {
  const ukuran = ukuranBlok(id)
  return { w: Math.round(w * ukuran.w / 100), h: Math.round(h * ukuran.h / 100) }
}

function simpanKunci() {
  storeLocal(lockedKey, [...lockedLayers])
}
const movableLabels = {
  logo: 'Logo Perumda', agency: 'Nama perusahaan',
  banner: 'Label informasi layanan air', title: 'Judul pengumuman',
  extra: 'Teks tambahan judul', cause: 'Penyebab gangguan', schedule: 'Jadwal pekerjaan',
  areas: 'Wilayah terdampak', advice: 'Imbauan pelanggan', socials: 'Media sosial'
}
function registerPosterBlock(id, name, decorative = false) {
  const handle = document.createElement('button')
  handle.type = 'button'
  handle.className = 'poster-handle' + (decorative ? ' decor' : '')
  handle.hidden = true
  handle.setAttribute('aria-label', 'Pindahkan ' + name + ' dengan menarik atau tombol panah')
  posterWrap.append(handle)
  posterBlocks.set(id, { handle, bounds: null })
  let drag = null
  let bergerak = false
  function move(x, y) {
    blockPositions[id] = { x: x * 1080 / layoutWidth, y }
    render()
  }
  handle.addEventListener('pointerdown', event => {
    const bounds = posterBlocks.get(id).bounds
    if (!bounds || drag || event.button !== 0) return
    bergerak = false
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, bounds }
    handle.setPointerCapture(event.pointerId)
  })
  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return
    if (Math.abs(event.clientX - drag.x) > 3 || Math.abs(event.clientY - drag.y) > 3) bergerak = true
    const scale = canvas.width / (canvas.getBoundingClientRect().width * posterScale)
    const position = snapPosterPosition(id, drag.bounds.x + (event.clientX - drag.x) * scale,
      drag.bounds.y + (event.clientY - drag.y) * scale, drag.bounds,
      posterBlockLimits(drag.bounds.width, drag.bounds.height))
    move(position.x, position.y)
  })
  /* Klik (tanpa geser) memilih layer aset ini dan menggulir panel kiri ke kolom editnya. */
  handle.addEventListener('click', () => { if (!bergerak) pilihAset(id) })
  handle.addEventListener('lostpointercapture', () => {
    drag = null
    clearSnapGuides()
    save()
  })
  handle.addEventListener('keydown', event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
    const bounds = posterBlocks.get(id).bounds
    if (!direction || !bounds) return
    event.preventDefault()
    const step = event.shiftKey ? 32 : 8
    move(bounds.x + direction[0] * step, bounds.y + direction[1] * step)
    save()
  })
}

for (const [id, name] of Object.entries(movableLabels)) registerPosterBlock(id, name)
for (const layer of decorationLayers) registerPosterBlock(layer.id, layer.name || decorationNames[layer.type], true)

function posterBlockLimits(width, height) {
  const extraX = layoutWidth - width
  const extraY = canvas.height / posterScale - height
  return {
    minX: Math.min(0, extraX), maxX: Math.max(0, extraX),
    minY: Math.min(0, extraY), maxY: Math.max(0, extraY)
  }
}

function renderBlock(id, x, y, width, height, draw) {
  if (hiddenLayers.has(id)) return
  const entry = posterBlocks.get(id)
  const transform = ctx.getTransform()
  const baseY = y + transform.f / posterScale
  const saved = blockPositions[id]
  const limits = posterBlockLimits(width, height)
  const savedX = saved ? saved.x * layoutWidth / 1080 : null
  const nextX = saved ? Math.max(limits.minX, Math.min(limits.maxX, savedX)) : x
  const nextY = saved ? Math.max(limits.minY, Math.min(limits.maxY, saved.y)) : baseY
  /* Kotak sentuh mengikuti ukuran blok apa adanya (lebar/tinggi kotak diatur
     lewat panel "Ukuran kotak aset terpilih", bukan penskalaan kanvas). */
  const kotakX = nextX
  const kotakY = nextY
  entry.naturalWidth = width
  entry.naturalHeight = height
  entry.bounds = { x: kotakX, y: kotakY, width, height }
  const style = entry.handle.style
  const left = transform.e + kotakX * posterScale
  const top = kotakY * posterScale
  style.left = Math.max(0, left) / canvas.width * 100 + '%'
  style.top = Math.max(0, top) / canvas.height * 100 + '%'
  style.width = (Math.min(canvas.width, left + width * posterScale) - Math.max(0, left)) / canvas.width * 100 + '%'
  style.height = (Math.min(canvas.height, top + height * posterScale) - Math.max(0, top)) / canvas.height * 100 + '%'
  entry.handle.hidden = lockedLayers.has(id)
  ctx.save()
  ctx.translate(nextX - x, nextY - baseY)
  const gayaSebelumnya = gayaAktif
  gayaAktif = id
  draw()
  gayaAktif = gayaSebelumnya
  ctx.restore()
}

let logo = null

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function storeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    status.textContent = 'Penyimpanan browser tidak tersedia atau penuh.'
    return false
  }
}

const defaultCauses = Object.entries(previousCauses).map(([id, { title }]) => ({ id, title, text: '' }))
let causes = readStorage('kabar-air-cause-presets', defaultCauses)
function selectedCause(id) {
  return causes.find(cause => cause.id === id)
}

function locations(value) {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
}

function populate(values) {
  const [startDate, startTime] = (values?.start || '').split('T')
  const [endDate, endTime] = (values?.end || '').split('T')
  const restored = { startDate, startTime, endDate, endTime, ...values }
  for (const [key, value] of Object.entries(example)) {
    form.elements[key].value = typeof restored[key] === 'string' ? restored[key] : value
  }
  populateCauseOptions(form.elements.cause.value)
}

function fields() {
  const values = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]))
  values.endDate = form.elements.endDate.value
  values.endTime = form.elements.endTime.value
  return values
}

function displayDate(day) {
  if (!day) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(day + 'T12:00:00Z'))
}

function displayTime(time) {
  return time ? time.replace(':', '.') + ' WIB' : ''
}

function scheduleText(day, time) {
  return [displayDate(day), displayTime(time)].filter(Boolean).join(' • ') || 'Belum diinformasikan'
}

function drawSchedule(day, time, x, y, dark, bright, until = false, maxWidth = 430) {
  const sk = skalaHuruf('schedule')
  if (until) {
    labelFit('SAMPAI SELESAI', x, y + Math.round(100 * sk), 36, dark, 800, maxWidth)
    return
  }
  const date = displayDate(day)
  const hour = displayTime(time)
  labelFit(date || (!hour ? 'Belum diinformasikan' : ''), x, y + Math.round(79 * sk), 29, dark, 700, maxWidth)
  if (hour) labelFit(hour, x, date ? y + Math.round(126 * sk) : y + Math.round(100 * sk), 41, bright, 800, maxWidth)
}

function fontStack(key) {
  return (formalFonts[fonts[key]] || formalFonts.dm).stack
}

function setFont(key) {
  activeFont = key ? fontStack(key) : formalFonts.dm.stack
}

function typeface(size, weight) {
  ctx.font = weight + ' ' + size + 'px ' + activeFont
}

function label(text, x, y, size, color, weight = 700) {
  const gaya = gayaAktif ? gayaUntuk(gayaAktif) : null
  if (gaya) size = Math.max(6, Math.round(size * skalaHuruf(gayaAktif)))
  typeface(size, weight)
  if (gaya && gaya.outline) outlineTeks(text, x, y, gaya)
  ctx.fillStyle = gaya && gaya.color ? gaya.color : color
  ctx.fillText(text, x, y)
}

/* Tulis satu baris; huruf dikecilkan bertahap agar tidak melewati lebar kotak. */
function labelFit(text, x, y, size, color, weight, maxWidth) {
  const gaya = gayaAktif ? gayaUntuk(gayaAktif) : null
  let ukuran = gaya ? Math.max(6, Math.round(size * skalaHuruf(gayaAktif))) : size
  typeface(ukuran, weight)
  while (ukuran > 15 && ctx.measureText(text).width > maxWidth) {
    ukuran -= 1
    typeface(ukuran, weight)
  }
  if (gaya && gaya.outline) outlineTeks(text, x, y, gaya)
  ctx.fillStyle = gaya && gaya.color ? gaya.color : color
  ctx.fillText(text, x, y)
}

function rounded(x, y, w, h, r, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function wrap(text, width) {
  const lines = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? line + ' ' + word : word
      if (ctx.measureText(next).width <= width) {
        line = next
        continue
      }
      if (line) lines.push(line)
      line = ''
      for (const char of word) {
        if (ctx.measureText(line + char).width > width) {
          lines.push(line)
          line = ''
        }
        line += char
      }
    }
    lines.push(line)
  }
  return lines
}

function block(text, x, y, width, lineLimit, size, color, weight = 600) {
  const gaya = gayaAktif ? gayaUntuk(gayaAktif) : null
  if (gaya) size = Math.max(6, Math.round(size * skalaHuruf(gayaAktif)))
  let lines
  do {
    typeface(size, weight)
    lines = wrap(text, width)
    if (lines.length <= lineLimit) break
    size -= 1
  } while (size > 10)
  const warna = gaya && gaya.color ? gaya.color : color
  ctx.fillStyle = warna
  lines.forEach((line, index) => {
    const barisY = y + index * size * 1.23
    if (gaya && gaya.outline) outlineTeks(line, x, barisY, gaya)
    ctx.fillStyle = warna
    ctx.fillText(line, x, barisY)
  })
}

function drawSocial(index, handle, x, y, width) {
  const icon = socialIcons[index]
  const colors = ['#a92578', '#155ac9', '#131620', '#11854b']
  rounded(x, y - 23, 32, 32, 9, colors[index])
  const scale = 19 / Math.max(icon.width, icon.height)
  ctx.save()
  ctx.translate(x + (32 - icon.width * scale) / 2, y - 7 - icon.height * scale / 2)
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fill(iconPaths[index])
  ctx.restore()
  block(handle, x + 43, y, width - 43, 1, 22, '#ffffff', 600)
}

function drawPhoto(image, x, y, width, height, index) {
  rounded(x, y, width, height, 22, '#e9f4fe')
  if (!image) {
    ctx.textAlign = 'center'
    label('Media pekerjaan ' + (index + 1), x + width / 2, y + height / 2 + 9, 28, '#294b6e')
    ctx.textAlign = 'start'
    return
  }
  const sumber = image.video || image
  /* Slot video diingat supaya saat merekam tiap frame video digambar ulang. */
  if (image.video) videoSlots.push({ video: image.video, x, y, width, height })
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 22)
  ctx.clip()
  coverImage(ctx, sumber, x, y, width, height)
  ctx.restore()
}

function drawDocumentation(f, x, y, count, height, repair, accent, docWidth = documentationWidth) {
  const width = count === 1 ? docWidth : (docWidth - 18) / 2
  rounded(x, y, 360, 32, 8, '#082137')
  if (repair) {
    ctx.fillStyle = '#ffd066'
    ctx.fillRect(x + 7, y + 5, 5, 22)
    label('DOKUMENTASI LAPANGAN', x + 18, y + 22, 25, '#ffffff', 800)
  } else {
    label('DOKUMENTASI PEKERJAAN', x + 11, y + 20, 24, accent)
  }
  for (let index = 0; index < count; index++) {
    const photoX = x + index * (width + 18)
    const top = y + 35
    const caption = f['caption' + (index + 1)]
    const captionHeight = repair || caption ? 62 : 0
    if (captionHeight) rounded(photoX, top, width, height, 22, '#082137')
    drawPhoto(photos[index], photoX, top, width, height - captionHeight, index)
    if (captionHeight) {
      if (repair) rounded(photoX + 19, top + height - 46, 44, 29, 7, '#ffd066')
      if (repair) label(String(index + 1).padStart(2, '0'), photoX + 29, top + height - 25, 17, '#17283c', 800)
      const inset = repair ? 76 : 24
      setFont('caption' + (index + 1))
      block(caption || 'Media pekerjaan ' + (index + 1), photoX + inset, top + height - 24,
        width - inset - 22, 1, 23, '#ffffff', 600)
    }
  }
  setFont()
}

function drawAdvice(f, x, y, lines, fontSize, height, dark, width = 840, title = '') {
  rounded(x, y, width, height, 22, '#fff0bb')
  rounded(x + 18, y + 17, 53, 53, 13, dark)
  ctx.save()
  ctx.translate(x + 26, y + 24)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(4, 13)
  ctx.lineTo(17, 13)
  ctx.lineTo(31, 5)
  ctx.lineTo(31, 30)
  ctx.lineTo(17, 23)
  ctx.lineTo(13, 23)
  ctx.lineTo(16, 34)
  ctx.lineTo(10, 34)
  ctx.lineTo(7, 23)
  ctx.lineTo(4, 23)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.rect(x + 8, y + 6, width - 16, height - 12)
  ctx.clip()
  setFont('adviceTitle')
  labelFit(title || 'IMBAUAN PELANGGAN', x + 90, y + 32, 19, dark, 800, width - 112)
  setFont('advice')
  const langkahImbauan = Math.round((fontSize + 7) * skalaHuruf('advice'))
  lines.forEach((line, index) => label(line, x + 90, y + 67 + index * langkahImbauan, fontSize, dark, 700))
  ctx.restore()
}

/* Lebar tata letak kolom isi: 1080 = desain asli. Saat poster dilebarkan atau
   dipendekkan, kolom isi melebar dan — pada poster lebar — blok isi disusun dua
   kolom agar isi memenuhi kanvas tanpa pita kosong. */
let layoutWidth = 1080

function measureLayout(f, LW, repair) {
  const PAD = 64
  const IW = LW - PAD * 2
  const wide = LW >= 1400
  const gap = 36
  const colW = Math.round((IW - gap) / 2)
  const textW = wide ? colW : IW
  const cause = selectedCause(f.cause)
  const title = f.customTitle || (f.type === 'Judul Sendiri' ? 'Gangguan Aliran Air' : f.type) || example.type
  const titleSize = Math.round((repair ? 64 : 61) * Number(f.titleScale) / 100)
  const titleWidth = repair ? Math.min(wide ? textW - 20 : 620, IW) : textW - 2
  const heading = repair && !f.customTitle && f.type === example.type && cause
    ? title + '\n' + (f.causeTitle || cause.title) : title
  setFont('title')
  typeface(titleSize, 800)
  const titleLines = wrap(heading, titleWidth)
  const titleStep = Math.round(titleSize * 1.12 * skalaHuruf('title'))
  const titleY = repair ? 311 : 286
  const titleEnd = titleY + (titleLines.length - 1) * titleStep
  const extraSize = repair ? 31 : 28
  const skExtra = skalaHuruf('extra')
  setFont('extra')
  typeface(Math.round(extraSize * skExtra), 700)
  const extraWidth = wide ? textW - 2 : (repair ? Math.min(800, IW) : IW - 2)
  const extraLines = f.titleExtra ? wrap(f.titleExtra, extraWidth) : []
  const extraY = Math.max(repair ? 450 : 316, titleEnd + extraSize + 12)
  const extraEnd = extraLines.length ? extraY + (extraLines.length - 1) * Math.round((extraSize + 8) * skExtra) : titleEnd
  const underline = Math.max(436, extraEnd + 23)
  const shift = repair ? repairHeroOffset + Math.max(0, underline - 500) : Math.max(0, extraEnd - 300)
  const photoCount = hiddenLayers.has('photos') ? 0 : Number(f.photoLayout)
  const photoHeight = repair ? (photoCount === 1 ? 455 : 394) : (photoCount === 1 ? 355 : 320)
  const photoSpace = photoCount ? photoHeight + 64 : 0
  const areas = locations(f.area)
  const skArea = skalaHuruf('areas')
  setFont('area')
  typeface(Math.round(27 * skArea), 600)
  const areaBoxW = wide ? colW : IW
  const columns = areas.length >= 6 && areaBoxW >= 520 ? 2 : 1
  const areaWidth = columns === 2 ? Math.round(areaBoxW / 2 - 37) : areaBoxW - 52
  const areaLines = (areas.length ? areas : ['Belum diinformasikan']).map(area => wrap(area, areaWidth - 32))
  const split = columns === 2 ? Math.ceil(areaLines.length / 2) : areaLines.length
  const left = areaLines.slice(0, split)
  const right = areaLines.slice(split)
  const barisWilayahTinggi = Math.round(34 * skArea)
  const heightOf = group => group.reduce((sum, lines) => sum + lines.length * barisWilayahTinggi + 8, 0)
  const areaHeight = Math.max(heightOf(left), heightOf(right))
  const adviceSize = Math.round(28 * Number(f.adviceScale) / 100)
  const skAdvice = skalaHuruf('advice')
  setFont('advice')
  typeface(Math.round(adviceSize * skAdvice), 700)
  const adviceWrap = wide ? colW - 130 : Math.round(IW * .762)
  const adviceLines = f.advice ? wrap(f.advice, adviceWrap) : []
  const adviceHeight = adviceLines.length
    ? 85 + (adviceLines.length - 1) * Math.round((adviceSize + 7) * skAdvice) : 0
  const adviceSpace = adviceHeight ? adviceHeight + 23 : 0
  const footerHeight = 100
  /* Tinggi kotak Penyebab & Jadwal ikut membesar bila ukuran hurufnya dinaikkan,
     supaya isi tidak terpotong; blok di bawahnya bergeser sebesar selisihnya. */
  const hCause = Math.round(172 * skalaHuruf('cause'))
  const hSchedule = Math.round(162 * skalaHuruf('schedule'))
  const deltaTabel = (hCause - 172) + (hSchedule - 162)
  let blocks, naturalHeight, bodyBottom
  if (wide) {
    const bodyTop = Math.max(repair ? 545 : 380, extraEnd + 36)
    const rightX = PAD + colW + gap
    const ySchedule = bodyTop + hCause + 18
    const yAdvice = ySchedule + hSchedule + 18
    blocks = {
      cause: { x: PAD, y: bodyTop, w: colW, h: hCause },
      schedule: { x: PAD, y: ySchedule, w: colW, h: hSchedule },
      advice: { x: PAD, y: yAdvice, w: colW, h: adviceHeight },
      areas: { x: rightX, y: bodyTop, w: colW, h: areaHeight + 76 }
    }
    bodyBottom = Math.max(yAdvice + adviceHeight, bodyTop + areaHeight + 76)
    naturalHeight = bodyBottom + photoSpace + footerHeight + 148
  } else {
    const yArea = 650 + deltaTabel
    blocks = {
      cause: { x: PAD, y: 325, w: IW, h: hCause },
      schedule: { x: PAD, y: 325 + hCause + 19, w: IW, h: hSchedule },
      areas: { x: PAD, y: yArea, w: IW, h: areaHeight + 76 },
      advice: { x: PAD + 56, y: 0, w: Math.round(IW * .882), h: adviceHeight }
    }
    bodyBottom = yArea + areaHeight + 76 + shift + adviceSpace
    naturalHeight = yArea + areaHeight + 76 + footerHeight + 148 + photoSpace + shift + adviceSpace
  }
  return { PAD, IW, wide, colW, gap, titleSize, titleWidth, titleLines, titleStep, titleY, titleEnd,
    extraSize, extraLines, extraWidth, extraY, extraEnd, underline, shift, photoCount, photoHeight,
    photoSpace, areas, columns, areaWidth, areaLines, left, right, areaHeight, adviceSize, adviceLines,
    adviceHeight, adviceSpace, footerHeight, blocks, naturalHeight, bodyBottom }
}

/* Bila lebar/tinggi kotak tabel diubah, teks dibungkus ulang mengikuti lebar
   kotak baru — ukuran huruf tetap sama, hanya jumlah baris yang menyesuaikan. */
function barisImbauan(f, lebar, ukuran) {
  if (!f.advice) return []
  setFont('advice')
  typeface(Math.round(ukuran * skalaHuruf('advice')), 700)
  return wrap(f.advice, Math.max(140, lebar - 112))
}

function barisWilayah(geo, lebar) {
  setFont('area')
  typeface(Math.round(27 * skalaHuruf('areas')), 600)
  const kolom = geo.columns === 2 && lebar >= 520 ? 2 : 1
  const lebarIsi = kolom === 2 ? Math.round(lebar / 2 - 37) : lebar - 52
  const daftar = (geo.areas.length ? geo.areas : ['Belum diinformasikan'])
    .map(area => wrap(area, Math.max(90, lebarIsi - 32)))
  const split = kolom === 2 ? Math.ceil(daftar.length / 2) : daftar.length
  return { left: daftar.slice(0, split), right: daftar.slice(split), columns: kolom }
}

function drawCauseBox(cause, note, x, y, w, dark, causeTitle = '', h = 172) {
  rounded(x, y, w, h, 23, '#fff0bb')
  setFont('note')
  ctx.save()
  ctx.beginPath()
  ctx.rect(x + 10, y + 8, w - 20, Math.max(10, h - 16))
  ctx.clip()
  block(causeTitle || cause?.title || 'Rincian Pengumuman', x + 30, y + 46, w - 62, 1, 32, dark, 800)
  block(note.replace(/\s+/g, ' ') || 'Belum diinformasikan', x + 30, y + 85, w - 62, 3, 25, dark, 600)
  ctx.restore()
}

function drawScheduleBox(f, x, y, w, dark, bright, h = 162) {
  rounded(x, y, w, h, 23, '#ffffff')
  const mid = x + Math.round(w / 2)
  ctx.fillStyle = '#d8e7f0'
  ctx.fillRect(mid, y + 23, 2, Math.max(60, h - 47))
  label('MULAI PEKERJAAN', x + 30, y + 37, 21, bright)
  label('PERKIRAAN SELESAI', mid + 30, y + 37, 21, bright)
  const half = Math.round(w / 2) - 48
  ctx.save()
  ctx.beginPath()
  ctx.rect(x + 10, y + 8, w - 20, Math.max(10, h - 16))
  ctx.clip()
  drawSchedule(f.startDate, f.startTime, x + 30, y, dark, bright, false, half)
  drawSchedule(f.endDate, f.endTime, mid + 30, y, dark, bright, f.finishMode === 'until', half)
  ctx.restore()
}

function drawAreasBox(geo, x, y, w, accent, bright, dark, h = geo.areaHeight + 31, kolom = null) {
  const groups = kolom || { left: geo.left, right: geo.right, columns: geo.columns }
  label('WILAYAH TERDAMPAK', x + 1, y + 27, 26, accent)
  rounded(x, y + 45, w, h, 22, '#ffffff')
  setFont('area')
  const columnX = groups.columns === 2 ? [x + 29, x + Math.round(w / 2) + 16] : [x + 29]
  ctx.save()
  ctx.beginPath()
  ctx.rect(x + 8, y + 50, w - 16, Math.max(10, h - 12))
  ctx.clip()
  for (const [index, group] of [groups.left, groups.right].entries()) {
    if (!columnX[index]) continue
    const sk = skalaHuruf('areas')
    let rowY = y + 81
    for (const lines of group) {
      label('•', columnX[index], rowY, 27, bright)
      for (const line of lines) {
        label(line, columnX[index] + Math.round(27 * sk), rowY, 27, dark, 600)
        rowY += Math.round(34 * sk)
      }
      rowY += 8
    }
  }
  ctx.restore()
}

function render() {
  const f = fields()
  videoSlots.length = 0
  for (const entry of posterBlocks.values()) entry.bounds = null
  const backdrop = Object.hasOwn(backdrops, template) ? backdrops[template] : backdrops[defaultTemplate]
  const [dark, bright, accent] = backdrop.colors
  const repair = Object.hasOwn(backdrops, template)
  const showArtwork = !hiddenLayers.has('artwork')
  const animate = repair && showArtwork && backdrop.animation === 'water'
  const cause = selectedCause(f.cause)
  const preset = sizePresets[posterSize] || sizePresets.custom
  const width = Math.round(Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, Number(posterWidth) || 1080)))
  let geo = measureLayout(f, 1080, repair)
  let height
  if (posterHeightAuto) {
    height = Math.round((geo.naturalHeight + 48) * width / 1080)
  } else {
    height = Math.round(Math.max(HEIGHT_MIN, Math.min(HEIGHT_MAX, Number(posterHeight) || 1350)))
  }
  height = Math.max(320, height)
  /* Bila isi desain asli tidak muat, kolom isi dilebarkan (teks melebar, huruf
     menyesuaikan); pada poster lebar blok isi otomatis disusun dua kolom. */
  let LW = 1080
  if (geo.naturalHeight * width / 1080 > height + 1) {
    for (const candidate of [1160, 1250, 1350, 1420, 1500, 1580, 1660, 1750, 1850, 1950, 2100, 2250, 2400, 2600]) {
      if (candidate > Math.max(width * 1.8, 1500)) break
      const coba = measureLayout(f, candidate, repair)
      if (coba.naturalHeight * width / candidate <= height) { LW = candidate; geo = coba; break }
    }
  }
  layoutWidth = LW
  const naturalHeight = geo.naturalHeight
  posterScale = Math.max(0.3, Math.min(width / LW, height / naturalHeight))
  const spacing = Math.floor(Math.max(0, height / posterScale - naturalHeight) / 4)
  const offset = (width - LW * posterScale) / 2
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const zoom = previewZoom / 100
  const lebarMaks = (570 * width / 1080 * zoom).toFixed(0) + 'px'
  const gayaStage = getComputedStyle(stageEl)
  const padStage = parseFloat(gayaStage.paddingTop) + parseFloat(gayaStage.paddingBottom)
  const ruangTinggi = Math.max(240, window.innerHeight - stageEl.getBoundingClientRect().top - padStage - 10)
  const tinggiMaks = Math.round(ruangTinggi * width / height * zoom) + 'px'
  posterWrap.style.width = zoom > 1 ? 'min(' + lebarMaks + ', ' + tinggiMaks + ')' : 'min(100%, ' + lebarMaks + ', ' + tinggiMaks + ')'
  repairSpray.style.setProperty('--spray-top', (429 * posterScale / height * 100) + '%')
  motionControl.hidden = !animate
  repairSpray.hidden = !animate || !motion.checked
  document.querySelector('#poster-size').textContent = canvas.width + ' × ' + height + ' px'
  canvas.setAttribute('aria-label', announcement(f))
  paintBackdrop(ctx, height, backdrop, showArtwork ? customBackground : null, baseColor, width)
  const { PAD, IW, wide, titleSize, titleWidth, titleLines, titleStep, titleY, titleEnd, extraSize,
    extraLines, extraWidth, extraY, shift, photoCount, photoHeight, adviceSize, adviceLines,
    adviceHeight, adviceSpace, footerHeight, blocks, areaHeight } = geo
  const MID = Math.round(LW / 2)
  const docWidth = Math.round(IW * .882)
  ctx.save()
  ctx.translate(offset, 0)
  ctx.scale(posterScale, posterScale)
  for (const layer of decorationLayers) {
    const image = layer.type === 'custom' ? decorationArtwork.get(layer.id) : null
    if (layer.type === 'custom' && !image) continue
    const logicalHeight = height / posterScale
    const lebarHiasan = Math.round((LW - 40) * layer.width / 100)
    const x = (LW - lebarHiasan) / 2
    const dasarTinggi = image ? lebarHiasan * image.height / image.width : Math.floor(logicalHeight * .75)
    const artHeight = Math.round(dasarTinggi * ukuranBlok(layer.id).h / 100)
    const y = image ? (logicalHeight - artHeight) / 2 : logicalHeight - artHeight
    renderBlock(layer.id, x, y, lebarHiasan, artHeight, () => {
      if (image) {
        drawFeathered(ctx, image, x, y, lebarHiasan, artHeight,
          { left: lebarHiasan * .07, right: lebarHiasan * .07, top: artHeight * .07, bottom: artHeight * .07 })
      } else {
        ctx.save()
        ctx.translate(x, y)
        paintPosterDecoration(ctx, layer.type, lebarHiasan, artHeight, accent)
        ctx.restore()
      }
    })
  }
  if (repair && showArtwork) {
    ctx.save()
    if (LW > 1080) ctx.translate(LW - 1080, 0)
    paintRepairHero(ctx, backdrop, backdrop.manual ? manualImage : templateArtwork.get(template),
      hiddenLayers.has('logo') ? null : logo, f, LW - 1080, panBannerAktif())
    ctx.restore()
  }
  perbaruiDragBanner(backdrop, offset, posterScale, width, height)
  setFont()

  if (logo) renderBlock('logo', 55, 33, 148, 148, () => paintLogo(ctx, logo, 121, 99, 148))
  const agencyX = logo ? 201 : 65
  renderBlock('agency', agencyX, 42, 530, 104, () => {
    ctx.shadowColor = '#061421'
    ctx.shadowBlur = 12
    label('PERUMDA AIR MINUM', agencyX, 90, 45, '#ffffff', 800)
    label('KOTA MAGELANG', agencyX, 132, 33, '#ffffff', 800)
  })

  renderBlock('banner', PAD, 180, 324, 44, () => {
    if (repair) {
      rounded(PAD, 181, 324, 43, 21, '#ffd066')
      label('INFORMASI LAYANAN AIR', PAD + 20, 209, 21, '#0b2943', 800)
    } else {
      label('INFORMASI LAYANAN AIR', PAD + 1, 203, 24, accent)
    }
  })
  renderBlock('title', PAD - 4, titleY - titleSize, titleWidth, titleEnd - titleY + titleSize + 16, () => {
    setFont('title')
    titleLines.forEach((line, index) => label(line, PAD - 4, titleY + index * titleStep, titleSize, '#ffffff', 800))
    if (repair) {
      ctx.fillStyle = '#ffd066'
      ctx.fillRect(PAD + 1, titleEnd + 16, 87, 5)
    }
  })
  if (extraLines.length) {
    renderBlock('extra', PAD + 1, extraY - extraSize, extraWidth, extraEnd - extraY + extraSize + 12, () => {
      setFont('extra')
      extraLines.forEach((line, index) => label(line, PAD + 1,
        extraY + index * Math.round((extraSize + 8) * skalaHuruf('extra')), extraSize, '#ffffff'))
    })
  }

  if (wide) {
    const c = blocks.cause, s = blocks.schedule, a = blocks.advice, ar = blocks.areas
    const kc = kotakBlok('cause', c.w, c.h), ks = kotakBlok('schedule', s.w, s.h)
    const ka = kotakBlok('advice', a.w, a.h), kr = kotakBlok('areas', ar.w, ar.h)
    const isiImbauan = ka.w === a.w ? adviceLines : barisImbauan(f, ka.w, adviceSize)
    const kolomWilayah = kr.w === ar.w ? null : barisWilayah(geo, kr.w)
    setFont()
    renderBlock('cause', c.x, c.y, kc.w, kc.h,
      () => drawCauseBox(cause, f.note, c.x, c.y, kc.w, dark, f.causeTitle, kc.h))
    renderBlock('schedule', s.x, s.y, ks.w, ks.h,
      () => drawScheduleBox(f, s.x, s.y, ks.w, dark, bright, ks.h))
    if (adviceSpace) {
      renderBlock('advice', a.x, a.y, ka.w, ka.h,
        () => drawAdvice(f, a.x, a.y, isiImbauan, adviceSize, ka.h, dark, ka.w, f.adviceTitle))
    }
    renderBlock('areas', ar.x, ar.y, kr.w, kr.h,
      () => drawAreasBox(geo, ar.x, ar.y, kr.w, accent, bright, dark, kr.h, kolomWilayah))
  } else {
    const c = blocks.cause, s = blocks.schedule, ar = blocks.areas
    ctx.save()
    ctx.translate(0, shift + spacing)
    const kc = kotakBlok('cause', c.w, c.h)
    renderBlock('cause', c.x, c.y, kc.w, kc.h,
      () => drawCauseBox(cause, f.note, c.x, c.y, kc.w, dark, f.causeTitle, kc.h))
    ctx.translate(0, spacing)
    const ks = kotakBlok('schedule', s.w, s.h)
    renderBlock('schedule', s.x, s.y, ks.w, ks.h,
      () => drawScheduleBox(f, s.x, s.y, ks.w, dark, bright, ks.h))
    ctx.translate(0, 52 + spacing)
    const adviceX = PAD + 56
    const ka = kotakBlok('advice', Math.round(IW * .882), adviceHeight)
    const kr = kotakBlok('areas', ar.w, ar.h)
    const isiImbauan = ka.w === Math.round(IW * .882) ? adviceLines : barisImbauan(f, ka.w, adviceSize)
    const kolomWilayah = kr.w === ar.w ? null : barisWilayah(geo, kr.w)
    setFont()
    renderBlock('areas', ar.x, ar.y, kr.w, kr.h,
      () => drawAreasBox(geo, ar.x, ar.y, kr.w, accent, bright, dark, kr.h, kolomWilayah))
    if (adviceSpace) {
      const adviceY = ar.y + 94 + areaHeight
      renderBlock('advice', adviceX, adviceY, ka.w, ka.h,
        () => drawAdvice(f, adviceX, adviceY, isiImbauan, adviceSize, ka.h, dark, ka.w, f.adviceTitle))
      ctx.translate(0, adviceSpace)
    }
    ctx.restore()
  }

  const footerTop = height / posterScale - footerHeight - 31
  photoDrag.hidden = !photoCount || hiddenLayers.has('photos')
  docBounds = null
  if (!photoDrag.hidden) {
    const ukuranFoto = ukuranBlok('photos')
    const lebarFoto = Math.round(docWidth * ukuranFoto.w / 100)
    const tinggiFoto = Math.round(photoHeight * ukuranFoto.h / 100)
    const docHeight = tinggiFoto + 35
    const maxX = LW - lebarFoto - 48
    const maxY = footerTop - docHeight - 12
    const defaultY = wide ? geo.bodyBottom + 12
      : blocks.areas.y + 196 + areaHeight + shift + spacing * 3 + adviceSpace
    const x = Math.max(48, Math.min(maxX, f.docX === '' ? 120 : Number(f.docX)))
    const y = Math.max(24, Math.min(maxY, f.docY === '' ? defaultY : Number(f.docY)))
    docBounds = { x, y, width: lebarFoto, height: docHeight, maxX, maxY }
    drawDocumentation(f, x, y, photoCount, tinggiFoto, repair, accent, lebarFoto)
    photoDrag.style.left = (offset + x * posterScale) / canvas.width * 100 + '%'
    photoDrag.style.top = y * posterScale / height * 100 + '%'
    photoDrag.style.width = lebarFoto * posterScale / canvas.width * 100 + '%'
    photoDrag.style.height = docHeight * posterScale / height * 100 + '%'
  }
  const ukuranSosial = kotakBlok('socials', IW, footerHeight)
  renderBlock('socials', PAD, footerTop, ukuranSosial.w, ukuranSosial.h, () => {
    setFont()
    rounded(PAD, footerTop, ukuranSosial.w, ukuranSosial.h, 19, dark)
    for (const [index, account] of socials.entries()) {
      const x = index % 2 === 0 ? PAD + 23 : PAD + Math.round(ukuranSosial.w / 2) + 10
      const y = footerTop + (index < 2 ? 37 : 75)
      drawSocial(index, account.split('  ')[1], x, y,
        index % 2 === 0 ? Math.round(ukuranSosial.w * .467) : Math.round(ukuranSosial.w * .462))
    }
  })

  ctx.restore()
  for (const entry of posterBlocks.values()) {
    if (!entry.bounds) entry.handle.hidden = true
  }
}

function announcement(f) {
  const areas = locations(f.area)
  const cause = selectedCause(f.cause)
  return [
    f.customTitle || f.type, agency, '',
    f.titleExtra,
    cause ? 'Penyebab: ' + cause.title : '',
    f.note,
    'Mulai pekerjaan: ' + scheduleText(f.startDate, f.startTime),
    'Perkiraan selesai: ' + (f.finishMode === 'until' ? 'SAMPAI SELESAI' : scheduleText(f.endDate, f.endTime)),
    'Wilayah terdampak:',
    ...(areas.length ? areas.map(area => '• ' + area) : ['Belum diinformasikan']),
    f.advice ? '\n' + f.advice : '',
    '\n' + socials.join('\n')
  ].filter((line, index) => line || index === 2).join('\n')
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ values: fields(), template, editableCauses: true, blockPositions, blockPositionsByPreset: { ...blockPositionsByPreset, [posterSize]: blockPositions }, magnetEnabled, decorationLayers, hiddenLayers: [...hiddenLayers], fonts, baseColor, posterSize, posterWidth, posterHeight, posterHeightAuto })) } catch {}
}

/* Kolom yang hanya muncul sesuai pilihan: judul sendiri, judul & rincian penyebab. */
function syncConditionalFields() {
  const judulSendiri = form.elements.type.value === 'Judul Sendiri'
  const penyebabLain = form.elements.cause.value === 'penyebab-other'
  const barisJudul = document.querySelector('#custom-title-row')
  const barisJudulPenyebab = document.querySelector('#cause-title-row')
  const barisRincian = document.querySelector('#note-row')
  if (barisJudul) barisJudul.hidden = !judulSendiri
  if (barisJudulPenyebab) barisJudulPenyebab.hidden = !penyebabLain
  if (barisRincian) barisRincian.hidden = !penyebabLain
}

function update() {
  const { startDate, startTime, endDate, endTime, finishMode } = fields()
  const until = finishMode === 'until'
  document.querySelector('#end-fields').hidden = until
  form.elements.endDate.disabled = form.elements.endTime.disabled = until
  form.elements.endDate.min = startDate
  const invalidTime = startDate && endDate === startDate && startTime && endTime && endTime < startTime
  form.elements.endTime.setCustomValidity(!until && invalidTime ? 'Jam selesai harus setelah jam mulai.' : '')
  document.querySelector('#advice-size').textContent = form.elements.adviceScale.value + '%'
  document.querySelector('#clear-areas').disabled = !form.elements.area.value
  document.querySelector('#title-size').textContent = form.elements.titleScale.value + '%'
  for (const button of gallery.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.template === template))
  }
  syncConditionalFields()
  const count = Number(form.elements.photoLayout.value)
  document.querySelector('#doc-position').hidden = !count
  for (const [index, row] of photoRows.entries()) row.hidden = index >= count
  showPresetLayouts()
  render()
  if (typeof perbaruiKontrolVideo === 'function') perbaruiKontrolVideo()
}

form.addEventListener('submit', event => event.preventDefault())
form.addEventListener('input', event => {
  if (event.target === form.elements.photoLayout) form.elements.docX.value = form.elements.docY.value = ''
  if (event.target === form.elements.cause) {
    form.elements.note.value = selectedCause(event.target.value)?.text ?? ''
  }
  update()
  save()
})

function mountPresetEditor({ id, entries, key, placeholder, currentText, changed }) {
  const section = document.querySelector(id)
  const select = section.querySelector('select')
  const editor = section.querySelector('fieldset')
  const title = section.querySelector('[data-field="title"]')
  const text = section.querySelector('[data-field="text"]')
  const message = section.querySelector('[role="status"]')
  const action = name => section.querySelector('[data-action="' + name + '"]')
  let editing = null

  function showMessage(value) {
    message.textContent = value
    message.hidden = !value
  }

  function populateOptions(value = '') {
    select.replaceChildren(new Option(placeholder, ''))
    for (const entry of entries) select.add(new Option(entry.title, entry.id))
    select.value = value
    action('edit').disabled = !select.value
  }

  function open(entry) {
    editing = entry?.id ?? null
    title.value = entry?.title ?? ''
    text.value = entry?.text ?? currentText()
    action('delete').hidden = !editing
    editor.hidden = false
    showMessage('')
    title.focus()
  }

  function persist(next, selected, feedback) {
    if (!storeLocal(key, next)) {
      showMessage('Pilihan belum tersimpan. Periksa penyimpanan browser.')
      return
    }
    entries = next
    populateOptions(selected)
    editor.hidden = true
    showMessage(feedback)
    changed?.(entries, selected)
    select.focus()
  }

  select.addEventListener('change', () => {
    action('edit').disabled = !select.value
    editor.hidden = true
    showMessage('')
  })
  action('new').addEventListener('click', () => open())
  action('edit').addEventListener('click', () => {
    const entry = entries.find(item => item.id === select.value)
    if (entry) open(entry)
  })
  action('cancel').addEventListener('click', () => {
    editor.hidden = true
    select.focus()
  })
  action('save').addEventListener('click', () => {
    const name = title.value.trim()
    const content = text.value.trim()
    if (!name) {
      showMessage('Isi nama penyebab.')
      return
    }
    if (entries.some(entry => entry.id !== editing && entry.title.toLocaleLowerCase('id') === name.toLocaleLowerCase('id'))) {
      showMessage('Nama ini sudah dipakai. Masukkan nama lain.')
      return
    }
    const item = { id: editing ?? buatId(), title: name, text: content }
    const next = editing ? entries.map(entry => entry.id === editing ? item : entry) : [...entries, item]
    persist(next, item.id, 'Pilihan disimpan di browser ini.')
  })
  action('delete').addEventListener('click', () => {
    if (editing) persist(entries.filter(entry => entry.id !== editing), '', 'Pilihan dihapus.')
  })
  populateOptions()
  return populateOptions
}

/* Penyebab gangguan & rinciannya diatur dari halaman admin; di sini hanya pilihan. */
const causeSelect = document.querySelector('select[name=cause]')
function populateCauseOptions(selected = causeSelect.value) {
  causeSelect.replaceChildren(new Option('Pilih penyebab', ''))
  for (const entry of causes) causeSelect.add(new Option(entry.title, entry.id))
  const cocok = causes.find(entry => entry.id === selected || entry.alias === selected)
  causeSelect.value = cocok ? cocok.id : ''
}
populateCauseOptions()
/* Pilihan wilayah diatur dari halaman admin; di sini hanya memilih daftar. */
const areaMenu = document.querySelector('#area-menu')
const areaStatus = document.querySelector('#area-master-status')
const areaListsKey = 'kabar-air-area-lists'
let areaLists = readStorage(areaListsKey, [])

function showAreaMasterStatus(message) {
  areaStatus.textContent = message
  areaStatus.hidden = !message
}

function useMasterAreas(text) {
  form.elements.area.value = text
  update()
  save()
}

function populateAreaMenu(selected = '') {
  areaMenu.replaceChildren(new Option('Pilih pilihan wilayah', ''))
  for (const entry of areaLists) areaMenu.add(new Option(entry.title, entry.id))
  areaMenu.value = areaLists.some(entry => entry.id === selected) ? selected : ''
}

populateAreaMenu()
areaMenu.addEventListener('change', () => {
  const entry = areaLists.find(item => item.id === areaMenu.value)
  if (!entry) {
    showAreaMasterStatus('')
    return
  }
  useMasterAreas(entry.text)
  showAreaMasterStatus('Wilayah dari "' + entry.title + '" dipakai di poster.')
})

document.querySelector('#clear-areas').addEventListener('click', () => {
  form.elements.area.value = ''
  areaMenu.value = ''
  showAreaMasterStatus('')
  update()
  save()
})

/* Logo instansi bersifat paten: berkas logo-perumda.png di server, tanpa menu unggah. */
const LOGO_PATH = 'logo-instansi.webp?v=20261124r'

function setLogo(image) {
  logo = image
  render()
}

/* Memuat gambar dari URL/data URL. Tidak memakai image.decode() saja karena di
   sebagian browser promise itu bisa menggantung (tidak resolve/reject), sehingga
   unggah gambar tampak "diam". onload/onerror + batas waktu membuatnya pasti selesai. */
function decodeImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    /* Gambar dari API di origin lain dimuat sebagai CORS supaya kanvas tidak
       “terkontaminasi” (toDataURL/unduh PNG tetap bisa dipakai). */
    try {
      if (/^https?:/i.test(source) && new URL(source, location.href).origin !== location.origin) {
        image.crossOrigin = 'anonymous'
      }
    } catch { /* alamat relatif / data URL: tidak perlu CORS */ }
    let selesai = false
    const beres = () => {
      if (selesai) return
      selesai = true
      clearTimeout(jam)
      if (image.naturalWidth || image.width) resolve(image)
      else reject(new Error('Gambar tidak dapat dibuka.'))
    }
    const gagal = () => {
      if (selesai) return
      selesai = true
      clearTimeout(jam)
      reject(new Error('Gambar tidak dapat dibuka.'))
    }
    const jam = setTimeout(gagal, 15000)
    image.onload = beres
    image.onerror = gagal
    image.src = source
    if (image.complete && image.naturalWidth) beres()
  })
}

/* Ukuran poster: Potrait / Persegi / Story / Bebas */
const sizeButtons = [...document.querySelectorAll('[data-size]')]
const widthInput = document.querySelector('#poster-width')
const heightInput = document.querySelector('#poster-height')
const heightAutoInput = document.querySelector('#poster-height-auto')
const widthValue = document.querySelector('#poster-width-value')
const heightValue = document.querySelector('#poster-height-value')
function syncSizeChips() {
  for (const button of sizeButtons) button.setAttribute('aria-pressed', String(button.dataset.size === posterSize))
}
function syncSizeControls() {
  if (!widthInput) return
  widthInput.value = posterWidth
  heightInput.value = posterHeight
  heightInput.disabled = posterHeightAuto
  heightAutoInput.checked = posterHeightAuto
  widthValue.textContent = posterWidth + ' px'
  heightValue.textContent = posterHeightAuto ? 'Otomatis' : posterHeight + ' px'
  /* Preset Potrait/Persegi/Story ukurannya tetap; slider hanya untuk Bebas. */
  const panel = document.querySelector('.size-custom')
  if (panel) panel.hidden = posterSize !== 'custom'
}
function setPosterSize(size, persist = true) {
  if (!sizePresets[size]) return
  if (size !== 'custom') {
    const preset = sizePresets[size]
    posterWidth = preset.width || 1080
    posterHeightAuto = preset.height === undefined
    if (preset.height !== undefined) posterHeight = preset.height
    else posterHeight = Math.max(HEIGHT_MIN, Math.min(HEIGHT_MAX, Number(posterHeight) || 1350))
  }
  if (posterSize !== size) {
    blockPositionsByPreset[posterSize] = structuredClone(blockPositions)
    applyPresetPositions(size)
  }
  posterSize = size
  syncSizeChips()
  syncSizeControls()
  showPresetLayouts()
  render()
  if (persist) save()
}
for (const button of sizeButtons) button.addEventListener('click', () => setPosterSize(button.dataset.size))
widthInput?.addEventListener('input', () => {
  posterWidth = Number(widthInput.value)
  posterSize = 'custom'
  syncSizeChips(); syncSizeControls(); showPresetLayouts(); render(); save()
})
heightInput?.addEventListener('input', () => {
  posterHeight = Number(heightInput.value)
  posterHeightAuto = false
  posterSize = 'custom'
  syncSizeChips(); syncSizeControls(); showPresetLayouts(); render(); save()
})
heightAutoInput?.addEventListener('change', () => {
  posterHeightAuto = heightAutoInput.checked
  posterSize = 'custom'
  syncSizeChips(); syncSizeControls(); showPresetLayouts(); render(); save()
})

/* Zoom pratinjau desain (Pantau Desain) */
const zoomIn = document.querySelector('#zoom-in')
const zoomOut = document.querySelector('#zoom-out')
const zoomReset = document.querySelector('#zoom-reset')
const zoomValue = document.querySelector('#zoom-value')
const stageEl = document.querySelector('.stage')
const ZOOM_MIN = 50, ZOOM_MAX = 400, ZOOM_STEP = 25

function setZoom(value) {
  previewZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(value)))
  zoomValue.textContent = previewZoom + '%'
  stageEl.dataset.zoomed = previewZoom > 100 ? '1' : '0'
  render()
}
zoomIn.addEventListener('click', () => setZoom(previewZoom + ZOOM_STEP))
zoomOut.addEventListener('click', () => setZoom(previewZoom - ZOOM_STEP))
zoomReset.addEventListener('click', () => setZoom(100))
stageEl.addEventListener('wheel', event => {
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  setZoom(previewZoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
}, { passive: false })

motion.addEventListener('change', render)

const gallery = document.querySelector('#background-gallery')
const mediaStatus = document.querySelector('#media-status')
const backgroundsKey = 'kabar-air-custom-backgrounds'
let customTemplates = readStorage(backgroundsKey, [])
let backgroundRevision = 0

/* Menu “Latar buatan sendiri” sudah dihapus dari frontend; latar diatur lewat galeri/admin. */
function showCustomTemplates() {}

function selectBuiltin(id) {
  backgroundRevision += 1
  template = id
  customBackground = null
  showCustomTemplates()
  update()
  save()
  loadTemplateArtwork(id)
}

async function selectCustom(id) {
  const entry = customTemplates.find(item => item.id === id)
  if (!entry) return
  const revision = ++backgroundRevision
  try {
    const image = await decodeImage(entry.source)
    if (revision !== backgroundRevision) return
    template = id
    customBackground = image
    showCustomTemplates()
    update()
    save()
  } catch {
    if (revision !== backgroundRevision) return
    selectBuiltin(defaultTemplate)
    mediaStatus.textContent = 'Latar tersimpan tidak dapat dibuka.'
  }
}

/* ---------- Galeri “Banner Foto”: foto asli dari admin + unggahan lokal ---------- */
const bannerPhotoKey = 'kabar-air-electrical-templates'
const FOTO_COLORS = ['#0b2c4d', '#125071', '#9eecff']
let bannerPhotos = readStorage(bannerPhotoKey, [])
const photoGallery = document.querySelector('#photo-templates')
const photoStatus = document.querySelector('#banner-photo-status')

function daftarkanBannerFoto() {
  for (const entry of bannerPhotos) {
    if (!entry?.id) continue
    backdrops[entry.id] = {
      name: entry.name || 'Banner foto',
      colors: Array.isArray(entry.colors) && entry.colors.length === 3 ? entry.colors : FOTO_COLORS,
      kind: 'foto',
      custom: true,
      art: readStorage(entry.sourceKey, '') || ''
    }
  }
}

function tampilStatusFoto(pesan) {
  photoStatus.hidden = !pesan
  photoStatus.textContent = pesan
}

function buatTile(id, backdrop) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'tile'
  button.dataset.template = id
  button.setAttribute('aria-pressed', String(id === template))
  const thumbnail = document.createElement('canvas')
  thumbnail.width = 160
  thumbnail.height = 72
  thumbnail.setAttribute('aria-hidden', 'true')
  const thumbnailContext = thumbnail.getContext('2d')
  thumbnailContext.scale(160 / 1080, 72 / 630)
  paintBackdrop(thumbnailContext, 630, backdrop, null, baseColor)
  const name = document.createElement('span')
  name.textContent = backdrop.name
  button.append(thumbnail)
  if (backdrop.art) {
    const artwork = document.createElement('img')
    artwork.className = 'tile-art'
    artwork.alt = ''
    artwork.addEventListener('error', () => artwork.remove())
    artwork.src = backdrop.art
    button.append(artwork)
  }
  button.append(name)
  button.addEventListener('click', () => selectBuiltin(id))
  return button
}

function showPhotoGallery() {
  photoGallery.replaceChildren()
  /* Gambar yang sudah dipakai banner animasi tidak diulang di Banner Foto. */
  const dipakaiAnimasi = new Set(Object.values(backdrops)
    .filter(item => item.kind !== 'foto' && item.art).map(item => item.art))
  let jumlah = 0
  for (const [id, backdrop] of Object.entries(backdrops)) {
    if (backdrop.kind !== 'foto') continue
    const entry = bannerPhotos.find(item => item.id === id)
    if (!entry && dipakaiAnimasi.has(backdrop.art)) continue
    jumlah += 1
    if (!entry) {
      photoGallery.append(buatTile(id, backdrop))
      continue
    }
    const bungkus = document.createElement('div')
    bungkus.className = 'photo-tile'
    const hapus = document.createElement('button')
    hapus.type = 'button'
    hapus.className = 'photo-delete'
    hapus.textContent = '×'
    hapus.title = 'Hapus ' + entry.name + ' dari galeri'
    hapus.setAttribute('aria-label', hapus.title)
    hapus.addEventListener('click', event => {
      event.stopPropagation()
      hapusBannerFoto(entry)
    })
    bungkus.append(buatTile(id, backdrop), hapus)
    photoGallery.append(bungkus)
  }
  if (!jumlah) {
    const kosong = document.createElement('p')
    kosong.className = 'hint photo-empty'
    kosong.textContent = 'Belum ada banner foto. Unggah lewat tombol di bawah atau halaman admin.'
    photoGallery.append(kosong)
  }
}

function hapusBannerFoto(entry) {
  const next = bannerPhotos.filter(item => item.id !== entry.id)
  if (!storeLocal(bannerPhotoKey, next)) return
  bannerPhotos = next
  try { localStorage.removeItem(entry.sourceKey) } catch {}
  delete backdrops[entry.id]
  templateArtwork.delete(entry.id)
  if (template === entry.id) selectBuiltin(defaultTemplate)
  showPhotoGallery()
  tampilStatusFoto('Banner foto dihapus dari galeri.')
}

const bannerPhotoUpload = document.querySelector('#upload-banner-photo')
bannerPhotoUpload.addEventListener('change', async () => {
  const files = Array.from(bannerPhotoUpload.files)
  bannerPhotoUpload.value = ''
  let ditambah = 0
  let pesan = ''
  for (const file of files) {
    try {
      const image = await loadImageFile(file)
      const kanvas = document.createElement('canvas')
      const skala = Math.min(1, 1400 / Math.max(image.width, image.height))
      kanvas.width = Math.max(1, Math.round(image.width * skala))
      kanvas.height = Math.max(1, Math.round(image.height * skala))
      kanvas.getContext('2d').drawImage(image, 0, 0, kanvas.width, kanvas.height)
      const id = 'foto-' + buatId()
      const sourceKey = 'kabar-air-foto-' + id
      if (!storeLocal(sourceKey, kanvas.toDataURL('image/webp', .9))) {
        pesan = 'Penyimpanan browser penuh. Hapus banner foto lama untuk menambah gambar.'
        continue
      }
      const entry = {
        id,
        name: (file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Banner foto'),
        sourceKey
      }
      const next = [...bannerPhotos, entry]
      if (!storeLocal(bannerPhotoKey, next)) {
        try { localStorage.removeItem(sourceKey) } catch {}
        pesan = 'Banner foto belum tersimpan. Kosongkan sebagian penyimpanan browser.'
        continue
      }
      bannerPhotos = next
      backdrops[id] = {
        name: entry.name, colors: FOTO_COLORS,
        kind: 'foto', custom: true, art: readStorage(sourceKey, '')
      }
      ditambah++
      await selectBuiltin(id)
    } catch (error) {
      pesan = error.message
    }
  }
  showPhotoGallery()
  tampilStatusFoto([ditambah ? ditambah + ' banner foto tersimpan dan langsung dipakai.' : '', pesan].filter(Boolean).join(' '))
})

daftarkanBannerFoto()

/* ---------- Warna dasar latar ---------- */
const baseColorInput = document.querySelector('#base-color')
baseColorInput.value = baseColor || '#0b2c4d'
baseColorInput.addEventListener('input', () => {
  baseColor = baseColorInput.value
  render()
  save()
})
document.querySelector('#reset-base-color').addEventListener('click', () => {
  baseColor = ''
  baseColorInput.value = '#0b2c4d'
  render()
  save()
  mediaStatus.textContent = 'Warna latar kembali mengikuti template.'
})

function showAnimatedGallery() {
  const gallery = document.querySelector('#animated-templates')
  gallery.replaceChildren()
  for (const [id, backdrop] of Object.entries(backdrops)) {
    if (backdrop.kind === 'foto' || backdrop.custom) continue
    gallery.append(buatTile(id, backdrop))
  }
}
showAnimatedGallery()
showPhotoGallery()

async function loadImageFile(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Pilih gambar PNG, JPG, atau WebP.')
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 20 MB.')
  const url = URL.createObjectURL(file)
  try {
    return await decodeImage(url)
  } catch {
    throw new Error('Gambar tidak dapat dibuka. Coba berkas lain.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* Video pekerjaan: disimpan sebagai elemen <video> supaya bisa diputar saat
   merekam video pengumuman, dan tetap bisa digambar ke kanvas (PNG/pratinjau). */
const TIPE_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']

function adalahVideo(item) {
  return !!(item && item.video)
}

function adaVideoPekerjaan() {
  const jumlah = Number(document.querySelector('[name="photoLayout"]')?.value || 0)
  if (!jumlah) return false
  return photos.slice(0, jumlah).some(adalahVideo)
}

function lepasVideo(item) {
  if (!item || !item.video) return
  try { item.video.pause() } catch {}
  try { item.video.removeAttribute('src') } catch {}
  if (item.url) { try { URL.revokeObjectURL(item.url) } catch {} }
}

function loadVideoFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement('video')
    el.src = url
    el.muted = true
    el.loop = true
    el.playsInline = true
    el.preload = 'auto'
    let selesai = false
    const gagal = pesan => {
      if (selesai) return
      selesai = true
      try { URL.revokeObjectURL(url) } catch {}
      reject(new Error(pesan))
    }
    const beres = () => {
      if (selesai) return
      selesai = true
      el.width = el.videoWidth || 720
      el.height = el.videoHeight || 1280
      resolve({ video: el, url, nama: file.name })
    }
    el.addEventListener('loadeddata', () => {
      try { el.currentTime = Math.min(0.15, (el.duration || 1) / 4) } catch { beres() }
      el.addEventListener('seeked', beres, { once: true })
      setTimeout(beres, 400)
    }, { once: true })
    el.addEventListener('error', () => gagal('Video tidak dapat dibuka. Coba MP4 atau WebM lain.'), { once: true })
    setTimeout(() => gagal('Video terlalu lama dimuat. Coba berkas yang lebih kecil.'), 25000)
  })
}

function perbaruiKontrolVideo() {
  const ada = adaVideoPekerjaan()
  const tombol = document.querySelector('#download-video')
  const kotak = document.querySelector('#backsound-box')
  if (tombol) tombol.hidden = !ada
  if (kotak) kotak.hidden = !ada
  if (ada) muatDaftarBacksound()
}

function isiPilihanBacksound() {
  const pilih = document.querySelector('#backsound-pilih')
  if (!pilih) return
  const terpilih = backsoundDipilih || backsoundUrl || ''
  pilih.innerHTML = ''
  const tanpa = document.createElement('option')
  tanpa.value = ''
  tanpa.textContent = 'Tanpa backsound'
  pilih.append(tanpa)
  for (const item of daftarBacksound) {
    const opsi = document.createElement('option')
    opsi.value = item.url
    opsi.textContent = item.name
    pilih.append(opsi)
  }
  if (terpilih && !daftarBacksound.some(item => item.url === terpilih)) {
    const opsi = document.createElement('option')
    opsi.value = terpilih
    opsi.textContent = backsoundNama || 'Backsound back office'
    pilih.append(opsi)
  }
  pilih.value = terpilih
  const hint = document.querySelector('#backsound-hint')
  if (hint) {
    hint.textContent = daftarBacksound.length
      ? 'Ada ' + daftarBacksound.length + ' MP3 di back office. Pilih satu untuk video.'
      : 'Belum ada MP3 di back office. Unggah lewat menu Identitas & Video.'
  }
}

async function muatDaftarBacksound() {
  try {
    const respons = await fetch(studioApi + '/api/backsound', { cache: 'no-store' })
    if (!respons.ok) throw new Error('gagal')
    const data = await respons.json()
    daftarBacksound = (Array.isArray(data.files) ? data.files : [])
      .map(item => ({ ...item, url: alamatMedia(item.url) }))
  } catch {
    daftarBacksound = []
  }
  isiPilihanBacksound()
}

const decorationUpload = document.querySelector('#upload-decoration')
const decorationStatus = document.querySelector('#decoration-status')
const layerWidth = document.querySelector('#layer-width')
const layerWidthValue = document.querySelector('#layer-width-value')
const layerHeight = document.querySelector('#layer-height')
const layerHeightValue = document.querySelector('#layer-height-value')
const layerSizeName = document.querySelector('#layer-size-name')
const layerSizeHint = document.querySelector('#layer-size-hint')
const resetLayerSize = document.querySelector('#reset-layer-size')
const layerList = document.querySelector('#layer-list')
const layerFontSize = document.querySelector('#layer-font-size')
const layerFontValue = document.querySelector('#layer-font-value')
const layerFontColor = document.querySelector('#layer-font-color')
const resetFontColor = document.querySelector('#reset-font-color')
const layerOutline = document.querySelector('#layer-outline')
const layerOutlineColor = document.querySelector('#layer-outline-color')
const layerOutlineWidth = document.querySelector('#layer-outline-width')
const layerOutlineValue = document.querySelector('#layer-outline-value')
const fontTools = document.querySelector('#font-tools')

/* Aset yang punya huruf: ukuran, warna, dan outline bisa diatur. */
const asetBerhuruf = new Set(['title', 'extra', 'agency', 'banner', 'cause', 'schedule',
  'areas', 'advice', 'socials', 'photos', 'documentation'])

/* Aset yang punya kotak (kartu/tabel) sehingga lebar/tingginya bisa diatur. */
const asetBerkotak = new Set(['cause', 'schedule', 'areas', 'advice', 'photos', 'socials'])
const labelAset = { ...movableLabels, photos: 'Media dokumentasi' }

function showDecorationStatus(message) {
  decorationStatus.hidden = !message
  decorationStatus.textContent = message
}

/* Panel "Ukuran kotak aset terpilih" di bawah pratinjau desain. */
function syncLayerSize() {
  const id = selectedDecorationId
  const hiasan = decorationLayers.find(layer => layer.id === id)
  const nama = hiasan ? (hiasan.name || decorationNames[hiasan.type])
    : (id && Object.hasOwn(labelAset, id) ? labelAset[id] : '')
  const bisa = !!nama && (!!hiasan || asetBerkotak.has(id))
  const terkunci = !!id && lockedLayers.has(id)
  const ukuran = id ? ukuranBlok(id) : { w: 100, h: 100 }
  const lebar = hiasan ? Number(hiasan.width) || 100 : ukuran.w
  layerSizeName.textContent = nama ? 'Ukuran kotak: ' + nama : 'Ukuran kotak aset terpilih'
  layerWidth.min = hiasan ? '20' : '30'
  layerWidth.max = hiasan ? '130' : '220'
  layerWidth.disabled = layerHeight.disabled = resetLayerSize.disabled = !bisa || terkunci
  layerWidth.value = String(lebar)
  layerHeight.value = String(ukuran.h)
  layerWidthValue.textContent = lebar + '%'
  layerHeightValue.textContent = ukuran.h + '%'
  const bisaHuruf = !!nama && !terkunci && asetBerhuruf.has(id) && !hiasan
  const gaya = gayaUntuk(id)
  fontTools.dataset.mati = bisaHuruf ? '0' : '1'
  layerFontSize.disabled = layerFontColor.disabled = resetFontColor.disabled = layerOutline.disabled =
    layerOutlineColor.disabled = layerOutlineWidth.disabled = !bisaHuruf
  layerFontSize.value = String(gaya.size)
  layerFontValue.textContent = gaya.size + '%'
  layerFontColor.value = /^#[0-9a-f]{6}$/i.test(gaya.color) ? gaya.color : '#ffffff'
  layerFontColor.title = gaya.color ? 'Warna huruf: ' + gaya.color : 'Warna huruf asli (belum diubah)'
  layerOutline.checked = !!gaya.outline
  layerOutlineColor.value = /^#[0-9a-f]{6}$/i.test(gaya.outlineColor) ? gaya.outlineColor : WARNA_OUTLINE_BAWAAN
  layerOutlineWidth.value = String(gaya.outlineWidth || 2)
  layerOutlineValue.textContent = String(gaya.outlineWidth || 2)
  layerSizeHint.textContent = !nama
    ? 'Pilih tabel di panel Layer (Penyebab, Jadwal, Wilayah, Imbauan, Media, Media sosial) atau hiasan. Lebar/Tinggi hanya mengubah kotaknya — huruf dan ukurannya tetap.'
    : !bisa ? 'Aset ini teks tanpa kotak. Pilih tabel Penyebab, Jadwal, Wilayah, Imbauan, Media dokumentasi, atau Media sosial.'
      : terkunci ? 'Aset terkunci — buka kunci di panel Layer untuk mengubah ukuran.'
        : 'Lebar/Tinggi hanya mengubah kotak tabel — huruf dan ukurannya tetap. Bila teks terpotong, naikkan Tinggi.'
}

function showLayerPanel() {
  layerList.replaceChildren()
  const fixed = [['artwork', 'Ilustrasi dan latar gambar'], ...Object.entries(movableLabels), ['photos', 'Media dokumentasi']]
  for (const [id, name] of fixed) addLayerRow(id, name)
  for (const layer of [...decorationLayers].reverse()) {
    addLayerRow(layer.id, layer.name || decorationNames[layer.type], layer)
  }
  syncLayerSize()
}

/* Kolom form yang menjadi tujuan gulir saat sebuah aset dipilih di poster. */
const kolomEdit = {
  title: 'type', extra: 'customTitle', cause: 'cause', schedule: 'startDate',
  areas: 'area', advice: 'adviceTitle', photos: 'photoLayout'
}
/* Wilayah memakai textarea tersembunyi; tujuan gulirnya wadah editor wilayah. */
const wadahEdit = { areas: '.locations' }

function pilihAset(id) {
  if (!id) return
  selectedDecorationId = id
  showLayerPanel()
  const baris = [...layerList.children].find(row => row.dataset.id === id)
  baris?.scrollIntoView({ block: 'nearest' })
  let wadah = wadahEdit[id] ? document.querySelector(wadahEdit[id]) : null
  if (!wadah) {
    const namaKolom = kolomEdit[id]
    const target = namaKolom ? form.elements[namaKolom] : null
    wadah = target?.closest('label') || target?.closest('fieldset') || target
    if (wadah && !wadah.getClientRects().length) {
      wadah = wadah.closest('.preset-section, .locations, fieldset, .design-controls') || wadah.parentElement
    }
  }
  if (!wadah && (decorationLayers.some(layer => layer.id === id) || id === 'logo')) {
    wadah = document.querySelector('#ornament-gallery')
  }
  if (wadah) {
    wadah.scrollIntoView({ behavior: 'smooth', block: 'center' })
    wadah.classList.add('sorot-kolom')
    setTimeout(() => wadah.classList.remove('sorot-kolom'), 1500)
  }
}

function addLayerRow(id, name, layer) {
  const row = document.createElement('div')
  row.className = 'layer-row'
  row.dataset.id = id
  row.dataset.selected = String(selectedDecorationId === id)
  const bisaAtur = !!layer || Object.hasOwn(movableLabels, id) || asetBerkotak.has(id)
  const title = document.createElement(bisaAtur ? 'button' : 'span')
  title.className = bisaAtur ? 'layer-name layer-action' : 'layer-name'
  title.textContent = name
  if (bisaAtur) {
    title.type = 'button'
    title.setAttribute('aria-label', 'Atur skala ' + name)
    title.addEventListener('click', () => pilihAset(id))
  }
  const toggle = document.createElement('button')
  toggle.className = 'layer-action icon-button'
  toggle.type = 'button'
  function updateToggle() {
    const visible = !hiddenLayers.has(id)
    toggle.textContent = visible ? '◉' : '⊘'
    toggle.title = (visible ? 'Sembunyikan ' : 'Tampilkan ') + name
    toggle.setAttribute('aria-label', toggle.title)
    toggle.setAttribute('aria-pressed', String(visible))
  }
  updateToggle()
  toggle.addEventListener('click', () => {
    if (hiddenLayers.has(id)) {
      hiddenLayers.delete(id)
      if (layer) loadDecorationLayer(layer)
    } else hiddenLayers.add(id)
    updateToggle()
    render()
    save()
  })
  row.append(title)
  if (bisaAtur) {
    const kunci = document.createElement('button')
    kunci.className = 'layer-action icon-button lock'
    kunci.type = 'button'
    function updateKunci() {
      const terkunci = lockedLayers.has(id)
      kunci.textContent = terkunci ? '🔒' : '🔓'
      kunci.title = (terkunci ? 'Buka kunci ' : 'Kunci ') + name + ' (tidak bisa digeser/diubah skala)'
      kunci.setAttribute('aria-label', kunci.title)
      kunci.setAttribute('aria-pressed', String(terkunci))
    }
    updateKunci()
    kunci.addEventListener('click', () => {
      if (lockedLayers.has(id)) lockedLayers.delete(id)
      else lockedLayers.add(id)
      simpanKunci()
      updateKunci()
      showLayerPanel()
      render()
    })
    row.append(kunci)
  }
  row.append(toggle)
  if (layer) {
    const remove = document.createElement('button')
    remove.className = 'layer-action icon-button'
    remove.type = 'button'
    remove.textContent = '×'
    remove.title = 'Hapus ' + name + ' dari poster'
    remove.setAttribute('aria-label', remove.title)
    remove.addEventListener('click', () => {
      decorationLayers = decorationLayers.filter(item => item.id !== id)
      posterBlocks.get(id).handle.remove()
      posterBlocks.delete(id)
      delete blockPositions[id]
      delete blockSizes[id]
      lockedLayers.delete(id)
      storeLocal(blockSizeKey, blockSizes)
      simpanKunci()
      hiddenLayers.delete(id)
      decorationArtwork.delete(id)
      selectedDecorationId = decorationLayers.at(-1)?.id
      showLayerPanel()
      render()
      save()
      pruneOrnamentSource(layer.sourceKey)
      document.querySelector('#upload-decoration').focus()
    })
    row.append(remove)
  }
  layerList.append(row)
}

/* Hanya satu hiasan di poster: menambah hiasan baru menggantikan yang lama. */
function addDecorationLayer(layer) {
  for (const lama of decorationLayers) {
    delete blockPositions[lama.id]
    const entry = posterBlocks.get(lama.id)
    if (entry) {
      entry.handle.remove()
      posterBlocks.delete(lama.id)
    }
    decorationArtwork.delete(lama.type)
  }
  decorationLayers = []
  decorationLayers.push(layer)
  selectedDecorationId = layer.id
  registerPosterBlock(layer.id, layer.name || decorationNames[layer.type], true)
  showLayerPanel()
  render()
  save()
  loadDecorationLayer(layer)
}

const ornamentGallery = document.querySelector('#ornament-gallery')

function pruneOrnamentSource(key) {
  if (!key || ornamentTemplates.some(item => item.sourceKey === key) ||
      decorationLayers.some(item => item.sourceKey === key) ||
      savedLayouts.some(layout => layout.layers.some(item => item.sourceKey === key))) return
  try { localStorage.removeItem(key) } catch {}
}

function showOrnamentGallery() {
  ornamentGallery.replaceChildren()
  for (const item of ornamentTemplates) {
    const tile = document.createElement('div')
    tile.className = 'ornament-tile'
    const add = document.createElement('button')
    add.className = 'tile'
    add.type = 'button'
    add.setAttribute('aria-label', 'Tambahkan ' + item.name + ' ke poster')
    const image = document.createElement('img')
    image.alt = ''
    image.src = item.sourceKey ? readStorage(item.sourceKey, '') : decorationFiles[item.type]
    const name = document.createElement('span')
    name.textContent = item.name
    add.append(image, name)
    add.addEventListener('click', () => {
      addDecorationLayer({ ...item, id: 'ornament-' + buatId(), width: decorationLayers.length ? 70 : 100 })
      showDecorationStatus(item.name + ' ditambahkan ke poster.')
    })
    tile.append(add)
    ornamentGallery.append(tile)
  }
}

function bisaAturUkuran(id) {
  return !!id && (asetBerkotak.has(id) || decorationLayers.some(layer => layer.id === id))
}

layerWidth.addEventListener('input', () => {
  const id = selectedDecorationId
  if (!bisaAturUkuran(id) || lockedLayers.has(id)) return
  const hiasan = decorationLayers.find(layer => layer.id === id)
  if (hiasan) hiasan.width = Math.max(20, Math.min(130, Number(layerWidth.value) || 100))
  else aturUkuranBlok(id, 'w', layerWidth.value)
  layerWidthValue.textContent = (hiasan ? hiasan.width : ukuranBlok(id).w) + '%'
  render()
  save()
})

layerHeight.addEventListener('input', () => {
  const id = selectedDecorationId
  if (!bisaAturUkuran(id) || lockedLayers.has(id)) return
  aturUkuranBlok(id, 'h', layerHeight.value)
  layerHeightValue.textContent = ukuranBlok(id).h + '%'
  render()
  save()
})

resetLayerSize.addEventListener('click', () => {
  const id = selectedDecorationId
  if (!bisaAturUkuran(id) || lockedLayers.has(id)) return
  const hiasan = decorationLayers.find(layer => layer.id === id)
  if (hiasan) hiasan.width = 100
  delete blockSizes[id]
  storeLocal(blockSizeKey, blockSizes)
  syncLayerSize()
  render()
  save()
})

/* ---------- Gaya huruf per aset: ukuran, warna, outline ---------- */
function ubahGayaHuruf(tambahan) {
  const id = selectedDecorationId
  if (!id || !asetBerhuruf.has(id) || lockedLayers.has(id)) return
  gayaAset[id] = Object.assign(gayaUntuk(id), tambahan)
  simpanGayaAset()
  syncLayerSize()
  render()
  save()
}

layerFontSize.addEventListener('input', () => {
  layerFontValue.textContent = layerFontSize.value + '%'
  ubahGayaHuruf({ size: Number(layerFontSize.value) || 100 })
})
layerFontColor.addEventListener('input', () => ubahGayaHuruf({ color: layerFontColor.value }))
resetFontColor.addEventListener('click', () => ubahGayaHuruf({ color: '' }))
layerOutline.addEventListener('change', () => ubahGayaHuruf({ outline: layerOutline.checked }))
layerOutlineColor.addEventListener('input', () => ubahGayaHuruf({ outlineColor: layerOutlineColor.value }))
layerOutlineWidth.addEventListener('input', () => {
  layerOutlineValue.textContent = layerOutlineWidth.value
  ubahGayaHuruf({ outlineWidth: Number(layerOutlineWidth.value) || 2 })
})

decorationUpload.addEventListener('change', async () => {
  const files = Array.from(decorationUpload.files)
  decorationUpload.value = ''
  let added = 0
  let errorMessage = ''
  for (const file of files) {
    try {
      const image = await loadImageFile(file)
      const imageCanvas = document.createElement('canvas')
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height))
      imageCanvas.width = Math.max(1, Math.round(image.width * scale))
      imageCanvas.height = Math.max(1, Math.round(image.height * scale))
      imageCanvas.getContext('2d').drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height)
      const id = 'ornament-' + buatId()
      const sourceKey = 'kabar-air-' + id
      const saved = storeLocal(sourceKey, imageCanvas.toDataURL('image/webp', .9))
      if (!saved) {
        errorMessage = 'Penyimpanan browser penuh. Hapus hiasan lama untuk menambah gambar.'
        continue
      }
      const next = [...ornamentTemplates, { id, type: 'custom', name: file.name.slice(0, 80), sourceKey }]
      if (!storeLocal(ornamentGalleryKey, next)) {
        pruneOrnamentSource(sourceKey)
        errorMessage = 'Template belum tersimpan. Kosongkan sebagian penyimpanan browser.'
        continue
      }
      ornamentTemplates = next
      added++
    } catch (error) {
      errorMessage = error.message
    }
  }
  showOrnamentGallery()
  showDecorationStatus([added ? added + ' template disimpan ke galeri.' : '', errorMessage].filter(Boolean).join(' '))
})

const layoutName = document.querySelector('#layout-name')
const savedLayoutSelect = document.querySelector('#saved-layouts')
const applyLayoutButton = document.querySelector('#apply-layout')
const layoutStatus = document.querySelector('#layout-status')

function showLayoutStatus(message) {
  layoutStatus.textContent = message
  layoutStatus.hidden = !message
}

function showSavedLayouts(id = '') {
  savedLayoutSelect.replaceChildren(new Option('Pilih tata letak', ''))
  for (const layout of savedLayouts) savedLayoutSelect.add(new Option(layout.name, layout.id))
  savedLayoutSelect.value = id
  applyLayoutButton.disabled = !id
}

savedLayoutSelect.addEventListener('change', () => {
  applyLayoutButton.disabled = !savedLayoutSelect.value
})

/* ---------- Tatanan tersimpan per ukuran poster & jumlah foto ---------- */
const presetLayoutList = document.querySelector('#preset-layout-list')
const presetLayoutStatus = document.querySelector('#preset-layout-status')
const labelUkuran = { portrait: 'Potrait', square: 'Persegi', story: 'Story', custom: 'Bebas' }
let tatananAktifId = ''

function jumlahFotoAktif() {
  return Number(form.elements.photoLayout.value) || 0
}

function buatTatanan(name, id = buatId()) {
  return {
    id, name, template, size: posterSize, photos: jumlahFotoAktif(),
    photoLayout: form.elements.photoLayout.value,
    positions: structuredClone(blockPositions), layers: structuredClone(decorationLayers),
    sizes: structuredClone(blockSizes), hidden: [...hiddenLayers], gaya: structuredClone(gayaAset),
    photo: [form.elements.docX.value, form.elements.docY.value]
  }
}

function tatananUntuk(size = posterSize, foto = jumlahFotoAktif()) {
  return savedLayouts.filter(item => (item.size || 'portrait') === size && Number(item.photos || 0) === foto)
}

function statusTatanan(message) {
  presetLayoutStatus.textContent = message
  presetLayoutStatus.hidden = !message
}

const TATANAN_MAKS = 5
const tatananPanel = document.querySelector('#tatanan-panel')

function showPresetLayouts() {
  const daftar = tatananUntuk()
  presetLayoutList.replaceChildren()
  daftar.forEach((item, index) => {
    const pakai = document.createElement('button')
    pakai.type = 'button'
    pakai.className = 'preset-layout-item'
    pakai.textContent = String(index + 1)
    pakai.title = 'Pakai tatanan ' + (index + 1) + ' — ' + (item.name || 'tanpa nama')
    pakai.dataset.active = String(item.id === tatananAktifId)
    pakai.setAttribute('aria-label', pakai.title)
    pakai.addEventListener('click', () => pakaiTatanan(item.id))
    presetLayoutList.append(pakai)
  })
  if (!daftar.length) {
    const kosong = document.createElement('span')
    kosong.className = 'hint'
    kosong.textContent = 'Belum ada tatanan untuk ' + labelUkuran[posterSize] +
      (jumlahFotoAktif() ? ' dengan ' + jumlahFotoAktif() + ' foto.' : ' tanpa foto.')
    presetLayoutList.append(kosong)
  }
  showTatananMenu(daftar)
  const tombolSimpan = document.querySelector('#save-preset-layout')
  if (tombolSimpan) tombolSimpan.title = daftar.length >= TATANAN_MAKS
    ? 'Sudah 5 tatanan — hapus salah satu lewat tombol ⚙'
    : 'Simpan tatanan untuk ukuran & jumlah foto saat ini'
}

/* Panel setelan ⚙: daftar tatanan + tombol hapus (dengan konfirmasi). */
function showTatananMenu(daftar) {
  if (!tatananPanel) return
  tatananPanel.replaceChildren()
  const judul = document.createElement('p')
  judul.className = 'hint'
  judul.textContent = 'Tatanan ' + labelUkuran[posterSize] +
    (jumlahFotoAktif() ? ' · ' + jumlahFotoAktif() + ' foto' : ' · tanpa foto')
  tatananPanel.append(judul)
  if (!daftar.length) {
    const kosong = document.createElement('p')
    kosong.className = 'hint'
    kosong.textContent = 'Belum ada tatanan tersimpan untuk dihapus.'
    tatananPanel.append(kosong)
    return
  }
  daftar.forEach((item, index) => {
    const baris = document.createElement('div')
    baris.className = 'tatanan-baris'
    const nama = document.createElement('span')
    nama.textContent = 'Tatanan ' + (index + 1)
    const hapus = document.createElement('button')
    hapus.type = 'button'
    hapus.className = 'btn small danger'
    hapus.textContent = 'Hapus'
    hapus.addEventListener('click', () => {
      const boleh = confirm('Yakin akan menghapus Tatanan ' + (index + 1) + ' untuk ' + labelUkuran[posterSize] +
        (jumlahFotoAktif() ? ' dengan ' + jumlahFotoAktif() + ' foto' : ' tanpa foto') + '?')
      if (!boleh) return
      hapusTatanan(item.id)
    })
    baris.append(nama, hapus)
    tatananPanel.append(baris)
  })
}

async function pakaiTatanan(id) {
  const layout = savedLayouts.find(item => item.id === id)
  if (!layout) return
  if (layout.size && sizePresets[layout.size] && layout.size !== posterSize) setPosterSize(layout.size, false)
  for (const layer of decorationLayers) {
    posterBlocks.get(layer.id)?.handle.remove()
    posterBlocks.delete(layer.id)
  }
  blockPositions = structuredClone(layout.positions)
  decorationLayers = structuredClone(layout.layers)
  selectedDecorationId = decorationLayers.at(-1)?.id
  hiddenLayers.clear()
  for (const tersembunyi of layout.hidden || []) hiddenLayers.add(tersembunyi)
  for (const layer of decorationLayers) registerPosterBlock(layer.id, layer.name || decorationNames[layer.type], true)
  blockSizes = layout.sizes && typeof layout.sizes === 'object' ? structuredClone(layout.sizes) : {}
  storeLocal(blockSizeKey, blockSizes)
  gayaAset = layout.gaya && typeof layout.gaya === 'object' ? structuredClone(layout.gaya) : {}
  simpanGayaAset()
  if (layout.photoLayout !== undefined) form.elements.photoLayout.value = String(layout.photoLayout)
  ;[form.elements.docX.value, form.elements.docY.value] = Array.isArray(layout.photo) ? layout.photo : ['', '']
  tatananAktifId = id
  showLayerPanel()
  update()
  if (Object.hasOwn(backdrops, layout.template)) selectBuiltin(layout.template)
  else if (customTemplates.some(entry => entry.id === layout.template)) await selectCustom(layout.template)
  else { update(); save() }
  for (const layer of decorationLayers) if (!hiddenLayers.has(layer.id)) loadDecorationLayer(layer)
  save()
  showPresetLayouts()
  statusTatanan('Tatanan diterapkan ke pengumuman ini.')
}

function hapusTatanan(id) {
  const next = savedLayouts.filter(item => item.id !== id)
  if (!storeLocal(savedLayoutsKey, next)) return
  savedLayouts = next
  if (tatananAktifId === id) tatananAktifId = ''
  showPresetLayouts()
  showSavedLayouts()
  statusTatanan('Tatanan dihapus.')
}

document.querySelector('#save-preset-layout').addEventListener('click', () => {
  const daftar = tatananUntuk()
  const foto = jumlahFotoAktif()
  if (daftar.length >= TATANAN_MAKS) {
    statusTatanan('Maksimal ' + TATANAN_MAKS + ' tatanan untuk ' + labelUkuran[posterSize] +
      (foto ? ' dengan ' + foto + ' foto' : ' tanpa foto') + '. Hapus salah satu lewat tombol ⚙.')
    return
  }
  const nomor = daftar.length + 1
  const layout = buatTatanan('Tatanan ' + nomor + ' — ' + labelUkuran[posterSize] + (foto ? ' (' + foto + ' foto)' : ''))
  const next = [...savedLayouts, layout]
  if (!storeLocal(savedLayoutsKey, next)) {
    statusTatanan('Penyimpanan browser penuh. Hapus tatanan lama terlebih dahulu.')
    return
  }
  savedLayouts = next
  tatananAktifId = layout.id
  showPresetLayouts()
  showSavedLayouts(layout.id)
  statusTatanan('Tatanan ' + nomor + ' tersimpan untuk ' + labelUkuran[posterSize] +
    (foto ? ' dengan ' + foto + ' foto.' : ' tanpa foto.'))
})

document.querySelector('#save-layout').addEventListener('click', () => {
  const name = layoutName.value.trim()
  if (!name) {
    showLayoutStatus('Beri nama tata letak terlebih dahulu.')
    layoutName.focus()
    return
  }
  const existing = savedLayouts.find(item => item.name.toLocaleLowerCase('id') === name.toLocaleLowerCase('id'))
  const layout = buatTatanan(name, existing?.id ?? buatId())
  const next = existing ? savedLayouts.map(item => item.id === layout.id ? layout : item) : [...savedLayouts, layout]
  if (!storeLocal(savedLayoutsKey, next)) return
  savedLayouts = next
  tatananAktifId = layout.id
  showSavedLayouts(layout.id)
  showPresetLayouts()
  showLayoutStatus('Posisi dan layer tersimpan di browser ini.')
})

applyLayoutButton.addEventListener('click', async () => {
  const id = savedLayoutSelect.value
  if (!id) return
  await pakaiTatanan(id)
  showLayoutStatus('Tata letak diterapkan ke pengumuman ini.')
})

/* ---------- Pemilih font per blok teks ---------- */
const fontMenu = document.querySelector('#font-menu')
let fontMenuField = null

function syncFontButtons() {
  for (const button of document.querySelectorAll('.font-btn')) {
    const kunci = button.dataset.fontFor
    const pilihan = formalFonts[fonts[kunci]] || formalFonts.dm
    button.title = 'Font ' + (fontLabels[kunci] || kunci) + ': ' + pilihan.name
    button.dataset.active = fonts[kunci] && fonts[kunci] !== 'dm' ? '1' : '0'
    button.style.fontFamily = pilihan.stack
  }
}

function tutupFontMenu() {
  fontMenu.hidden = true
  fontMenuField = null
  for (const button of document.querySelectorAll('.font-btn')) button.setAttribute('aria-expanded', 'false')
}

function muatFont(id) {
  const font = formalFonts[id]
  if (!font || !document.fonts || !/^(DM Sans|Manrope)$/.test(font.name)) return
  document.fonts.load('700 40px "' + font.name + '"').then(() => render()).catch(() => {})
}

function pilihFont(kunci, id) {
  if (id === 'dm') delete fonts[kunci]
  else fonts = { ...fonts, [kunci]: id }
  tutupFontMenu()
  syncFontButtons()
  muatFont(id)
  render()
  save()
}

function bukaFontMenu(button) {
  const kunci = button.dataset.fontFor
  fontMenuField = kunci
  fontMenu.replaceChildren()
  const grup = new Map()
  for (const [id, font] of Object.entries(formalFonts)) {
    if (!grup.has(font.group)) grup.set(font.group, [])
    grup.get(font.group).push([id, font])
  }
  for (const [namaGrup, daftar] of grup) {
    const judul = document.createElement('h4')
    judul.textContent = namaGrup
    fontMenu.append(judul)
    for (const [id, font] of daftar) {
      const opsi = document.createElement('button')
      opsi.type = 'button'
      opsi.setAttribute('role', 'menuitemradio')
      opsi.setAttribute('aria-checked', String((fonts[kunci] || 'dm') === id))
      opsi.style.fontFamily = font.stack
      opsi.append(document.createTextNode(font.name))
      const kecil = document.createElement('small')
      kecil.textContent = id === 'dm' ? 'bawaan' : ''
      opsi.append(kecil)
      opsi.addEventListener('click', () => pilihFont(kunci, id))
      fontMenu.append(opsi)
    }
  }
  fontMenu.hidden = false
  const kotak = button.getBoundingClientRect()
  const lebar = 250
  fontMenu.style.left = Math.min(window.innerWidth - lebar - 12, Math.max(12, kotak.right - lebar)) + 'px'
  fontMenu.style.top = (kotak.bottom + window.scrollY + 6) + 'px'
  button.setAttribute('aria-expanded', 'true')
}

for (const button of document.querySelectorAll('.font-btn')) {
  button.setAttribute('aria-haspopup', 'true')
  button.setAttribute('aria-expanded', 'false')
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    if (fontMenuField === button.dataset.fontFor && !fontMenu.hidden) tutupFontMenu()
    else bukaFontMenu(button)
  })
}
document.addEventListener('click', event => {
  if (fontMenu.hidden) return
  if (event.target.closest('#font-menu') || event.target.closest('.font-btn')) return
  tutupFontMenu()
})
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') tutupFontMenu()
})
let resizeTimer = 0
window.addEventListener('resize', () => {
  if (!fontMenu.hidden) tutupFontMenu()
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => render(), 160)
})
syncFontButtons()

let documentationDrag = null

function moveDocumentation(x, y) {
  if (!docBounds) return
  form.elements.docX.value = String(Math.round(Math.max(48, Math.min(docBounds.maxX, x))))
  form.elements.docY.value = String(Math.round(Math.max(24, Math.min(docBounds.maxY, y))))
  render()
}

let fotoBergerak = false
photoDrag.addEventListener('pointerdown', event => {
  if (!docBounds || documentationDrag || event.button !== 0) return
  fotoBergerak = false
  documentationDrag = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...docBounds }
  photoDrag.setPointerCapture(event.pointerId)
})
photoDrag.addEventListener('pointermove', event => {
  if (!documentationDrag || documentationDrag.id !== event.pointerId) return
  if (Math.abs(event.clientX - documentationDrag.clientX) > 3 || Math.abs(event.clientY - documentationDrag.clientY) > 3) fotoBergerak = true
  const scale = canvas.width / (canvas.getBoundingClientRect().width * posterScale)
  const position = snapPosterPosition('photos',
    documentationDrag.x + (event.clientX - documentationDrag.clientX) * scale,
    documentationDrag.y + (event.clientY - documentationDrag.clientY) * scale, documentationDrag, {
      minX: 48, maxX: documentationDrag.maxX, minY: 24, maxY: documentationDrag.maxY
    })
  moveDocumentation(position.x, position.y)
})
photoDrag.addEventListener('lostpointercapture', () => {
  documentationDrag = null
  clearSnapGuides()
  save()
})
photoDrag.addEventListener('click', () => { if (!fotoBergerak) pilihAset('photos') })
photoDrag.addEventListener('keydown', event => {
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
  if (!direction || !docBounds) return
  event.preventDefault()
  const step = event.shiftKey ? 32 : 8
  moveDocumentation(docBounds.x + direction[0] * step, docBounds.y + direction[1] * step)
  save()
})
document.querySelector('#reset-doc-position').addEventListener('click', () => {
  form.elements.docX.value = form.elements.docY.value = ''
  render()
  save()
})

/* ---------- Geser foto banner (galeri Banner Foto) ---------- */
const bannerPanKey = 'kabar-air-banner-pan'
let bannerPan = readStorage(bannerPanKey, {})
const bannerDrag = document.querySelector('#banner-drag')
const BANNER_FRAME = { x: 245, y: 0, width: 835, height: 530 }
let bannerBounds = null
let bannerDragState = null

const bannerZoom = document.querySelector('#banner-zoom')
const bannerZoomRow = document.querySelector('#banner-zoom-row')
const bannerZoomValue = document.querySelector('#banner-zoom-value')

function panBannerAktif() {
  const nilai = bannerPan[template]
  if (!nilai) return null
  const x = Number(nilai.x) || 0
  const y = Number(nilai.y) || 0
  const z = Number(nilai.z) > 1 ? Number(nilai.z) : 1
  return x || y || z > 1 ? { x, y, z } : null
}

function zoomBannerAktif() {
  const nilai = bannerPan[template]
  return nilai && Number(nilai.z) > 1 ? Number(nilai.z) : 1
}

function batasPanBanner() {
  const image = templateArtwork.get(template)
  if (!image) return null
  const skala = Math.max(BANNER_FRAME.width / image.width, BANNER_FRAME.height / image.height) * zoomBannerAktif()
  const maxX = Math.max(0, (image.width * skala - BANNER_FRAME.width) / 2)
  const maxY = Math.max(0, (image.height * skala - BANNER_FRAME.height) / 2)
  if (maxX < 1 && maxY < 1) return null
  return { maxX, maxY }
}

function perbaruiDragBanner(backdrop, offset, skala, lebar, tinggi) {
  const foto = !!(backdrop && backdrop.kind === 'foto')
  bannerBounds = foto ? batasPanBanner() : null
  bannerDrag.hidden = !bannerBounds
  bannerZoomRow.hidden = !foto
  if (foto) {
    const z = zoomBannerAktif()
    bannerZoom.value = String(Math.round(z * 100))
    bannerZoomValue.textContent = Math.round(z * 100) + '%'
  }
  if (!bannerBounds) return
  bannerDrag.style.left = (offset + (layoutWidth - 1080 + BANNER_FRAME.x) * skala) / lebar * 100 + '%'
  bannerDrag.style.top = BANNER_FRAME.y * skala / tinggi * 100 + '%'
  bannerDrag.style.width = BANNER_FRAME.width * skala / lebar * 100 + '%'
  bannerDrag.style.height = BANNER_FRAME.height * skala / tinggi * 100 + '%'
}

function geserBanner(x, y) {
  if (!bannerBounds) return
  const nilai = {
    x: Math.round(Math.max(-bannerBounds.maxX, Math.min(bannerBounds.maxX, x))),
    y: Math.round(Math.max(-bannerBounds.maxY, Math.min(bannerBounds.maxY, y)))
  }
  const z = zoomBannerAktif()
  if (z > 1) nilai.z = z
  bannerPan = { ...bannerPan, [template]: nilai }
  storeLocal(bannerPanKey, bannerPan)
  render()
}

bannerDrag.addEventListener('pointerdown', event => {
  if (!bannerBounds || event.button !== 0) return
  bannerDragState = {
    id: event.pointerId, clientX: event.clientX, clientY: event.clientY,
    awal: panBannerAktif() || { x: 0, y: 0 }
  }
  bannerDrag.setPointerCapture(event.pointerId)
})
bannerDrag.addEventListener('pointermove', event => {
  if (!bannerDragState || bannerDragState.id !== event.pointerId) return
  const kotak = canvas.getBoundingClientRect()
  const perPiksel = canvas.width / Math.max(1, kotak.width) / posterScale
  geserBanner(bannerDragState.awal.x + (event.clientX - bannerDragState.clientX) * perPiksel,
    bannerDragState.awal.y + (event.clientY - bannerDragState.clientY) * perPiksel)
})
bannerDrag.addEventListener('lostpointercapture', () => { bannerDragState = null })
bannerDrag.addEventListener('keydown', event => {
  const arah = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
  if (!arah || !bannerBounds) return
  event.preventDefault()
  const kini = panBannerAktif() || { x: 0, y: 0 }
  const langkah = event.shiftKey ? 40 : 10
  geserBanner(kini.x + arah[0] * langkah, kini.y + arah[1] * langkah)
})
function aturZoomBanner(persen) {
  const z = Math.max(1, Math.min(2.6, persen / 100))
  const kini = panBannerAktif() || { x: 0, y: 0 }
  const image = templateArtwork.get(template)
  let x = kini.x
  let y = kini.y
  if (image) {
    const skala = Math.max(BANNER_FRAME.width / image.width, BANNER_FRAME.height / image.height) * z
    const maxX = Math.max(0, (image.width * skala - BANNER_FRAME.width) / 2)
    const maxY = Math.max(0, (image.height * skala - BANNER_FRAME.height) / 2)
    x = Math.max(-maxX, Math.min(maxX, x))
    y = Math.max(-maxY, Math.min(maxY, y))
  }
  const salinan = { ...bannerPan }
  if (z <= 1) salinan[template] = { x, y }
  else salinan[template] = { x, y, z }
  bannerPan = salinan
  storeLocal(bannerPanKey, bannerPan)
  render()
}

bannerZoom.addEventListener('input', () => aturZoomBanner(Number(bannerZoom.value)))
bannerDrag.addEventListener('wheel', event => {
  if (!bannerBounds) return
  event.preventDefault()
  aturZoomBanner(zoomBannerAktif() * 100 + (event.deltaY < 0 ? 10 : -10))
}, { passive: false })

document.querySelector('#reset-banner-photo').addEventListener('click', () => {
  const salinan = { ...bannerPan }
  delete salinan[template]
  bannerPan = salinan
  storeLocal(bannerPanKey, bannerPan)
  render()
  save()
})

const photoRows = [1, 2].map(number => document.querySelector('#photo-row-' + number))
const photoInputs = [1, 2].map(number => document.querySelector('#photo-' + number))
const removePhotos = [1, 2].map(number => document.querySelector('#remove-photo-' + number))
const photoRevisions = [0, 0]

for (const [index, input] of photoInputs.entries()) {
  input.addEventListener('change', async () => {
    const file = input.files[0]
    if (!file) return
    const revision = ++photoRevisions[index]
    removePhotos[index].hidden = false
    input.value = ''
    try {
      const berkasVideo = TIPE_VIDEO.includes(file.type) || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)
      const media = berkasVideo ? await loadVideoFile(file) : await loadImageFile(file)
      if (revision !== photoRevisions[index]) { lepasVideo(media); return }
      lepasVideo(photos[index])
      photos[index] = media
      mediaStatus.textContent = 'Media ' + (index + 1) + ' (' + (berkasVideo ? 'video' : 'foto') + ') ditambahkan.' +
        (berkasVideo ? ' Tombol Unduh Video aktif.' : ' Media tersedia selama editor terbuka.')
      render()
      perbaruiKontrolVideo()
    } catch (error) {
      if (revision !== photoRevisions[index]) return
      removePhotos[index].hidden = !photos[index]
      mediaStatus.textContent = error.message
    }
  })
  removePhotos[index].addEventListener('click', () => {
    photoRevisions[index] += 1
    lepasVideo(photos[index])
    photos[index] = null
    removePhotos[index].hidden = true
    mediaStatus.textContent = 'Media ' + (index + 1) + ' dihapus.'
    render()
    perbaruiKontrolVideo()
  })
}

const backsoundPilih = document.querySelector('#backsound-pilih')
if (backsoundPilih) {
  backsoundPilih.addEventListener('change', () => {
    backsoundDipilih = backsoundPilih.value
    mediaStatus.textContent = backsoundDipilih
      ? 'Backsound video: ' + (backsoundPilih.selectedOptions[0]?.textContent || 'MP3 terpilih') + '.'
      : 'Video akan dibuat tanpa backsound.'
  })
}

document.querySelector('#reset-poster-positions').addEventListener('click', () => {
  resetPresetPositions(posterSize)
  form.elements.docX.value = form.elements.docY.value = ''
  render()
  save()
})

/* Tombol “Muat contoh” dihapus dari header sesuai permintaan Master. */


document.querySelector('#download').addEventListener('click', async () => {
  const requestedTemplate = template
  const visibleDecorations = decorationLayers.filter(layer => !hiddenLayers.has(layer.id))
  await Promise.all([loadTemplateArtwork(requestedTemplate), ...visibleDecorations.map(loadDecorationLayer)])
  if (template !== requestedTemplate) return
  if (!form.reportValidity()) return
  const count = Number(form.elements.photoLayout.value)
  const missing = hiddenLayers.has('photos') ? -1 : photos.slice(0, count).findIndex(photo => !photo)
  if (missing !== -1) {
    mediaStatus.textContent = 'Tambahkan foto pekerjaan ' + (missing + 1) + ' untuk mengunduh tata letak ini.'
    photoInputs[missing].focus()
    return
  }
  canvas.toBlob(blob => {
    if (!blob) {
      status.textContent = 'Gambar gagal dibuat. Coba unduh lagi.'
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pengumuman-aliran-air.png'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    status.textContent = 'Poster PNG siap di folder unduhan.'
  }, 'image/png')
})

/* ---------- Unduh video 1080×1920 (9:16) + backsound dari back office ---------- */
function mimeVideo() {
  if (typeof MediaRecorder === 'undefined') return ''
  const kandidat = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ]
  return kandidat.find(tipe => MediaRecorder.isTypeSupported(tipe)) || ''
}

async function siapkanBacksound() {
  const alamat = backsoundDipilih || backsoundUrl
  if (!alamat) return null
  const Konteks = window.AudioContext || window.webkitAudioContext
  if (!Konteks) return null
  const konteks = new Konteks()
  const respons = await fetch(alamat, { cache: 'no-store' })
  if (!respons.ok) throw new Error('backsound tidak bisa diunduh')
  const buffer = await konteks.decodeAudioData(await respons.arrayBuffer())
  const sumber = konteks.createBufferSource()
  sumber.buffer = buffer
  sumber.loop = true
  const gain = konteks.createGain()
  gain.gain.value = 0.9
  const tujuan = konteks.createMediaStreamDestination()
  sumber.connect(gain).connect(tujuan)
  sumber.start()
  return { konteks, sumber, track: tujuan.stream.getAudioTracks()[0] }
}

document.querySelector('#download-video').addEventListener('click', async () => {
  const tombol = document.querySelector('#download-video')
  if (tombol.dataset.sibuk === '1') return
  if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
    status.textContent = 'Browser ini belum mendukung perekaman video. Pakai Chrome/Edge terbaru.'
    return
  }
  if (!form.reportValidity()) return
  const presetLama = posterSize
  let audio = null
  tombol.dataset.sibuk = '1'
  tombol.disabled = true
  status.textContent = 'Menyiapkan video 1080 × 1920…'
  try {
    if (posterSize !== 'story') setPosterSize('story', false)
    await Promise.all([loadTemplateArtwork(template),
      ...decorationLayers.filter(layer => !hiddenLayers.has(layer.id)).map(loadDecorationLayer)])
    render()
    const lebar = canvas.width
    const tinggi = canvas.height
    const potret = document.createElement('canvas')
    potret.width = lebar
    potret.height = tinggi
    potret.getContext('2d').drawImage(canvas, 0, 0)
    const mime = mimeVideo()
    if (!mime) throw new Error('format perekaman tidak didukung browser ini')
    const stream = canvas.captureStream(30)
    try { audio = await siapkanBacksound() } catch { audio = null }
    if (audio) stream.addTrack(audio.track)
    const bagian = []
    const perekam = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 })
    perekam.ondataavailable = event => { if (event.data && event.data.size) bagian.push(event.data) }
    const selesai = new Promise(resolve => { perekam.onstop = resolve })
    perekam.start(200)
    const durasi = 8000
    const mulai = performance.now()
    const slotVideo = videoSlots.map(slot => ({ ...slot }))
    for (const slot of slotVideo) {
      try { slot.video.currentTime = 0; await slot.video.play() } catch {}
    }
    await new Promise(resolve => {
      function gambar() {
        const t = Math.min(1, (performance.now() - mulai) / durasi)
        const zoom = 1 + 0.06 * t
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.fillStyle = '#04101f'
        ctx.fillRect(0, 0, lebar, tinggi)
        ctx.save()
        ctx.translate(lebar / 2, tinggi / 2)
        ctx.scale(zoom, zoom)
        ctx.drawImage(potret, -lebar / 2, -tinggi / 2)
        /* Video pekerjaan digambar ulang tiap frame agar ikut bergerak. */
        for (const slot of slotVideo) {
          if (slot.video.readyState < 2) continue
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 22)
          ctx.clip()
          coverImage(ctx, slot.video, slot.x, slot.y, slot.width, slot.height)
          ctx.restore()
        }
        ctx.restore()
        const redup = (1 - Math.min(1, t / 0.1) * Math.min(1, (1 - t) / 0.1)) * 0.95
        if (redup > 0.002) {
          ctx.fillStyle = 'rgba(4,16,31,' + redup.toFixed(3) + ')'
          ctx.fillRect(0, 0, lebar, tinggi)
        }
        status.textContent = 'Merekam video… ' + Math.round(t * 100) + '%'
        if (t < 1) requestAnimationFrame(gambar)
        else resolve()
      }
      requestAnimationFrame(gambar)
    })
    perekam.stop()
    await selesai
    stream.getTracks().forEach(track => track.stop())
    if (audio) { try { audio.sumber.stop() } catch {} ; try { audio.konteks.close() } catch {} ; audio = null }
    const blob = new Blob(bagian, { type: mime })
    const ekstensi = mime.startsWith('video/mp4') ? 'mp4' : 'webm'
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pengumuman-aliran-air.' + ekstensi
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    status.textContent = 'Video ' + lebar + ' × ' + tinggi + ' siap (' + ekstensi.toUpperCase() +
      ((backsoundDipilih || backsoundUrl) ? ', dengan backsound' : ', tanpa backsound') + ').'
  } catch (error) {
    status.textContent = 'Video gagal dibuat: ' + error.message
  } finally {
    if (audio) { try { audio.sumber.stop() } catch {} ; try { audio.konteks.close() } catch {} }
    for (const item of photos) {
      if (!adalahVideo(item)) continue
      try { item.video.pause(); item.video.currentTime = 0 } catch {}
    }
    tombol.dataset.sibuk = '0'
    tombol.disabled = false
    if (presetLama !== posterSize) setPosterSize(presetLama, false)
    render()
  }
})

document.querySelector('#copy').addEventListener('click', async () => {
  if (!form.reportValidity()) return
  const message = announcement(fields())
  try {
    await navigator.clipboard.writeText(message)
    status.textContent = 'Teks pengumuman disalin.'
  } catch {
    window.prompt('Salin teks pengumuman', message)
  }
})

const values = draft?.values
if (!draft?.editableCauses && values?.note && values.note === previousCauses[values.cause]?.note) values.note = ''
const previousExample = values?.agency === 'Perumda Air Minum Tirta Contoh' && values.area === 'Kelurahan Sukamaju dan sekitarnya'
populate(previousExample ? example : values)
if (sizePresets[draft?.posterSize]) posterSize = draft.posterSize
if (Number.isFinite(draft?.posterWidth)) posterWidth = draft.posterWidth
if (Number.isFinite(draft?.posterHeight)) posterHeight = draft.posterHeight
if (typeof draft?.posterHeightAuto === 'boolean') posterHeightAuto = draft.posterHeightAuto
if (sizePresets[posterSize]?.height !== undefined) {
  posterHeight = sizePresets[posterSize].height
  posterHeightAuto = false
}
if (!Object.keys(blockPositions).length) applyPresetPositions(posterSize)
syncSizeChips()
syncSizeControls()
const storedTemplate = draft?.template || defaultTemplate
if (Object.hasOwn(backdrops, storedTemplate)) template = storedTemplate
showCustomTemplates()
update()
if (customTemplates.some(entry => entry.id === storedTemplate)) selectCustom(storedTemplate)

/* Logo paten selalu dipakai; kunci logo lama di browser dibersihkan agar tidak menimpa. */
storeLocal('kabar-air-logo', null)
function loadFixedLogo(attempt = 0) {
  const sumber = logoKustom || LOGO_PATH
  const sambung = sumber.includes('?') ? '&' : '?'
  const url = logoKustom ? sumber + sambung + 'retry=' + attempt : LOGO_PATH + (attempt ? '&retry=' + attempt : '')
  decodeImage(url).then(image => setLogo(image))
    .catch(() => { if (attempt < 2) setTimeout(() => loadFixedLogo(attempt + 1), 1200) })
}
loadFixedLogo()

const pendingArtwork = new Map()

function loadArtwork(id, path, cache, isCurrent) {
  if (!path || cache.has(id)) return
  if (pendingArtwork.has(id)) return pendingArtwork.get(id)
  const pending = decodeImage(path).then(image => {
    cache.set(id, image)
    if (isCurrent()) render()
  }).catch(() => {
    if (isCurrent()) mediaStatus.textContent = 'Gambar banner gagal dimuat. Periksa unggahan di halaman admin.'
  }).finally(() => pendingArtwork.delete(id))
  pendingArtwork.set(id, pending)
  return pending
}

function loadTemplateArtwork(id) {
  return loadArtwork(id, backdrops[id]?.art, templateArtwork, () => template === id)
}

function loadDecorationLayer(layer) {
  if (layer.type === 'custom') {
    return loadArtwork(layer.id, readStorage(layer.sourceKey, null), decorationArtwork,
      () => decorationLayers.includes(layer) && !hiddenLayers.has(layer.id))
  }
  return loadArtwork(layer.type, decorationFiles[layer.type], decorationArtwork,
    () => decorationLayers.some(item => item.type === layer.type && !hiddenLayers.has(item.id)))
}

showLayerPanel()
showOrnamentGallery()
showSavedLayouts()
loadTemplateArtwork(template)
for (const layer of decorationLayers) if (!hiddenLayers.has(layer.id)) loadDecorationLayer(layer)

/* ------------------------------------------------------------------
   Data dari backend admin (template, hiasan, jenis, penyebab, wilayah).
   Bila backend tidak tersedia, aplikasi tetap memakai daftar bawaan.
   ------------------------------------------------------------------ */
const studioApi = new URLSearchParams(location.search).get('api') || ''

/* Alamat gambar dari backend dipakai apa adanya bila satu domain; kalau aplikasi
   dibuka dari origin lain (mis. ?api=https://...), alamat /api/... diberi awalan API. */
function alamatMedia(url) {
  if (!url || typeof url !== 'string') return url
  if (!studioApi || !url.startsWith('/')) return url
  return studioApi.replace(/\/$/, '') + url
}

function applyServerData(data) {
  let changed = false
  if (data.settings && typeof data.settings === 'object') {
    const nama = typeof data.settings.name === 'string' ? data.settings.name.trim() : ''
    if (nama) agency = nama
    const logoSebenarnya = typeof data.settings.logo === 'string' ? data.settings.logo : ''
    if (logoSebenarnya !== logoKustom) {
      logoKustom = logoSebenarnya
      loadFixedLogo()
    }
    backsoundUrl = typeof data.settings.backsound === 'string' ? data.settings.backsound : ''
    backsoundNama = typeof data.settings.backsoundName === 'string' ? data.settings.backsoundName : ''
    changed = true
    if (typeof perbaruiKontrolVideo === 'function') perbaruiKontrolVideo()
  }
  if (Array.isArray(data.pipeArt) && data.pipeArt.length) {
    for (const [id, item] of Object.entries(backdrops)) if (item.server && item.kind === 'foto') delete backdrops[id]
    for (const item of data.pipeArt) {
      backdrops[item.id] = {
        name: item.name,
        colors: FOTO_COLORS,
        art: alamatMedia(item.image) || null,
        kind: 'foto',
        badges: false,
        server: true
      }
    }
    changed = true
  }
  if (Array.isArray(data.templates) && data.templates.length) {
    for (const [id, item] of Object.entries(backdrops)) {
      if (!item.custom && item.kind !== 'foto') delete backdrops[id]
    }
    for (const item of data.templates) {
      backdrops[item.id] = {
        name: item.name,
        colors: Array.isArray(item.colors) && item.colors.length === 3 ? item.colors : ['#071c35', '#125071', '#9eecff'],
        art: alamatMedia(item.image) || null,
        kind: 'animasi',
        animation: item.animation === 'water' ? 'water' : undefined,
        badges: false,
        server: true
      }
    }
    if (!Object.hasOwn(backdrops, template)) template = data.templates[0].id
    changed = true
  }
  if (Array.isArray(data.templates) && data.templates.length) {
    showAnimatedGallery()
    showPhotoGallery()
  }
  if (Array.isArray(data.decorations) && data.decorations.length) {
    for (const key of Object.keys(decorationNames)) delete decorationNames[key]
    for (const key of Object.keys(decorationFiles)) delete decorationFiles[key]
    const lokal = ornamentTemplates.filter(item => item.type === 'custom' || item.sourceKey)
    for (const item of data.decorations) {
      decorationNames[item.id] = item.name
      decorationFiles[item.id] = alamatMedia(item.image)
    }
    ornamentTemplates = [
      ...data.decorations.map(item => ({ id: item.id, type: item.id, name: item.name })),
      ...lokal.filter(item => !data.decorations.some(server => server.id === item.id))
    ]
    showOrnamentGallery()
    changed = true
  }
  if (Array.isArray(data.causes) && data.causes.length) {
    causes = data.causes.map(item => ({
      id: item.id,
      alias: item.id.startsWith('penyebab-') ? item.id.slice('penyebab-'.length) : item.id,
      title: item.name,
      text: (item.body && item.body.text) || ''
    }))
    populateCauseOptions()
    changed = true
  }
  if (Array.isArray(data.areas)) {
    areaLists = data.areas.map(item => ({
      id: item.id, title: item.name, text: ((item.body && item.body.items) || []).join('\n')
    }))
    populateAreaMenu(areaMenu.value)
    changed = true
  }
  if (Array.isArray(data.types) && data.types.length) {
    const select = form.elements.type
    const current = select.value
    const daftar = data.types.map(item => item.name)
    select.replaceChildren(...data.types.map(item => new Option(item.name, item.name)),
      new Option('Judul Sendiri', 'Judul Sendiri'))
    select.value = daftar.includes(current) || current === 'Judul Sendiri' ? current : daftar[0]
    changed = true
  }
  if (changed) {
    update()
    loadTemplateArtwork(template)
  }
}

async function loadServerData() {
  try {
    const response = await fetch(studioApi + '/api/data', { cache: 'no-store' })
    if (!response.ok) return
    applyServerData(await response.json())
  } catch (error) {
    /* offline / backend mati: daftar bawaan tetap dipakai */
  }
}
loadServerData()
