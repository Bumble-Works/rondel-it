import { useState } from 'react'
import { weekdayName } from '../../domain/dates'
import type { Tag, UserSetting } from '../../domain/types'
import { Button } from '../../shared/ui/Button'
import { IconButton } from '../../shared/ui/IconButton'
import './SettingsPage.css'

const TAG_COLORS = [
  '#3b82f6',
  '#16b98a',
  '#f59022',
  '#eab308',
  '#ef4757',
  '#8b5cf6',
  '#ec4899',
  '#14b8c4',
]

interface SettingsPageProps {
  settings: UserSetting
  tags: Tag[]
  onUpdateSettings: (patch: Partial<UserSetting>) => void
  onCreateTag: (name: string, color: string) => void
  onUpdateTag: (id: string, patch: { name?: string; color?: string }) => void
  onDeleteTag: (id: string) => void
  onBack: () => void
}

export function SettingsPage({
  settings,
  tags,
  onUpdateSettings,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onBack,
}: SettingsPageProps) {
  const [newTag, setNewTag] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])

  return (
    <div className="settings">
      <div className="settings-inner">
        <button type="button" className="settings-back" onClick={onBack}>
          ← Back to tasks
        </button>
        <h1 className="settings-title">Settings</h1>

        <section className="settings-card">
          <h2>Week &amp; day rhythm</h2>
          <p className="settings-hint">
            Controls where “next week” lands and when Rondel It nudges you to schedule and wrap up.
          </p>

          <div className="settings-row">
            <label htmlFor="week-start">Week starts on</label>
            <select
              id="week-start"
              className="field settings-control"
              value={settings.weekStartDay}
              onChange={(e) => onUpdateSettings({ weekStartDay: Number(e.target.value) })}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d)}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <label htmlFor="day-start">Morning review time</label>
            <input
              id="day-start"
              type="time"
              className="field settings-control"
              value={settings.dayStartTime}
              onChange={(e) => onUpdateSettings({ dayStartTime: e.target.value })}
            />
          </div>

          <div className="settings-row">
            <label htmlFor="day-end">End-of-day rondel time</label>
            <input
              id="day-end"
              type="time"
              className="field settings-control"
              value={settings.endOfDayTime}
              onChange={(e) => onUpdateSettings({ endOfDayTime: e.target.value })}
            />
          </div>
        </section>

        <section className="settings-card">
          <h2>Tags</h2>
          <p className="settings-hint">Organize tasks. One list, many lenses.</p>

          <ul className="settings-taglist">
            {tags.map((tag) => (
              <li key={tag.id} className="settings-tag">
                <input
                  type="color"
                  className="settings-tag-color"
                  value={tag.color}
                  aria-label={`${tag.name} color`}
                  onChange={(e) => onUpdateTag(tag.id, { color: e.target.value })}
                />
                <input
                  className="settings-tag-name"
                  value={tag.name}
                  onChange={(e) => onUpdateTag(tag.id, { name: e.target.value })}
                />
                <IconButton icon="trash" label={`Delete ${tag.name}`} onClick={() => onDeleteTag(tag.id)} />
              </li>
            ))}
          </ul>

          <div className="settings-newtag">
            <div className="settings-swatches">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`settings-swatch ${newColor === c ? 'is-active' : ''}`.trim()}
                  style={{ background: c }}
                  aria-label={`Use color ${c}`}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <input
              className="field"
              placeholder="New tag name"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  onCreateTag(newTag.trim(), newColor)
                  setNewTag('')
                }
              }}
            />
            <Button
              variant="primary"
              disabled={!newTag.trim()}
              onClick={() => {
                if (!newTag.trim()) return
                onCreateTag(newTag.trim(), newColor)
                setNewTag('')
              }}
            >
              Add tag
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
