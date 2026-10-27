import type { ReportActivity } from '../../domain/reportTypes'

export const reportColors = {
  todo: '#9271d4',
  doing: '#5486f5',
  done: '#16b98a',
  rondeled: '#d68d24',
  canceled: '#dc6b9a',
  leftBehind: '#df7859',
} as const satisfies Record<keyof ReportActivity | 'leftBehind', string>
