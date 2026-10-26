import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Same mark as icon.svg, square because iOS applies its own corner mask.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" fill="#1D3F8F"/>
<g fill="#fff" opacity=".55"><circle cx="5" cy="6" r=".8"/><circle cx="12" cy="4" r=".6"/><circle cx="27" cy="5" r=".9"/><circle cx="22" cy="8" r=".5"/><circle cx="4" cy="27" r=".7"/><circle cx="28" cy="28" r=".6"/></g>
<rect x="12.5" y="6.5" width="7" height="2.5" rx="1.25" fill="#fff"/>
<rect x="4" y="10" width="24" height="3.5" rx="1.75" fill="#fff"/>
<path d="M6.5 14.5h19v5.5a6 6 0 0 1-6 6h-7a6 6 0 0 1-6-6z" fill="#fff"/>
<path d="M2.2 15.6H8M24 15.6h5.8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
</svg>`

export default function AppleIcon() {
  return new ImageResponse(
    <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`} width={180} height={180} alt="" />,
    size,
  )
}
