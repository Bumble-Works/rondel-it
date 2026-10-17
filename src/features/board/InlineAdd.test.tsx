import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Tag } from '../../domain/types'
import { InlineAdd } from './InlineAdd'

const family: Tag = { id: 'fam', name: 'family', color: '#16b98a' }

function setup(onCreateTag = vi.fn(async (name: string): Promise<Tag | null> => ({ id: 'new', name, color: '#000' }))) {
  const onAdd = vi.fn()
  render(<InlineAdd tags={[family]} onAdd={onAdd} onCreateTag={onCreateTag} />)
  return { onAdd, onCreateTag, input: screen.getByPlaceholderText('Add a task') }
}

describe('InlineAdd #tags', () => {
  it('suggests an existing tag ignoring case, strips it from the title and attaches it', async () => {
    const { onAdd, input } = setup()
    await userEvent.type(input, 'Call mom #FAM')
    expect(screen.getByRole('option', { name: '#family' })).toBeInTheDocument()

    await userEvent.keyboard('{Enter}') // picks the suggestion
    expect(input).toHaveValue('Call mom')

    await userEvent.keyboard('{Enter}') // submits
    expect(onAdd).toHaveBeenCalledWith('Call mom', ['fam'])
  })

  it('creates a new tag only when "Create" is picked', async () => {
    const { onAdd, onCreateTag, input } = setup()
    await userEvent.type(input, 'Plan trip #travel')
    await userEvent.click(screen.getByRole('option', { name: 'Create #travel' }))
    expect(onCreateTag).toHaveBeenCalledWith('travel')

    await userEvent.type(input, '{Enter}')
    expect(onAdd).toHaveBeenCalledWith('Plan trip', ['new'])
  })

  it('creates a new tag from the keyboard only after arrowing to "Create"', async () => {
    const { onCreateTag, input } = setup()
    await userEvent.type(input, 'Plan trip #travel{ArrowDown}{Enter}')
    expect(onCreateTag).toHaveBeenCalledWith('travel')
    expect(input).toHaveValue('Plan trip')
  })

  it('keeps an unpicked #word as plain text and creates nothing', async () => {
    const { onAdd, onCreateTag, input } = setup()
    // Enter never auto-picks "Create", so this submits the text as typed.
    await userEvent.type(input, 'Fix issue #42{Enter}')
    expect(onCreateTag).not.toHaveBeenCalled()
    expect(onAdd).toHaveBeenCalledWith('Fix issue #42', [])
  })
})
