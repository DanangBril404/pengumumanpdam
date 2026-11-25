const defaultTemplate = 'repair'
const backdrops = {
  repair: { name: 'Sambungan Pipa', art: 'repair-work.webp', colors: ['#071c35', '#125071', '#9eecff'], animation: 'water' },
  leak: { name: 'Kebocoran Pipa', art: 'pipe-leak.webp', colors: ['#082454', '#1264a1', '#b9f2ff'], animation: 'water' },
  trench: { name: 'Galian Pipa', art: 'pipe-trench.webp', colors: ['#1f2936', '#405970', '#ffdb9c'] },
  valve: { name: 'Penggantian Katup', art: 'pipe-valve.webp', colors: ['#0a2e3a', '#0e696c', '#a1f6f2'] },
  pressure: { name: 'Uji Tekanan', art: 'pipe-pressure.webp', colors: ['#172844', '#3b5780', '#d3e7ff'] },
  night: { name: 'Perbaikan Malam', art: 'pipe-night.webp', colors: ['#171d37', '#374775', '#ffe29b'] },
  replacement: { name: 'Penggantian Pipa', art: 'pipe-replacement.webp', colors: ['#0c333d', '#20747a', '#bdf9ff'] },
  panel: { name: 'Panel Listrik', art: 'electrical-panel.webp', colors: ['#21243a', '#51476d', '#ffe2a2'], electrical: true },
  power: { name: 'Jaringan Listrik', art: 'electrical-network.webp', colors: ['#262440', '#485889', '#ffe7a6'], electrical: true }
}

/* Warna dasar pilihan pengguna: gelapkan/terangkan satu warna hex. */
function shadeHex(hex, amount) {
  const nilai = String(hex || '').replace('#', '')
  if (nilai.length !== 6) return hex
  const kanal = [0, 2, 4].map(i => {
    const v = parseInt(nilai.slice(i, i + 2), 16)
    const hasil = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount
    return Math.max(0, Math.min(255, Math.round(hasil))).toString(16).padStart(2, '0')
  })
  return '#' + kanal.join('')
}

function coverImageFrame(image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height)
  return {
    width: image.width * scale,
    height: image.height * scale,
    x: x + (width - image.width * scale) / 2,
    y: y + (height - image.height * scale) / 2
  }
}

function coverImage(context, image, x, y, width, height) {
  const frame = coverImageFrame(image, x, y, width, height)
  context.drawImage(image, (x - frame.x) * image.width / frame.width,
    (y - frame.y) * image.height / frame.height, width * image.width / frame.width,
    height * image.height / frame.height, x, y, width, height)
}

/* Gambar dengan tepi melembut (feather) supaya foto tidak tampak seperti kotak
   yang ditempel: alpha diturunkan bertahap pada sisi yang diminta. */
const featherLayer = document.createElement('canvas')

function drawFeathered(context, image, x, y, width, height, edges = {}, pan = null) {
  /* pan = { x, y, z }: geser isi foto (px logis) dan zoom (1 = pas menutup bingkai). */
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  if (featherLayer.width !== w) featherLayer.width = w
  if (featherLayer.height !== h) featherLayer.height = h
  const layer = featherLayer.getContext('2d')
  layer.globalCompositeOperation = 'source-over'
  layer.clearRect(0, 0, w, h)
  /* Isi foto digambar di dalam bingkai (bukan memindah bingkainya): skala dasar
     menutup bingkai, dikali zoom, lalu digeser; dibatasi agar tanpa ruang kosong. */
  const zoom = pan && Number(pan.z) > 0 ? Number(pan.z) : 1
  const skala = Math.max(w / image.width, h / image.height) * zoom
  const lebarGambar = image.width * skala
  const tinggiGambar = image.height * skala
  const sisaX = Math.max(0, (lebarGambar - w) / 2)
  const sisaY = Math.max(0, (tinggiGambar - h) / 2)
  const geserX = pan ? Math.max(-sisaX, Math.min(sisaX, Number(pan.x) || 0)) : 0
  const geserY = pan ? Math.max(-sisaY, Math.min(sisaY, Number(pan.y) || 0)) : 0
  layer.drawImage(image, 0, 0, image.width, image.height,
    (w - lebarGambar) / 2 + geserX, (h - tinggiGambar) / 2 + geserY, lebarGambar, tinggiGambar)
  layer.globalCompositeOperation = 'destination-in'
  layer.fillStyle = '#ffffff'
  layer.fillRect(0, 0, w, h)
  for (const [sisi, panjang] of Object.entries(edges)) {
    const lebar = Math.min(Math.max(1, Number(panjang) || 0), sisi === 'left' || sisi === 'right' ? w : h)
    if (lebar < 2) continue
    let gradient
    if (sisi === 'left') gradient = layer.createLinearGradient(0, 0, lebar, 0)
    else if (sisi === 'right') gradient = layer.createLinearGradient(w, 0, w - lebar, 0)
    else if (sisi === 'top') gradient = layer.createLinearGradient(0, 0, 0, lebar)
    else gradient = layer.createLinearGradient(0, h, 0, h - lebar)
    gradient.addColorStop(0, '#ffffff00')
    gradient.addColorStop(.12, '#ffffff0f')
    gradient.addColorStop(.3, '#ffffff4d')
    gradient.addColorStop(.55, '#ffffffb8')
    gradient.addColorStop(.8, '#fffffff2')
    gradient.addColorStop(1, '#ffffff')
    layer.fillStyle = gradient
    layer.fillRect(0, 0, w, h)
  }
  layer.globalCompositeOperation = 'source-over'
  context.drawImage(featherLayer, x, y, width, height)
}

function paintBackdrop(context, height, backdrop, image = null, baseColor = '', width = 1080) {
  const dasar = baseColor ? shadeHex(baseColor, -0.28) : backdrop.colors[0]
  const terang = baseColor || backdrop.colors[1]
  const accent = backdrop.colors[2]
  const gradient = context.createLinearGradient(0, 0, width, Math.min(height, 1500))
  gradient.addColorStop(0, dasar)
  gradient.addColorStop(1, terang)
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
  if (image) {
    coverImage(context, image, 0, 0, width, height)
    context.fillStyle = baseColor ? baseColor + '2e' : '#071b35c4'
    context.fillRect(0, 0, width, height)
    return
  }
  context.fillStyle = accent + '31'
  for (let y = 545; y < height; y += 43) {
    for (const x of [19, 39, width - 40, width - 20]) context.fillRect(x, y, 4, 4)
  }
}
