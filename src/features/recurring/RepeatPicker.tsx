import { useState } from 'react'
import { fromIso, todayIso, weekdayName } from '../../domain/dates'
import { defaultRepeat, describeRepeat, ordinal, REPEAT_PRESETS, type RepeatPresetId } from '../../domain/repeat'
import type { MonthlyRepeat, RepeatSpec } from '../../domain/types'
import './RepeatPicker.css'

export type RepeatChoice = { kind: 'repeat'; repeat: RepeatSpec } | { kind: 'weekly-start' | 'monthly-start' }

type Mode = RepeatPresetId | 'custom' | 'weekly-start' | 'monthly-start'

type Nth = 1 | 2 | 3 | 4 | -1

const NTHS: Array<{ value: Nth; label: string }> = [
  { value: 1, label: 'first' },
  { value: 2, label: 'second' },
  { value: 3, label: 'third' },
  { value: 4, label: 'fourth' },
  { value: -1, label: 'last' },
]

interface RepeatPickerProps {
  onChange: (choice: RepeatChoice) => void
}

/** Repeat: daily, monthly, yearly, or custom (every N days/weeks/months/years). */
export function RepeatPicker({ onChange }: RepeatPickerProps) {
  const [mode, setMode] = useState<Mode>('daily')
  const [spec, setSpec] = useState<RepeatSpec>(() => defaultRepeat(todayIso()))

  const emit = (nextMode: Mode, nextSpec: RepeatSpec) => {
    setMode(nextMode)
    setSpec(nextSpec)
    onChange(nextMode === 'weekly-start' || nextMode === 'monthly-start' ? { kind: nextMode } : { kind: 'repeat', repeat: nextSpec })
  }
  /** Re-anchor a preset on a new start date; custom patterns keep their settings. */
  const withStart = (startDate: string): RepeatSpec => {
    const preset = REPEAT_PRESETS.find((p) => p.id === mode)
    return preset ? { ...preset.make(startDate), endDate: spec.endDate } : { ...spec, startDate }
  }
  const update = (patch: Partial<RepeatSpec>) => emit('custom', { ...spec, ...patch })
  const isRepeat = mode !== 'weekly-start' && mode !== 'monthly-start'
  const start = fromIso(spec.startDate)

  return (
    <div className="repeat-picker">
      <div className="recurring-row">
        <label htmlFor="repeat-mode">Repeats</label>
        <select
          id="repeat-mode"
          className="field recurring-control"
          value={mode}
          onChange={(e) => {
            const next = e.target.value as Mode
            const preset = REPEAT_PRESETS.find((p) => p.id === next)
            emit(next, preset ? { ...preset.make(spec.startDate), endDate: spec.endDate } : spec)
          }}
        >
          {REPEAT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
          <option value="weekly-start">Start of every week, rondeled into that week</option>
          <option value="monthly-start">Start of every month, rondeled into that month</option>
        </select>
      </div>

      {isRepeat && (
        <div className="recurring-row">
          <label htmlFor="repeat-start">Starts</label>
          <input
            id="repeat-start"
            type="date"
            className="field recurring-control"
            value={spec.startDate}
            onChange={(e) => e.target.value && emit(mode, withStart(e.target.value))}
          />
        </div>
      )}

      {mode === 'custom' && (
        <>
          <div className="recurring-row">
            <label htmlFor="repeat-every">Every</label>
            <div className="repeat-every">
              <input
                id="repeat-every"
                type="number"
                min={1}
                max={99}
                className="field repeat-every-n"
                value={spec.every}
                onChange={(e) => update({ every: Math.min(99, Math.max(1, Math.round(Number(e.target.value)) || 1)) })}
              />
              <select
                aria-label="Unit"
                className="field"
                value={spec.unit}
                onChange={(e) => update({ unit: e.target.value as RepeatSpec['unit'] })}
              >
                <option value="day">{spec.every === 1 ? 'day' : 'days'}</option>
                <option value="week">{spec.every === 1 ? 'week' : 'weeks'}</option>
                <option value="month">{spec.every === 1 ? 'month' : 'months'}</option>
                <option value="year">{spec.every === 1 ? 'year' : 'years'}</option>
              </select>
            </div>
          </div>

          {spec.unit === 'week' && (
            <div className="repeat-weekdays" role="group" aria-label="On these days">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const days = spec.weekdays?.length ? spec.weekdays : [start.getDay()]
                const on = days.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={weekdayName(d)}
                    className={`repeat-day ${on ? 'is-on' : ''}`.trim()}
                    onClick={() => update({ weekdays: toggleDay(days, d) })}
                  >
                    {weekdayName(d).slice(0, 1)}
                  </button>
                )
              })}
            </div>
          )}

          {spec.unit === 'month' && <MonthlyChoice spec={spec} onChange={(monthly) => update({ monthly })} />}
        </>
      )}

      {isRepeat && (
        <div className="recurring-row">
          <label htmlFor="repeat-end">End repeat</label>
          <div className="repeat-every">
            <select
              id="repeat-end"
              className="field"
              value={spec.endDate ? 'date' : 'never'}
              onChange={(e) => emit(mode, { ...spec, endDate: e.target.value === 'date' ? spec.startDate : null })}
            >
              <option value="never">Never</option>
              <option value="date">On date</option>
            </select>
            {spec.endDate && (
              <input
                type="date"
                aria-label="End date"
                className="field"
                min={spec.startDate}
                value={spec.endDate}
                onChange={(e) => e.target.value && emit(mode, { ...spec, endDate: e.target.value })}
              />
            )}
          </div>
        </div>
      )}

      {isRepeat && <p className="repeat-summary">{describeRepeat(spec)}</p>}
    </div>
  )
}

