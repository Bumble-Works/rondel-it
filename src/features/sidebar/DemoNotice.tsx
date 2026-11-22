import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import { isDesktopApp } from '../../services/sync/folder'
import { openExternal } from '../../shared/openExternal'
import './DemoNotice.css'

export const DOWNLOAD_URL = 'https://github.com/Bumble-Works/rondel-it/releases/latest'

/** Browser-only "Demo" label: data stays in this browser, and the app is for everyday use. */
export function DemoNotice() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  // Pointer presses and Escape also focus the button; only keyboard navigation should open the note.
  const skipFocusOpen = useRef(false)

  useEffect(() => {
    if (!open) return
    const closeOutside = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  if (isDesktopApp()) return null

  const closeIfLeaving = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
  }

  return (
    <div
      ref={wrapper}
      className="demo-notice"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={closeIfLeaving}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        setOpen(false)
        skipFocusOpen.current = true
        button.current?.focus()
        skipFocusOpen.current = false
      }}
    >
      <button
        ref={button}
        type="button"
        className="demo-notice-label"
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={id}
        onPointerDown={() => { skipFocusOpen.current = true }}
        onFocus={() => { if (!skipFocusOpen.current) setOpen(true) }}
        onClick={() => { skipFocusOpen.current = false; setOpen(true) }}
      >
        Demo
      </button>
      <div id={id} role="note" className="demo-notice-tip" hidden={!open}>
        Demo: your tasks are saved only in this browser. Clearing site data or cookies erases them, and any
        sync setup must be done again. For everyday use,{' '}
        <a
          href={DOWNLOAD_URL}
          onClick={(e) => {
            e.preventDefault()
            openExternal(DOWNLOAD_URL).catch((err) => console.error('[rondel] Couldn’t open link', err))
          }}
        >
          download the app
        </a>
        .
      </div>
    </div>
  )
}
