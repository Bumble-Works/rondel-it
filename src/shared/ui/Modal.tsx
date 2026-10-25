import { useEffect, type ReactNode } from 'react'
import { IconButton } from './IconButton'
import { isTopModal, pushModal, removeModal } from './modalStack'
import './Modal.css'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({ open, title, onClose, children, footer, width = 440 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const id = Symbol('modal')
    pushModal(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopModal(id)) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      removeModal(id)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="modal-head">
            <h3>{title}</h3>
            <IconButton icon="close" label="Close" onClick={onClose} />
          </header>
        )}
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}
