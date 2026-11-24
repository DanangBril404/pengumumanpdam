const defaultTemplate = 'repair'
const backdrops = {
  manual: { name: 'Gambar Sendiri', colors: ['#092744', '#15547d', '#c0edff'], manual: true },
  repair: { name: 'Sambungan Pipa', art: 'repair-work.webp', colors: ['#071c35', '#125071', '#9eecff'], badges: [
    [421 / 640, 130 / 427, 29, -.30], [532 / 640, 67 / 427, 28, -.12],
    [301 / 640, 210 / 427, 31, .25], [575 / 640, 160 / 427, 28, -.15]
  ], animation: 'water' },
  leak: { name: 'Kebocoran Pipa', art: 'pipe-leak.webp', colors: ['#082454', '#1264a1', '#b9f2ff'], animation: 'water' },
  trench: { name: 'Galian Pipa', art: 'pipe-trench.webp', colors: ['#1f2936', '#405970', '#ffdb9c'] },
  valve: { name: 'Penggantian Katup', art: 'pipe-valve.webp', colors: ['#0a2e3a', '#0e696c', '#a1f6f2'] },
  pressure: { name: 'Uji Tekanan', art: 'pipe-pressure.webp', colors: ['#172844', '#3b5780', '#d3e7ff'] },
  night: { name: 'Perbaikan Malam', art: 'pipe-night.webp', colors: ['#171d37', '#374775', '#ffe29b'] },
  replacement: { name: 'Penggantian Pipa', art: 'pipe-replacement.webp', colors: ['#0c333d', '#20747a', '#bdf9ff'] },
  panel: { name: 'Panel Listrik', art: 'electrical-panel.webp', colors: ['#21243a', '#51476d', '#ffe2a2'], electrical: true },
  power: { name: 'Jaringan Listrik', art: 'electrical-network.webp', colors: ['#262440', '#485889', '#ffe7a6'], electrical: true }
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

function paintBackdrop(context, height, backdrop, image = null) {
  const [dark, bright, accent] = backdrop.colors
  const gradient = context.createLinearGradient(0, 0, 1080, Math.min(height, 1500))
  gradient.addColorStop(0, dark)
  gradient.addColorStop(1, bright)
  context.fillStyle = gradient
  context.fillRect(0, 0, 1080, height)
  if (image) {
    coverImage(context, image, 0, 0, 1080, height)
    context.fillStyle = '#071b35c4'
    context.fillRect(0, 0, 1080, height)
    return
  }
  context.fillStyle = accent + '31'
  for (let y = 545; y < height; y += 43) {
    for (const x of [19, 39, 1040, 1060]) context.fillRect(x, y, 4, 4)
  }
}
