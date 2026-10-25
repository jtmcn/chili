'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function AdminQr({ url }: { url: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let live = true
    QRCode.toDataURL(url, { width: 512 }).then((d) => live && setSrc(d))
    return () => {
      live = false
    }
  }, [url])

  return (
    <section className="qr-block mt-8">
      <h2 className="text-[22px] font-semibold print:hidden">Event QR code</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt={`QR code for ${url}`} className="qr-img mt-2 size-64" />}
      <p className="mt-1 break-all text-[16px] print:hidden">{url}</p>
      <button
        type="button"
        onClick={() => window.print()}
        className="mt-2 min-h-12 rounded bg-enamel px-6 font-semibold text-plate print:hidden"
      >
        Print QR code
      </button>
    </section>
  )
}
