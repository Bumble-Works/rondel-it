import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Menu.css'

interface MenuProps {
  /** Render the trigger. Receives props to spread onto a button. */
  trigger: (props: { onClick: (e: ReactMouseEvent) => void; 'aria-expanded': boolean }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
}

export function Menu({ trigger, children, align = 'right' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusedInput = useRef(false)

  const reposition = () => {
    const anchor = anchorRef.current
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const panelW = panelRef.current?.offsetWidth ?? 220
    const panelH = panelRef.current?.offsetHeight ?? 0
    let left = align === 'right' ? r.right - panelW : r.left
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8))
    let top = r.bottom + 6
    if (panelH && top + panelH > window.innerHeight - 8) {
      top = Math.max(8, r.top - panelH - 6)
    }
    setCoords({ top, left })
  }

  useLayoutEffect(() => {
    if (open) reposition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, children])

  useEffect(() => {
    if (!open) focusedInput.current = false
    else if (coords && !focusedInput.current) {
      panelRef.current?.querySelector('input')?.focus()
      focusedInput.current = true
    }
  }, [open, coords])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        anchorRef.current?.querySelector('button')?.focus()
      }
    }
    const onReflow = () => reposition()
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onReflow, true)
    window.addEventListener('resize', onReflow)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onReflow, true)
      window.removeEventListener('resize', onReflow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <span className="menu" ref={anchorRef}>
      {trigger({
        onClick: (e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        },
        'aria-expanded': open,
      })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="menu-panel"
            role="menu"
            style={{
              position: 'fixed',
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              visibility: coords ? 'visible' : 'hidden',
            }}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </span>
  )
}

interface MenuItemProps {
  icon?: ReactNode
  onClick?: () => void
  children: ReactNode
  tone?: 'default' | 'danger'
}

export function MenuItem({ icon, onClick, children, tone = 'default' }: MenuItemProps) {
  return (
    <button type="button" className={`menu-item menu-item--${tone}`} role="menuitem" onClick={onClick}>
      {icon && <span className="menu-item-icon">{icon}</span>}
      <span className="menu-item-label">{children}</span>
    </button>
  )
}

export function MenuSeparator() {
  return <div className="menu-sep" role="separator" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="menu-label">{children}</div>
}
