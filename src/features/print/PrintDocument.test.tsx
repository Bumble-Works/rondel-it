import { render } from '@testing-library/react'
import { PrintDocument } from './PrintDocument'

it('scales fixed-size chart SVGs to paper without cropping and preserves existing coordinate systems', () => {
  render(<PrintDocument title="Charts" summary="October">
    <svg data-testid="nivo" width={900} height={175}><rect width={900} height={175} /></svg>
    <svg data-testid="timeline" width={900} height={220} viewBox="0 0 900 220" />
    <svg data-testid="percentage" width="100%" height={175} />
  </PrintDocument>)
  expect(document.querySelector('[data-testid="nivo"]')).toHaveAttribute('viewBox', '0 0 900 175')
  expect(document.querySelector('[data-testid="timeline"]')).toHaveAttribute('viewBox', '0 0 900 220')
  expect(document.querySelector('[data-testid="percentage"]')).not.toHaveAttribute('viewBox')
})
