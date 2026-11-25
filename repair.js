const repairHeroOffset = 230
const templateArtwork = new Map()

const manualFrame = { x: 510, width: 570, height: 530 }

function manualImagePlacement(image, zoom, x, y) {
  const frame = manualFrame
  const scale = Math.max(frame.width / image.width, frame.height / image.height) * zoom / 100
  const width = image.width * scale
  const height = image.height * scale
  return {
    x: frame.x - (width - frame.width) * x / 100,
    y: -(height - frame.height) * y / 100,
    width, height
  }
}

let manualLayer

function paintManualImage(context, image, f) {
  if (!image) return
  const { x, width, height } = manualFrame
  if (!manualLayer) {
    manualLayer = document.createElement('canvas')
    manualLayer.width = width
    manualLayer.height = height
  }
  const layer = manualLayer.getContext('2d')
  const placement = manualImagePlacement(image, Number(f.imageZoom), Number(f.imageX), Number(f.imageY))
  layer.clearRect(0, 0, width, height)
  layer.drawImage(image, placement.x - x, placement.y, placement.width, placement.height)
  layer.save()
  layer.globalCompositeOperation = 'destination-in'
  const horizontal = layer.createLinearGradient(0, 0, 270, 0)
  horizontal.addColorStop(0, 'transparent')
  horizontal.addColorStop(.46, '#ffffff43')
  horizontal.addColorStop(1, '#ffffff')
  layer.fillStyle = horizontal
  layer.fillRect(0, 0, width, height)
  const vertical = layer.createLinearGradient(0, height - 160, 0, height)
  vertical.addColorStop(0, '#ffffff')
  vertical.addColorStop(.62, '#ffffff55')
  vertical.addColorStop(1, 'transparent')
  layer.fillStyle = vertical
  layer.fillRect(0, 0, width, height)
  layer.restore()
  context.drawImage(manualLayer, x, 0)
}

function paintRepairHero(context, backdrop, image, logo, f, shift = 0) {
  if (backdrop.manual) {
    paintManualImage(context, image, f)
    return
  }
  const height = 530
  const [dark, bright] = backdrop.colors
  /* Kanvas bisa lebih lebar dari 1080 (tata letak dua kolom). Fade harus mulai dari
     tepi kiri kanvas, bukan dari 0, kalau tidak muncul batas warna yang terlihat terpotong. */
  const mulai = -shift
  const lebarBanner = 1080 + shift
  /* Fade dibuat panjang dan bertahap supaya tepi foto tidak terlihat sebagai potongan. */
  const leftFade = context.createLinearGradient(mulai, 0, 1010, 0)
  leftFade.addColorStop(0, dark)
  leftFade.addColorStop(.3, dark + 'e6')
  leftFade.addColorStop(.58, dark + '73')
  leftFade.addColorStop(.82, dark + '26')
  leftFade.addColorStop(1, dark + '00')
  const bottomFade = context.createLinearGradient(0, 340, 0, height)
  bottomFade.addColorStop(0, bright + '00')
  bottomFade.addColorStop(.55, dark + '99')
  bottomFade.addColorStop(1, dark)

  if (image) {
    drawFeathered(context, image, 245, 0, 835, height, { left: 620, bottom: 210, top: 46 })
  } else {
    if (backdrop.electrical) paintElectricSymbol(context)
    else paintRepairPipe(context)
  }
  context.fillStyle = leftFade
  context.fillRect(mulai, 0, lebarBanner, height)
  context.fillStyle = bottomFade
  context.fillRect(mulai, 340, lebarBanner, height - 340)
  if (image && logo && backdrop.badges) {
    const frame = coverImageFrame(image, 245, 0, 835, height)
    for (const [u, v, size, angle] of backdrop.badges) {
      paintLogo(context, logo, frame.x + u * frame.width, frame.y + v * frame.height, size, angle)
    }
  }
}

function paintLogo(context, logo, x, y, size, angle = 0) {
  const scale = size / Math.max(logo.width, logo.height)
  const width = logo.width * scale
  const height = logo.height * scale
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.drawImage(logo, -width / 2, -height / 2, width, height)
  context.restore()
}

function paintRepairPipe(context) {
  const metal = context.createLinearGradient(0, 263, 0, 404)
  metal.addColorStop(0, '#a4e5f6')
  metal.addColorStop(.28, '#4bbada')
  metal.addColorStop(.75, '#137397')
  metal.addColorStop(1, '#0a3b60')
  context.save()
  context.translate(810, 350)
  context.rotate(-.16)
  context.translate(-810, -350)
  for (const [x, width] of [[470, 305], [824, 280]]) {
    context.fillStyle = metal
    context.fillRect(x, 283, width, 110)
    context.fillStyle = '#e4f9ff88'
    context.fillRect(x, 299, width, 7)
  }
  for (const x of [766, 819]) {
    context.fillStyle = '#103c62'
    context.beginPath()
    context.roundRect(x, 261, 31, 154, 8)
    context.fill()
    context.fillStyle = '#5fc5df'
    context.fillRect(x + 5, 269, 11, 135)
    for (const y of [281, 333, 391]) {
      context.fillStyle = '#d4e8ee'
      context.beginPath()
      context.arc(x + 17, y, 5, 0, Math.PI * 2)
      context.fill()
    }
  }
  context.restore()
  for (const [x, y, radius] of [[832, 246, 10], [854, 221, 7], [873, 253, 5]]) {
    context.fillStyle = '#b6f7ff'
    context.beginPath()
    context.ellipse(x, y, radius * .55, radius, .45, 0, Math.PI * 2)
    context.fill()
  }
}

function paintElectricSymbol(context) {
  context.fillStyle = '#ffd066'
  context.beginPath()
  context.moveTo(850, 92)
  context.lineTo(714, 274)
  context.lineTo(808, 274)
  context.lineTo(763, 410)
  context.lineTo(926, 220)
  context.lineTo(835, 220)
  context.closePath()
  context.fill()
}