/** Adds or removes a day, keeping at least one selected. */
function toggleDay(days: number[], day: number): number[] {
  if (!days.includes(day)) return [...days, day].sort((a, b) => a - b)
  const rest = days.filter((d) => d !== day)
  return rest.length ? rest : days
}

function MonthlyChoice({ spec, onChange }: { spec: RepeatSpec; onChange: (monthly: MonthlyRepeat) => void }) {
  const start = fromIso(spec.startDate)
  const monthly = spec.monthly ?? { type: 'date', days: [start.getDate()] }
  const byDate = { type: 'date' as const, days: monthly.type === 'date' ? monthly.days : [start.getDate()] }
  const byWeekday =
    monthly.type === 'weekday'
      ? monthly
      : { type: 'weekday' as const, nth: Math.min(4, Math.ceil(start.getDate() / 7)) as Nth, weekday: start.getDay() }

  return (
    <div className="repeat-monthly" role="radiogroup" aria-label="Each month">
      <label>
        <input type="radio" checked={monthly.type === 'date'} onChange={() => onChange(byDate)} /> On these dates
      </label>
      {monthly.type === 'date' && (
        <div className="repeat-dates" role="group" aria-label="Dates of the month">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
            const on = byDate.days.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={ordinal(d)}
                className={`repeat-day ${on ? 'is-on' : ''}`.trim()}
                onClick={() => onChange({ type: 'date', days: toggleDay(byDate.days, d) })}
              >
                {d}
              </button>
            )
          })}
        </div>
      )}
      <label>
        <input type="radio" checked={monthly.type === 'weekday'} onChange={() => onChange(byWeekday)} /> On the{' '}
        <select
          aria-label="Which week"
          className="field"
          value={byWeekday.nth}
          onChange={(e) => onChange({ ...byWeekday, nth: Number(e.target.value) as Nth })}
        >
          {NTHS.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>{' '}
        <select
          aria-label="Weekday"
          className="field"
          value={byWeekday.weekday}
          onChange={(e) => onChange({ ...byWeekday, weekday: Number(e.target.value) })}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <option key={d} value={d}>
              {weekdayName(d)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
