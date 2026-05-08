export function SvgFilters() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={0}
      height={0}
      style={{ position: 'absolute', overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        <filter
          id="liquid-glass"
          colorInterpolationFilters="sRGB"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
        >
          <feImage
            result="dispMap"
            x={0}
            y={0}
            width={400}
            height={300}
            preserveAspectRatio="none"
            href={buildDisplacementMap(400, 300, 24)}
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="dispMap"
            scale={-28}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

function buildDisplacementMap(width: number, height: number, radius: number): string {
  const blurStdDev = Math.max(8, Math.round(radius * 0.6))
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
  <defs>
    <linearGradient id='gx' x1='0%' y1='0%' x2='100%' y2='0%'>
      <stop offset='0%' stop-color='#000'/>
      <stop offset='100%' stop-color='#f00'/>
    </linearGradient>
    <linearGradient id='gy' x1='0%' y1='0%' x2='0%' y2='100%'>
      <stop offset='0%' stop-color='#000'/>
      <stop offset='100%' stop-color='#0f0'/>
    </linearGradient>
    <filter id='b'><feGaussianBlur stdDeviation='${blurStdDev}'/></filter>
  </defs>
  <rect width='${width}' height='${height}' rx='${radius}' fill='url(#gx)' style='mix-blend-mode:screen'/>
  <rect width='${width}' height='${height}' rx='${radius}' fill='url(#gy)' style='mix-blend-mode:screen'/>
  <rect width='${width}' height='${height}' rx='${radius}' fill='#808080' filter='url(#b)'/>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
