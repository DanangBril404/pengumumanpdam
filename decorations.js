const decorationFiles = {
  waves: 'ornament-chrome-tap.webp',
  ripples: 'ornament-pressure-station.webp',
  drops: 'ornament-water-splash.webp',
  river: 'ornament-brass-tap.webp',
  pipes: 'ornament-pipe-network.webp'
}
const decorationArtwork = new Map()
let decorationLayer

function paintDecorationArtwork(context, image, width, height) {
  if (!decorationLayer) {
    decorationLayer = document.createElement('canvas')
    decorationLayer.width = 820
    decorationLayer.height = 1000
  }
  const layer = decorationLayer.getContext('2d')
  const w = decorationLayer.width
  const h = decorationLayer.height
  layer.clearRect(0, 0, w, h)
  coverImage(layer, image, 0, 0, w, h)
  layer.save()
  layer.globalCompositeOperation = 'destination-in'
  const blend = layer.createLinearGradient(0, 0, 0, 290)
  blend.addColorStop(0, 'transparent')
  blend.addColorStop(.45, '#ffffff44')
  blend.addColorStop(1, '#ffffff')
  layer.fillStyle = blend
  layer.fillRect(0, 0, w, h)
  const edges = layer.createLinearGradient(0, 0, w, 0)
  edges.addColorStop(0, 'transparent')
  edges.addColorStop(.06, '#ffffff')
  edges.addColorStop(.94, '#ffffff')
  edges.addColorStop(1, 'transparent')
  layer.fillStyle = edges
  layer.fillRect(0, 0, w, h)
  layer.restore()
  context.save()
  context.globalAlpha = .84
  context.drawImage(decorationLayer, 0, 0, width, height)
  context.restore()
}

function paintPosterDecoration(context, style, width, height, accent) {
  if (style === 'none') return
  const artwork = decorationArtwork.get(style)
  if (artwork) {
    paintDecorationArtwork(context, artwork, width, height)
    return
  }
  context.save()
  context.scale(width / 900, height / 540)
  const sheen = context.createLinearGradient(0, 110, 885, 540)
  sheen.addColorStop(0, accent)
  sheen.addColorStop(.52, '#43d9f2')
  sheen.addColorStop(1, '#4179ed')
  context.fillStyle = sheen
  context.strokeStyle = sheen
  context.lineWidth = 4
  context.globalAlpha = .48

  switch (style) {
    case 'waves':
      for (const [y, alpha] of [[314, .22], [378, .33], [448, .54]]) {
        context.globalAlpha = alpha
        context.beginPath()
        context.moveTo(0, y)
        context.bezierCurveTo(280, y + 140, 617, y - 163, 900, y - 29)
        context.lineTo(900, 540)
        context.lineTo(0, 540)
        context.closePath()
        context.fill()
        context.stroke()
      }
      paintWaterBubbles(context, [[97, 266, 12], [147, 315, 6], [730, 237, 8], [810, 285, 21]])
      break
    case 'ripples':
      for (const [x, y] of [[174, 162], [651, 395]]) {
        for (const radius of [52, 83, 115, 153]) {
          context.beginPath()
          context.ellipse(x, y, radius, radius * .39, -.19, 0, Math.PI * 2)
          context.stroke()
        }
      }
      paintWaterBubbles(context, [[113, 94, 11], [267, 207, 21], [559, 318, 10], [757, 442, 19], [808, 326, 28]])
      break
    case 'drops':
      for (const [x, y, size] of [[106, 106, 48], [191, 205, 23], [740, 312, 69], [821, 424, 29], [443, 456, 40]]) {
        context.beginPath()
        context.moveTo(x, y - size)
        context.bezierCurveTo(x - size, y + 10, x - size * .52, y + size * .62, x, y + size * .62)
        context.bezierCurveTo(x + size * .52, y + size * .62, x + size, y + 10, x, y - size)
        context.fill()
        context.stroke()
        context.save()
        context.strokeStyle = '#ffffff'
        context.lineWidth = 2
        context.beginPath()
        context.arc(x, y + size * .12, size * .31, Math.PI * .22, Math.PI * .78)
        context.stroke()
        context.restore()
      }
      break
    case 'river':
      for (const [drift, line] of [[0, 15], [29, 7], [56, 3]]) {
        context.lineWidth = line
        context.beginPath()
        context.moveTo(0, 125 + drift)
        context.bezierCurveTo(295, 30 + drift, 288, 362 + drift, 576, 311 + drift)
        context.bezierCurveTo(768, 288 + drift, 744, 425 + drift, 900, 430 + drift)
        context.stroke()
      }
      break
    case 'pipes':
      context.lineWidth = 11
      context.lineJoin = 'round'
      for (const [x, y] of [[76, 86], [508, 300]]) {
        context.beginPath()
        context.moveTo(x, y)
        context.lineTo(x + 216, y)
        context.lineTo(x + 216, y + 107)
        context.lineTo(x + 326, y + 107)
        context.stroke()
        for (const [dx, dy] of [[0, 0], [216, 0], [216, 107], [326, 107]]) {
          context.beginPath()
          context.arc(x + dx, y + dy, 13, 0, Math.PI * 2)
          context.fill()
        }
      }
      break
  }
  context.restore()
}

function paintWaterBubbles(context, circles) {
  context.save()
  context.globalAlpha = .44
  context.lineWidth = 3
  for (const [x, y, radius] of circles) {
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.stroke()
    context.beginPath()
    context.arc(x - radius * .24, y - radius * .25, Math.max(1.5, radius * .18), 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}
