'use client'

import Link from 'next/link'
import { useState } from 'react'
import { PotNumber } from '@/components/PotNumber'
import { getDeviceId } from '@/lib/device-id'
import { resizeToJpeg, uploadPhoto } from '@/lib/photo'

const secondary = 'flex min-h-12 items-center rounded border border-enamel px-5 text-[18px] font-semibold text-enamel'

type PhotoState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'done'; url: string }
  // blob kept only when a resend could succeed
  | { kind: 'error'; message: string; blob: Blob | null }

export function Success({ potNumber, chiliId }: { potNumber: number; chiliId: string }) {
  const [photo, setPhoto] = useState<PhotoState>({ kind: 'idle' })

  async function send(blob: Blob) {
    setPhoto({ kind: 'uploading' })
    const r = await uploadPhoto({ deviceId: getDeviceId(), chiliId, file: blob })
    setPhoto(r.ok ? { kind: 'done', url: r.photoUrl } : { kind: 'error', message: r.message, blob: r.retry ? blob : null })
  }

  async function pick(file: File | undefined) {
    if (!file) return
    let blob: Blob
    try {
      blob = await resizeToJpeg(file)
    } catch {
      return setPhoto({ kind: 'error', message: "Couldn't read that photo. Try another.", blob: null })
    }
    await send(blob)
  }

  const uploading = photo.kind === 'uploading'

  return (
    <div className="flex flex-col items-start gap-4">
      <PotNumber n={potNumber} size="hero" />
      <p className="text-[28px] font-semibold leading-tight">Write this on your table card</p>
      {photo.kind === 'done' ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- avoid image optimizer cost */}
          <img src={photo.url} alt="Your chili photo" className="aspect-[4/3] w-full rounded object-cover" />
          <p>Photo added</p>
        </>
      ) : (
        <div className="flex flex-wrap gap-3">
          <label
            aria-disabled={uploading}
            className={`${secondary} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-enamel aria-disabled:cursor-default aria-disabled:opacity-60`}
          >
            {uploading ? 'Uploading…' : 'Add a photo'}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                // allow re-picking the same file
                e.target.value = ''
                pick(f)
              }}
            />
          </label>
          {photo.kind === 'error' && photo.blob && (
            <button type="button" className={secondary} onClick={() => send(photo.blob!)}>
              Try again
            </button>
          )}
        </div>
      )}
      {photo.kind === 'error' && (
        <p role="alert" className="text-chili">
          {photo.message}
        </p>
      )}
      <Link href="/" className="flex min-h-12 items-center text-enamel underline">
        Back to the list
      </Link>
    </div>
  )
}
