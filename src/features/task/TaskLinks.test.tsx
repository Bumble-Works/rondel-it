import { render, screen } from '@testing-library/react'
import { TaskLinks } from './TaskLinks'

describe('TaskLinks', () => {
  it('lists each link once, from the title and the note', () => {
    render(<TaskLinks text={'Read https://a.example.com\nSee www.b.example.com and https://a.example.com'} />)
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      'https://a.example.com',
      'https://www.b.example.com',
    ])
  })

  it('renders nothing without links', () => {
    const { container } = render(<TaskLinks text="No links here" />)
    expect(container).toBeEmptyDOMElement()
  })
})
