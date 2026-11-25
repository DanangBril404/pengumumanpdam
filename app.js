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
  area: 'Wilayah terdampak', advice: 'Imbauan pelanggan',
  caption1: 'Keterangan foto 1', caption2: 'Keterangan foto 2'
}
const canvas = document.querySelector('#poster')
const ctx = canvas.getContext('2d')
const status = document.querySelector('#status')
const agency = 'Perumda Air Minum Kota Magelang'
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
  titleExtra: '',
  cause: '',
  agency,
  area: sampleAreas.join('\n'),
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  finishMode: 'scheduled',
  note: '',
  advice: 'Pelanggan di wilayah terdampak diimbau menampung air secukupnya untuk kebutuhan rumah tangga.',
  advicePosition: 'after',
  adviceX: '50',
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
const sizePresets = {
  portrait: { min: 1350, max: 1760 },
  square: { fixed: 1080 },
  story: { fixed: 1920 }
}
let posterSize = 'portrait'
let docBounds = null
const photoDrag = document.querySelector('#photo-drag')
const documentationWidth = 840
const photos = [null, null]
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
  const width = 1080
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
  const threshold = 8 * 1080 / (canvas.getBoundingClientRect().width * posterScale)
  const sx = snapAxis(x, box.width, horizontal, threshold, limits.minX, limits.maxX)
  const sy = snapAxis(y, box.height, vertical, threshold, limits.minY, limits.maxY)
  snapX.hidden = sx.guide === null
  snapY.hidden = sy.guide === null
  if (!snapX.hidden) snapX.style.left = ((1080 - width * posterScale) / 2 + sx.guide * posterScale) / 1080 * 100 + '%'
  if (!snapY.hidden) snapY.style.top = sy.guide * posterScale / canvas.height * 100 + '%'
  return { x: sx.position, y: sy.position }
}

const posterBlocks = new Map()
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
  function move(x, y) {
    blockPositions[id] = { x, y }
    render()
  }
  handle.addEventListener('pointerdown', event => {
    const bounds = posterBlocks.get(id).bounds
    if (!bounds || drag || event.button !== 0) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, bounds }
    handle.setPointerCapture(event.pointerId)
  })
  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return
    const scale = 1080 / (canvas.getBoundingClientRect().width * posterScale)
    const position = snapPosterPosition(id, drag.bounds.x + (event.clientX - drag.x) * scale,
      drag.bounds.y + (event.clientY - drag.y) * scale, drag.bounds,
      posterBlockLimits(drag.bounds.width, drag.bounds.height))
    move(position.x, position.y)
  })
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
  const extraX = 1080 - width
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
  const nextX = saved ? Math.max(limits.minX, Math.min(limits.maxX, saved.x)) : x
  const nextY = saved ? Math.max(limits.minY, Math.min(limits.maxY, saved.y)) : baseY
  entry.bounds = { x: nextX, y: nextY, width, height }
  const style = entry.handle.style
  const left = transform.e + nextX * posterScale
  const top = nextY * posterScale
  style.left = Math.max(0, left) / 1080 * 100 + '%'
  style.top = Math.max(0, top) / canvas.height * 100 + '%'
  style.width = (Math.min(1080, left + width * posterScale) - Math.max(0, left)) / 1080 * 100 + '%'
  style.height = (Math.min(canvas.height, top + height * posterScale) - Math.max(0, top)) / canvas.height * 100 + '%'
  entry.handle.hidden = false
  ctx.save()
  ctx.translate(nextX - x, nextY - baseY)
  draw()
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
  form.elements.agency.value = agency
  syncCauseOptions(form.elements.cause.value)
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

function drawSchedule(day, time, x, dark, bright, until = false) {
  if (until) {
    label('SAMPAI SELESAI', x, 616, 36, dark, 800)
    return
  }
  const date = displayDate(day)
  const hour = displayTime(time)
  label(date || (!hour ? 'Belum diinformasikan' : ''), x, 595, 29, dark)
  if (hour) label(hour, x, date ? 642 : 616, 41, bright, 800)
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
  ctx.fillStyle = color
  typeface(size, weight)
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
  let lines
  do {
    typeface(size, weight)
    lines = wrap(text, width)
    if (lines.length <= lineLimit) break
    size -= 1
  } while (size > 10)
  ctx.fillStyle = color
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * size * 1.23))
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
    label('Foto pekerjaan ' + (index + 1), x + width / 2, y + height / 2 + 9, 28, '#294b6e')
    ctx.textAlign = 'start'
    return
  }
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 22)
  ctx.clip()
  coverImage(ctx, image, x, y, width, height)
  ctx.restore()
}

function drawDocumentation(f, x, y, count, height, repair, accent) {
  const width = count === 1 ? documentationWidth : (documentationWidth - 18) / 2
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
      block(caption || 'Foto pekerjaan ' + (index + 1), photoX + inset, top + height - 24,
        width - inset - 22, 1, 23, '#ffffff', 600)
    }
  }
  setFont()
}

