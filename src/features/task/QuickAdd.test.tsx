import { fireEvent, render, screen } from '@testing-library/react'
import type { Tag } from '../../domain/types'
import { Modal } from '../../shared/ui/Modal'
import { QuickAdd } from './QuickAdd'

const tags: Tag[] = [{ id: 'fam', name: 'fam', color: '#6aa3ff' }]

describe('QuickAdd', () => {
  it('does not open from + or n while another modal is open', () => {
    render(
      <>
        <Modal open title="Review" onClose={() => {}}>
          blocked
        </Modal>
        <QuickAdd
          tags={tags}
          weekStartDay={1}
          activeTagIds={[]}
          onCreateTag={async () => null}
          onAdded={() => {}}
          onError={() => {}}
        />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add a task' }))
    expect(screen.queryByRole('dialog', { name: 'Add a task' })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'n' })
    expect(screen.queryByRole('dialog', { name: 'Add a task' })).not.toBeInTheDocument()
  })
})
