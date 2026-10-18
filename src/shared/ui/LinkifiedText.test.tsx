import { fireEvent, render, screen } from '@testing-library/react'
import { LinkifiedText } from './LinkifiedText'

describe('LinkifiedText', () => {
  it('makes links clickable without triggering the surrounding click', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const onRowClick = vi.fn()
    render(
      <div onClick={onRowClick}>
        <LinkifiedText text="Spec at www.example.com/spec, thanks" />
      </div>,
    )

    const link = screen.getByRole('link', { name: 'example.com/spec' })
    expect(link).toHaveAttribute('href', 'https://www.example.com/spec')
    fireEvent.click(link)
    expect(open).toHaveBeenCalledWith('https://www.example.com/spec', '_blank', 'noopener,noreferrer')
    expect(onRowClick).not.toHaveBeenCalled()
    expect(screen.getByText(/, thanks/)).toBeInTheDocument()
  })

  it('renders plain text untouched', () => {
    const { container } = render(<LinkifiedText text="Just a task" />)
    expect(container).toHaveTextContent('Just a task')
    expect(container.querySelector('a')).toBeNull()
  })
})
