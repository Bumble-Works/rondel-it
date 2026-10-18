import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Tag, Task } from '../../domain/types'
import { TaskTitleField } from './TaskTitleField'

const work: Tag = { id: 'w', name: 'work', color: '#000' }
const workshop: Tag = { id: 'ws', name: 'workshop', color: '#000' }
const task = { id: 't', title: 'Plan offsite', tagIds: [] as string[] } as Task

function setup(
  createTag = vi.fn(async (name: string): Promise<Tag | null> => ({ id: 'new', name, color: '#000' })),
  tagIds: string[] = [],
) {
  const onChangeTitle = vi.fn()
  const onAddTag = vi.fn()
  render(
    <TaskTitleField
      task={{ ...task, tagIds }}
      allTags={[work, workshop]}
      onChangeTitle={onChangeTitle}
      onAddTag={onAddTag}
      createTag={createTag}
    />,
  )
  return { onChangeTitle, onAddTag, createTag, title: screen.getByLabelText('Title') }
}

describe('TaskTitleField', () => {
  it('attaches an existing tag picked with #, strips it, and saves the title on blur', async () => {
    const { onChangeTitle, onAddTag, title } = setup()
    await userEvent.type(title, ' #wo')
    expect(screen.getByRole('option', { name: '#work' })).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(onAddTag).toHaveBeenCalledWith('w')
    expect(title).toHaveValue('Plan offsite')
    fireEvent.blur(title)
    expect(onChangeTitle).not.toHaveBeenCalled() // the title text didn't change
  })

  it('creates a new tag only when "Create" is chosen', async () => {
    const { onAddTag, createTag, title } = setup()
    await userEvent.type(title, ' #travel')
    await userEvent.click(screen.getByRole('option', { name: 'Create #travel' }))
    expect(createTag).toHaveBeenCalledWith('travel')
    expect(onAddTag).toHaveBeenCalledWith('new')
  })

  it('saves an edited title, and restores it if cleared', async () => {
    const { onChangeTitle, title } = setup()
    await userEvent.clear(title)
    fireEvent.blur(title)
    expect(title).toHaveValue('Plan offsite')
    await userEvent.type(title, '!{Enter}')
    expect(onChangeTitle).toHaveBeenCalledWith('Plan offsite!')
  })

  it('closes the suggestions when the title loses focus, and reopens them on typing', async () => {
    const { title } = setup()
    await userEvent.type(title, ' #wo')
    expect(screen.getByRole('listbox', { name: 'Tag suggestions' })).toBeInTheDocument()

    fireEvent.blur(title)
    expect(screen.queryByRole('listbox', { name: 'Tag suggestions' })).not.toBeInTheDocument()

    await userEvent.type(title, 'r')
    expect(screen.getByRole('option', { name: '#work' })).toBeInTheDocument()
  })

  it('doesn’t suggest tags the task already has', async () => {
    const { title } = setup(undefined, ['w'])
    await userEvent.type(title, ' #wo')
    expect(screen.queryByRole('option', { name: '#work' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: '#workshop' })).toBeInTheDocument()
  })
})