function drawAdvice(f, y, lines, fontSize, height, dark) {
  const x = 64 + Number(f.adviceX) / 100 * 112
  rounded(x, y, 840, height, 22, '#fff0bb')
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
  label('IMBAUAN PELANGGAN', x + 90, y + 32, 19, dark, 800)
  setFont('advice')
  lines.forEach((line, index) => label(line, x + 90, y + 67 + index * (fontSize + 7), fontSize, dark, 700))
}

function render() {
  const f = fields()
  for (const entry of posterBlocks.values()) entry.bounds = null
  const backdrop = Object.hasOwn(backdrops, template) ? backdrops[template] : backdrops[defaultTemplate]
  const [dark, bright, accent] = backdrop.colors
  const repair = Object.hasOwn(backdrops, template)
  const showArtwork = !hiddenLayers.has('artwork')
  const animate = repair && showArtwork && backdrop.animation === 'water'
  const cause = selectedCause(f.cause)
  const title = f.customTitle || f.type || example.type
  const titleSize = Math.round((repair ? 64 : 61) * Number(f.titleScale) / 100)
  const titleWidth = repair ? 620 : 950
  const heading = repair && !f.customTitle && f.type === example.type && cause
    ? title + '\n' + cause.title : title
  setFont('title')
  typeface(titleSize, 800)
  const titleLines = wrap(heading, titleWidth)
  const titleStep = Math.round(titleSize * 1.12)
  const titleY = repair ? 311 : 286
  const titleEnd = titleY + (titleLines.length - 1) * titleStep
  const extraSize = repair ? 31 : 28
  setFont('extra')
  typeface(extraSize, 700)
  const extraLines = f.titleExtra ? wrap(f.titleExtra, repair ? 800 : 950) : []
  const extraY = Math.max(repair ? 450 : 316, titleEnd + extraSize + 12)
  const extraEnd = extraLines.length ? extraY + (extraLines.length - 1) * (extraSize + 8) : titleEnd
  const underline = Math.max(436, extraEnd + 23)
  const shift = repair ? repairHeroOffset + Math.max(0, underline - 500) : Math.max(0, extraEnd - 300)
  const photoCount = hiddenLayers.has('photos') ? 0 : Number(f.photoLayout)
  const photoHeight = repair ? (photoCount === 1 ? 455 : 394) : (photoCount === 1 ? 355 : 320)
  const photoSpace = photoCount ? photoHeight + 64 : 0
  const areas = locations(f.area)
  setFont('area')
  typeface(27, 600)
  const columns = areas.length >= 6 ? 2 : 1
  const areaWidth = columns === 2 ? 439 : 900
  const areaLines = (areas.length ? areas : ['Belum diinformasikan']).map(area => wrap(area, areaWidth - 32))
  const split = columns === 2 ? Math.ceil(areaLines.length / 2) : areaLines.length
  const left = areaLines.slice(0, split)
  const right = areaLines.slice(split)
  const heightOf = group => group.reduce((sum, lines) => sum + lines.length * 34 + 8, 0)
  const areaHeight = Math.max(heightOf(left), heightOf(right))
  const adviceSize = Math.round(28 * Number(f.adviceScale) / 100)
  setFont('advice')
  typeface(adviceSize, 700)
  const adviceLines = f.advice ? wrap(f.advice, 725) : []
  const adviceHeight = adviceLines.length ? 85 + (adviceLines.length - 1) * (adviceSize + 7) : 0
  const adviceSpace = adviceHeight ? adviceHeight + 23 : 0
  const footerHeight = 100
  const naturalHeight = 974 + areaHeight + footerHeight - 100 + photoSpace + shift + adviceSpace
  const preset = sizePresets[posterSize] || sizePresets.portrait
  const height = photoCount ? Math.max(1920, preset.fixed || 0)
    : preset.fixed || Math.max(preset.min, Math.min(preset.max, naturalHeight + 48))
  const spacing = Math.floor(Math.max(0, height - naturalHeight) / 4)
  posterScale = Math.min(1, height / naturalHeight)
  const offset = (1080 - 1080 * posterScale) / 2
  if (canvas.height !== height) canvas.height = height
  const zoom = previewZoom / 100
  const lebarMaks = (570 * zoom).toFixed(0) + 'px'
  const tinggiMaks = (1080 * 65 / height * zoom).toFixed(1) + 'vh'
  posterWrap.style.width = zoom > 1 ? 'min(' + lebarMaks + ', ' + tinggiMaks + ')' : 'min(100%, ' + lebarMaks + ', ' + tinggiMaks + ')'
  repairSpray.style.setProperty('--spray-top', (429 * posterScale / height * 100) + '%')
  motionControl.hidden = !animate
  repairSpray.hidden = !animate || !motion.checked
  document.querySelector('#poster-size').textContent = canvas.width + ' × ' + height + ' px'
  canvas.setAttribute('aria-label', announcement(f))
  paintBackdrop(ctx, height, backdrop, showArtwork ? customBackground : null, baseColor)
  ctx.save()
  ctx.translate(offset, 0)
  ctx.scale(posterScale, posterScale)
  for (const layer of decorationLayers) {
    const image = layer.type === 'custom' ? decorationArtwork.get(layer.id) : null
    if (layer.type === 'custom' && !image) continue
    const logicalHeight = height / posterScale
    const width = Math.round(1040 * layer.width / 100)
    const x = (1080 - width) / 2
    const artHeight = image ? width * image.height / image.width : Math.floor(logicalHeight * .75)
    const y = image ? (logicalHeight - artHeight) / 2 : logicalHeight - artHeight
    renderBlock(layer.id, x, y, width, artHeight, () => {
      if (image) {
        ctx.drawImage(image, x, y, width, artHeight)
      } else {
        ctx.save()
        ctx.translate(x, y)
        paintPosterDecoration(ctx, layer.type, width, artHeight, accent)
        ctx.restore()
      }
    })
  }
  if (repair && showArtwork) {
    paintRepairHero(ctx, backdrop, backdrop.manual ? manualImage : templateArtwork.get(template),
      hiddenLayers.has('logo') ? null : logo, f)
  }
  setFont()

  if (logo) renderBlock('logo', 55, 33, 148, 148, () => paintLogo(ctx, logo, 121, 99, 148))
  const agencyX = logo ? 201 : 65
  renderBlock('agency', agencyX, 42, 530, 104, () => {
    ctx.shadowColor = '#061421'
    ctx.shadowBlur = 12
    label('PERUMDA AIR MINUM', agencyX, 90, 45, '#ffffff', 800)
    label('KOTA MAGELANG', agencyX, 132, 33, '#ffffff', 800)
  })

  renderBlock('banner', 64, 180, 324, 44, () => {
    if (repair) {
      rounded(64, 181, 324, 43, 21, '#ffd066')
      label('INFORMASI LAYANAN AIR', 84, 209, 21, '#0b2943', 800)
    } else {
      label('INFORMASI LAYANAN AIR', 65, 203, 24, accent)
    }
  })
  renderBlock('title', 60, titleY - titleSize, titleWidth, titleEnd - titleY + titleSize + 16, () => {
    setFont('title')
    titleLines.forEach((line, index) => label(line, 60, titleY + index * titleStep, titleSize, '#ffffff', 800))
    if (repair) {
      ctx.fillStyle = '#ffd066'
      ctx.fillRect(65, titleEnd + 16, 87, 5)
    }
  })
  if (extraLines.length) {
    renderBlock('extra', 65, extraY - extraSize, repair ? 800 : 950, extraEnd - extraY + extraSize + 12, () => {
      setFont('extra')
      extraLines.forEach((line, index) => label(line, 65, extraY + index * (extraSize + 8), extraSize, '#ffffff'))
    })
  }

  ctx.save()
  ctx.translate(0, shift + spacing)
  renderBlock('cause', 64, 325, 952, 172, () => {
    rounded(64, 325, 952, 172, 23, '#fff0bb')
    setFont('note')
    block(cause?.title || 'Rincian Pengumuman', 94, 371, 890, 1, 32, dark, 800)
    block(f.note.replace(/\s+/g, ' ') || 'Belum diinformasikan', 94, 410, 890, 3, 25, dark, 600)
  })

  ctx.translate(0, spacing)
  renderBlock('schedule', 64, 516, 952, 162, () => {
    rounded(64, 516, 952, 162, 23, '#ffffff')
    ctx.fillStyle = '#d8e7f0'
    ctx.fillRect(540, 539, 2, 115)
    label('MULAI PEKERJAAN', 94, 553, 21, bright)
    label('PERKIRAAN SELESAI', 570, 553, 21, bright)
    drawSchedule(f.startDate, f.startTime, 94, dark, bright)
    drawSchedule(f.endDate, f.endTime, 570, dark, bright, f.finishMode === 'until')
  })

  ctx.translate(0, 52 + spacing)
  const showAdvice = y => renderBlock('advice', 64 + Number(f.adviceX) / 100 * 112, y, 840, adviceHeight,
    () => drawAdvice(f, y, adviceLines, adviceSize, adviceHeight, dark))
  if (adviceSpace && f.advicePosition === 'before') {
    showAdvice(646)
    ctx.translate(0, adviceSpace)
  }

  renderBlock('areas', 64, 650, 952, areaHeight + 76, () => {
    label('WILAYAH TERDAMPAK', 65, 677, 26, accent)
    rounded(64, 695, 952, areaHeight + 31, 22, '#ffffff')
    setFont('area')
    for (const [index, group] of [left, right].entries()) {
      const x = 93 + index * 463
      let y = 731
      for (const lines of group) {
        label('•', x, y, 27, bright)
        for (const line of lines) {
          label(line, x + 27, y, 27, dark, 600)
          y += 34
        }
        y += 8
      }
    }
  })

  const afterPhotos = photoCount && f.advicePosition === 'photos'
  if (adviceSpace && f.advicePosition !== 'before' && !afterPhotos) {
    showAdvice(744 + areaHeight)
    ctx.translate(0, adviceSpace)
  }
  if (adviceSpace && afterPhotos) showAdvice(851 + areaHeight + photoHeight)
  ctx.restore()

  const footerTop = height / posterScale - footerHeight - 31
  photoDrag.hidden = !photoCount || hiddenLayers.has('photos')
  docBounds = null
  if (!photoDrag.hidden) {
    const docHeight = photoHeight + 35
    const maxX = 1080 - documentationWidth - 48
    const maxY = footerTop - docHeight - 12
    const defaultY = 846 + areaHeight + shift + spacing * 3 + (afterPhotos ? 0 : adviceSpace)
    const x = Math.max(48, Math.min(maxX, f.docX === '' ? 120 : Number(f.docX)))
    const y = Math.max(24, Math.min(maxY, f.docY === '' ? defaultY : Number(f.docY)))
    docBounds = { x, y, width: documentationWidth, height: docHeight, maxX, maxY }
    drawDocumentation(f, x, y, photoCount, photoHeight, repair, accent)
    photoDrag.style.left = (offset + x * posterScale) / 1080 * 100 + '%'
    photoDrag.style.top = y * posterScale / height * 100 + '%'
    photoDrag.style.width = documentationWidth * posterScale / 1080 * 100 + '%'
    photoDrag.style.height = docHeight * posterScale / height * 100 + '%'
  }
  renderBlock('socials', 64, footerTop, 952, footerHeight, () => {
    setFont()
    rounded(64, footerTop, 952, footerHeight, 19, dark)
    for (const [index, account] of socials.entries()) {
      const x = index % 2 === 0 ? 87 : 550
      const y = footerTop + (index < 2 ? 37 : 75)
      drawSocial(index, account.split('  ')[1], x, y, index % 2 === 0 ? 445 : 440)
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
  try { localStorage.setItem(storageKey, JSON.stringify({ values: fields(), template, editableCauses: true, blockPositions, magnetEnabled, decorationLayers, hiddenLayers: [...hiddenLayers], fonts, baseColor, posterSize })) } catch {}
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
  const count = Number(form.elements.photoLayout.value)
  document.querySelector('#doc-position').hidden = !count
  for (const [index, row] of photoRows.entries()) row.hidden = index >= count
  render()
}

form.addEventListener('submit', event => event.preventDefault())
form.addEventListener('input', event => {
  if (event.target === form.elements.photoLayout) form.elements.docX.value = form.elements.docY.value = ''
  if (event.target === form.elements.advicePosition || event.target === form.elements.adviceX) delete blockPositions.advice
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

const syncCauseOptions = mountPresetEditor({
  id: '#cause-presets', entries: causes, key: 'kabar-air-cause-presets', placeholder: 'Pilih penyebab',
  currentText: () => form.elements.note.value,
  changed: (entries, id) => {
    causes = entries
    if (id) form.elements.note.value = selectedCause(id).text
    update()
    save()
  }
})
const areaMenu = document.querySelector('#area-menu')
const areaMaster = document.querySelector('#area-master')
const areaMasterText = document.querySelector('#area-master-text')
const areaMasterStatus = document.querySelector('#area-master-status')
const areaMasterKey = 'kabar-air-area-master'
const areaListsKey = 'kabar-air-area-lists'
const areaListName = document.querySelector('#area-list-name')
const areaNameRow = document.querySelector('#area-name-row')
const areaListLabel = document.querySelector('#area-list-label')
const deleteAreaList = document.querySelector('#delete-area-list')
let areaLists = readStorage(areaListsKey, [])
let areaSelection = ''

function showAreaMasterStatus(message) {
  areaMasterStatus.textContent = message
  areaMasterStatus.hidden = !message
}

function useMasterAreas(text) {
  form.elements.area.value = text
  update()
  save()
}

function populateAreaMenu(selected = '') {
  areaMenu.replaceChildren(new Option('Pilih menu wilayah', ''), new Option('Master Wilayah Terdampak', 'master'))
  for (const entry of areaLists) areaMenu.add(new Option(entry.title, entry.id))
  areaMenu.value = selected
}

function openAreaList(id, title, text, apply = false) {
  areaSelection = id
  areaMaster.hidden = false
  areaNameRow.hidden = id === 'master'
  deleteAreaList.hidden = !id || id === 'master'
  areaListLabel.textContent = id === 'master' ? 'Master Wilayah Terdampak' : id ? 'Edit pilihan wilayah' : 'Pilihan wilayah baru'
  areaListName.value = title
  areaMasterText.value = text
  showAreaMasterStatus(apply ? 'Daftar wilayah dimasukkan ke poster.' : '')
  if (apply) useMasterAreas(text)
  if (id) areaMasterText.focus()
  else areaListName.focus()
}

populateAreaMenu()
areaMenu.addEventListener('change', () => {
  if (areaMenu.value === '') {
    areaMaster.hidden = true
    showAreaMasterStatus('')
    return
  }
  if (areaMenu.value === 'master') {
    const saved = readStorage(areaMasterKey, null)
    const previous = readStorage('kabar-air-area-presets', []).find(entry =>
      entry.title.trim().toLocaleLowerCase('id') === 'master wilayah terdampak')
    openAreaList('master', '', saved ?? previous?.text ?? form.elements.area.value, saved !== null)
    return
  }
  const entry = areaLists.find(item => item.id === areaMenu.value)
  if (entry) openAreaList(entry.id, entry.title, entry.text, true)
})

document.querySelector('#new-area-list').addEventListener('click', () => {
  areaMenu.value = ''
  openAreaList('', '', '')
})

document.querySelector('#save-area-master').addEventListener('click', () => {
  const unique = new Map()
  for (const area of locations(areaMasterText.value)) {
    const key = area.toLocaleLowerCase('id')
    if (!unique.has(key)) unique.set(key, area)
  }
  const text = [...unique.values()].join('\n')
  if (areaSelection === 'master') {
    if (!storeLocal(areaMasterKey, text)) return
  } else {
    const title = areaListName.value.trim()
    if (!title || !text) {
      showAreaMasterStatus('Isi nama pilihan dan minimal satu wilayah.')
      return
    }
    const key = title.toLocaleLowerCase('id')
    if (key === 'master wilayah terdampak' || areaLists.some(item =>
      item.id !== areaSelection && item.title.toLocaleLowerCase('id') === key)) {
      showAreaMasterStatus('Nama pilihan sudah digunakan.')
      return
    }
    const entry = { id: areaSelection || buatId(), title, text }
    const next = areaSelection ? areaLists.map(item => item.id === entry.id ? entry : item) : [...areaLists, entry]
    if (!storeLocal(areaListsKey, next)) return
    areaLists = next
    populateAreaMenu(entry.id)
    openAreaList(entry.id, title, text)
  }
  areaMasterText.value = text
  useMasterAreas(text)
  showAreaMasterStatus('Daftar disimpan dan diterapkan ke poster.')
})

deleteAreaList.addEventListener('click', () => {
  if (!areaSelection || areaSelection === 'master') return
  const next = areaLists.filter(item => item.id !== areaSelection)
  if (!storeLocal(areaListsKey, next)) return
  areaLists = next
  populateAreaMenu()
  areaMaster.hidden = true
  showAreaMasterStatus('Pilihan wilayah dihapus dari dropdown.')
  areaMenu.focus()
})

document.querySelector('#close-area-master').addEventListener('click', () => {
  areaMenu.value = ''
  areaMaster.hidden = true
  showAreaMasterStatus('')
  areaMenu.focus()
})

document.querySelector('#clear-areas').addEventListener('click', () => {
  form.elements.area.value = ''
  update()
  save()
})

/* Logo instansi bersifat paten: berkas logo-perumda.png di server, tanpa menu unggah. */
const LOGO_PATH = 'logo-instansi.jpg?v=20261124m'

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

/* Ukuran poster: Potrait / Persegi / Story */
const sizeButtons = [...document.querySelectorAll('[data-size]')]
function syncSizeChips() {
  for (const button of sizeButtons) button.setAttribute('aria-pressed', String(button.dataset.size === posterSize))
}
function setPosterSize(size, persist = true) {
  if (!sizePresets[size]) return
  posterSize = size
  syncSizeChips()
  render()
  if (persist) save()
}
for (const button of sizeButtons) button.addEventListener('click', () => setPosterSize(button.dataset.size))

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
const customInput = document.querySelector('#custom-background')
const customSelect = document.querySelector('#saved-backgrounds')
const customRow = document.querySelector('#saved-background-row')
const deleteBackground = document.querySelector('#delete-background')
const backgroundsKey = 'kabar-air-custom-backgrounds'
let customTemplates = readStorage(backgroundsKey, [])
let backgroundRevision = 0

function showCustomTemplates() {
  customSelect.replaceChildren(new Option('Pilih latar sendiri', ''))
  for (const entry of customTemplates) customSelect.add(new Option(entry.name, entry.id))
  customSelect.value = customTemplates.some(entry => entry.id === template) ? template : ''
  customRow.hidden = customTemplates.length === 0
  deleteBackground.disabled = !customSelect.value
}

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

/* ---------- Galeri template perbaikan listrik (unggah + hapus + tersimpan) ---------- */
const electricalKey = 'kabar-air-electrical-templates'
let electricalTemplates = readStorage(electricalKey, [])
const electricalGallery = document.querySelector('#electrical-templates')
const electricalStatus = document.querySelector('#electrical-status')

function daftarkanElectrical() {
  for (const entry of electricalTemplates) {
    if (!entry?.id) continue
    backdrops[entry.id] = {
      name: entry.name || 'Template listrik',
      colors: Array.isArray(entry.colors) && entry.colors.length === 3 ? entry.colors : ['#21243a', '#51476d', '#ffe2a2'],
      electrical: true,
      custom: true,
      art: readStorage(entry.sourceKey, '') || ''
    }
  }
}

function tampilStatusElectrical(pesan) {
  electricalStatus.hidden = !pesan
  electricalStatus.textContent = pesan
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

function showElectricalGallery() {
  electricalGallery.replaceChildren()
  for (const [id, backdrop] of Object.entries(backdrops)) {
    if (!backdrop.electrical || backdrop.custom) continue
    electricalGallery.append(buatTile(id, backdrop))
  }
  for (const entry of electricalTemplates) {
    const backdrop = backdrops[entry.id]
    if (!backdrop) continue
    const bungkus = document.createElement('div')
    bungkus.className = 'electrical-tile'
    const hapus = document.createElement('button')
    hapus.type = 'button'
    hapus.className = 'electrical-delete'
    hapus.textContent = '×'
    hapus.title = 'Hapus ' + entry.name + ' dari galeri'
    hapus.setAttribute('aria-label', hapus.title)
    hapus.addEventListener('click', event => {
      event.stopPropagation()
      hapusElectrical(entry)
    })
    bungkus.append(buatTile(entry.id, backdrop), hapus)
    electricalGallery.append(bungkus)
  }
}

function hapusElectrical(entry) {
  const next = electricalTemplates.filter(item => item.id !== entry.id)
  if (!storeLocal(electricalKey, next)) return
  electricalTemplates = next
  try { localStorage.removeItem(entry.sourceKey) } catch {}
  delete backdrops[entry.id]
  templateArtwork.delete(entry.id)
  if (template === entry.id) selectBuiltin(defaultTemplate)
  showElectricalGallery()
  tampilStatusElectrical('Template listrik dihapus dari galeri.')
}

const electricalUpload = document.querySelector('#upload-electrical')
electricalUpload.addEventListener('change', async () => {
  const files = Array.from(electricalUpload.files)
  electricalUpload.value = ''
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
      const id = 'listrik-' + buatId()
      const sourceKey = 'kabar-air-listrik-' + id
      if (!storeLocal(sourceKey, kanvas.toDataURL('image/webp', .9))) {
        pesan = 'Penyimpanan browser penuh. Hapus template listrik lama untuk menambah gambar.'
        continue
      }
      const entry = {
        id,
        name: (file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Template listrik'),
        sourceKey
      }
      const next = [...electricalTemplates, entry]
      if (!storeLocal(electricalKey, next)) {
        try { localStorage.removeItem(sourceKey) } catch {}
        pesan = 'Template belum tersimpan. Kosongkan sebagian penyimpanan browser.'
        continue
      }
      electricalTemplates = next
      backdrops[id] = {
        name: entry.name, colors: ['#21243a', '#51476d', '#ffe2a2'],
        electrical: true, custom: true, art: readStorage(sourceKey, '')
      }
      ditambah++
      await selectBuiltin(id)
    } catch (error) {
      pesan = error.message
    }
  }
  showElectricalGallery()
  tampilStatusElectrical([ditambah ? ditambah + ' template listrik tersimpan dan langsung dipakai.' : '', pesan].filter(Boolean).join(' '))
})

daftarkanElectrical()

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

for (const [id, backdrop] of Object.entries(backdrops)) {
  if (backdrop.electrical || backdrop.custom) continue
  document.querySelector('#pipe-templates').append(buatTile(id, backdrop))
}
showElectricalGallery()

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

const decorationUpload = document.querySelector('#upload-decoration')
const decorationStatus = document.querySelector('#decoration-status')
const decorationWidth = document.querySelector('#decoration-width')
const decorationWidthValue = document.querySelector('#decoration-width-value')
const decorationWidthRow = document.querySelector('#decoration-width-row')
const layerList = document.querySelector('#layer-list')

function showDecorationStatus(message) {
  decorationStatus.hidden = !message
  decorationStatus.textContent = message
}

function showLayerPanel() {
  layerList.replaceChildren()
  const fixed = [['artwork', 'Ilustrasi dan latar gambar'], ...Object.entries(movableLabels), ['photos', 'Foto dokumentasi']]
  for (const [id, name] of fixed) addLayerRow(id, name)
  for (const layer of [...decorationLayers].reverse()) {
    addLayerRow(layer.id, layer.name || decorationNames[layer.type], layer)
  }
  const active = decorationLayers.find(layer => layer.id === selectedDecorationId)
  decorationWidthRow.hidden = !active
  if (active) {
    decorationWidth.value = String(active.width)
    decorationWidthValue.textContent = active.width + '%'
  }
}

function addLayerRow(id, name, layer) {
  const row = document.createElement('div')
  row.className = 'layer-row'
  row.dataset.selected = String(selectedDecorationId === id)
  const title = document.createElement(layer ? 'button' : 'span')
  title.className = layer ? 'layer-name layer-action' : 'layer-name'
  title.textContent = name
  if (layer) {
    title.type = 'button'
    title.setAttribute('aria-label', 'Atur lebar ' + name)
    title.addEventListener('click', () => {
      selectedDecorationId = id
      showLayerPanel()
      decorationWidth.focus()
    })
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
  row.append(title, toggle)
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

function addDecorationLayer(layer) {
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
    const remove = document.createElement('button')
    remove.className = 'ornament-delete layer-action icon-button'
    remove.type = 'button'
    remove.textContent = '×'
    remove.title = 'Hapus template ' + item.name
    remove.setAttribute('aria-label', remove.title)
    remove.addEventListener('click', () => {
      const next = ornamentTemplates.filter(entry => entry.id !== item.id)
      if (!storeLocal(ornamentGalleryKey, next)) return
      ornamentTemplates = next
      pruneOrnamentSource(item.sourceKey)
      showOrnamentGallery()
      showDecorationStatus('Template dihapus dari galeri.')
      decorationUpload.focus()
    })
    tile.append(add, remove)
    ornamentGallery.append(tile)
  }
}

decorationWidth.addEventListener('input', () => {
  const layer = decorationLayers.find(item => item.id === selectedDecorationId)
  if (!layer) return
  layer.width = Number(decorationWidth.value)
  decorationWidthValue.textContent = layer.width + '%'
  render()
  save()
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

document.querySelector('#save-layout').addEventListener('click', () => {
  const name = layoutName.value.trim()
  if (!name) {
    showLayoutStatus('Beri nama tata letak terlebih dahulu.')
    layoutName.focus()
    return
  }
  const existing = savedLayouts.find(item => item.name.toLocaleLowerCase('id') === name.toLocaleLowerCase('id'))
  const photo = [form.elements.docX.value, form.elements.docY.value]
  const advice = [form.elements.advicePosition.value, form.elements.adviceX.value]
  const layout = {
    id: existing?.id ?? buatId(), name, template,
    positions: structuredClone(blockPositions), layers: structuredClone(decorationLayers),
    hidden: [...hiddenLayers], photo, advice
  }
  const next = existing ? savedLayouts.map(item => item.id === layout.id ? layout : item) : [...savedLayouts, layout]
  if (!storeLocal(savedLayoutsKey, next)) return
  savedLayouts = next
  showSavedLayouts(layout.id)
  showLayoutStatus('Posisi dan layer tersimpan di browser ini.')
})

applyLayoutButton.addEventListener('click', async () => {
  const layout = savedLayouts.find(item => item.id === savedLayoutSelect.value)
  if (!layout) return
  for (const layer of decorationLayers) {
    posterBlocks.get(layer.id).handle.remove()
    posterBlocks.delete(layer.id)
  }
  blockPositions = structuredClone(layout.positions)
  decorationLayers = structuredClone(layout.layers)
  selectedDecorationId = decorationLayers.at(-1)?.id
  hiddenLayers.clear()
  for (const id of layout.hidden) hiddenLayers.add(id)
  for (const layer of decorationLayers) registerPosterBlock(layer.id, layer.name || decorationNames[layer.type], true)
  ;[form.elements.docX.value, form.elements.docY.value] = layout.photo
  ;[form.elements.advicePosition.value, form.elements.adviceX.value] = layout.advice
  showLayerPanel()
  if (Object.hasOwn(backdrops, layout.template)) selectBuiltin(layout.template)
  else if (customTemplates.some(entry => entry.id === layout.template)) await selectCustom(layout.template)
  else { update(); save() }
  for (const layer of decorationLayers) if (!hiddenLayers.has(layer.id)) loadDecorationLayer(layer)
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
window.addEventListener('resize', () => {
  if (!fontMenu.hidden) tutupFontMenu()
})
syncFontButtons()

const addBackground = document.querySelector('#add-background')
addBackground.addEventListener('click', async () => {
  const file = customInput.files[0]
  if (!file) {
    mediaStatus.textContent = 'Pilih berkas gambar untuk latar poster.'
    customInput.focus()
    return
  }
  addBackground.disabled = true
  const revision = backgroundRevision
  try {
    const image = await loadImageFile(file)
    const scaled = document.createElement('canvas')
    const ratio = Math.min(1, 1400 / Math.max(image.width, image.height))
    scaled.width = Math.max(1, Math.round(image.width * ratio))
    scaled.height = Math.max(1, Math.round(image.height * ratio))
    const scaledContext = scaled.getContext('2d')
    scaledContext.drawImage(image, 0, 0, scaled.width, scaled.height)
    const entry = {
      id: 'custom-' + buatId(),
      name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Latar sendiri',
      source: scaled.toDataURL('image/webp', .88)
    }
    const next = [...customTemplates, entry]
    if (!storeLocal(backgroundsKey, next)) {
      mediaStatus.textContent = 'Latar belum disimpan. Hapus latar lama atau gunakan gambar lebih kecil.'
      return
    }
    customTemplates = next
    showCustomTemplates()
    if (revision === backgroundRevision) await selectCustom(entry.id)
    customInput.value = ''
    mediaStatus.textContent = 'Latar ditambahkan ke daftar di browser ini.'
  } catch (error) {
    mediaStatus.textContent = error.message
  } finally {
    addBackground.disabled = false
  }
})
customSelect.addEventListener('change', () => {
  if (customSelect.value) selectCustom(customSelect.value)
  else selectBuiltin(defaultTemplate)
})
deleteBackground.addEventListener('click', () => {
  const id = customSelect.value
  const next = customTemplates.filter(entry => entry.id !== id)
  if (!storeLocal(backgroundsKey, next)) return
  customTemplates = next
  selectBuiltin(defaultTemplate)
  mediaStatus.textContent = 'Latar dihapus dari daftar.'
})

let documentationDrag = null

function moveDocumentation(x, y) {
  if (!docBounds) return
  form.elements.docX.value = String(Math.round(Math.max(48, Math.min(docBounds.maxX, x))))
  form.elements.docY.value = String(Math.round(Math.max(24, Math.min(docBounds.maxY, y))))
  render()
}

photoDrag.addEventListener('pointerdown', event => {
  if (!docBounds || documentationDrag || event.button !== 0) return
  documentationDrag = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...docBounds }
  photoDrag.setPointerCapture(event.pointerId)
})
photoDrag.addEventListener('pointermove', event => {
  if (!documentationDrag || documentationDrag.id !== event.pointerId) return
  const scale = 1080 / (canvas.getBoundingClientRect().width * posterScale)
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
      const image = await loadImageFile(file)
      if (revision !== photoRevisions[index]) return
      photos[index] = image
      mediaStatus.textContent = 'Foto ' + (index + 1) + ' ditambahkan. Foto tersedia selama editor terbuka.'
      render()
    } catch (error) {
      if (revision !== photoRevisions[index]) return
      removePhotos[index].hidden = !photos[index]
      mediaStatus.textContent = error.message
    }
  })
  removePhotos[index].addEventListener('click', () => {
    photoRevisions[index] += 1
    photos[index] = null
    removePhotos[index].hidden = true
    mediaStatus.textContent = 'Foto ' + (index + 1) + ' dihapus.'
    render()
  })
}

document.querySelector('#reset-poster-positions').addEventListener('click', () => {
  blockPositions = {}
  form.elements.docX.value = form.elements.docY.value = ''
  render()
  save()
})

document.querySelector('#reset').addEventListener('click', () => {
  blockPositions = {}
  populate(example)
  areaMenu.value = ''
  areaMaster.hidden = true
  showAreaMasterStatus('')
  manualImage = null
  baseColor = ''
  baseColorInput.value = '#0b2c4d'
  for (const [index, button] of removePhotos.entries()) {
    photos[index] = null
    photoRevisions[index] += 1
    button.hidden = true
  }
  mediaStatus.textContent = ''
  selectBuiltin(defaultTemplate)
  showLayerPanel()
  status.textContent = 'Contoh dimuat. Ganti datanya sebelum dibagikan.'
})

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
syncSizeChips()
const storedTemplate = draft?.template || defaultTemplate
if (Object.hasOwn(backdrops, storedTemplate)) template = storedTemplate
showCustomTemplates()
update()
if (customTemplates.some(entry => entry.id === storedTemplate)) selectCustom(storedTemplate)

/* Logo paten selalu dipakai; kunci logo lama di browser dibersihkan agar tidak menimpa. */
storeLocal('kabar-air-logo', null)
function loadFixedLogo(attempt = 0) {
  decodeImage(LOGO_PATH + (attempt ? '&retry=' + attempt : '')).then(image => setLogo(image))
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
  }).catch(() => {}).finally(() => pendingArtwork.delete(id))
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
