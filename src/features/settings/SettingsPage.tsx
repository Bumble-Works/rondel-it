import { useState } from 'react'
import { weekdayName } from '../../domain/dates'
import { nextTagColor, TAG_COLORS } from '../../domain/hashTags'
import type { Tag, UserSetting } from '../../domain/types'
import { Button } from '../../shared/ui/Button'
import { IconButton } from '../../shared/ui/IconButton'
import { InlineEditInput } from '../../shared/ui/InlineEditInput'
import type { useSync } from '../sync/useSync'
import { StartAtLoginSetting } from './StartAtLoginSetting'
import { SyncSettings } from './SyncSettings'
import { TagColorInput } from './TagColorInput'
import './SettingsPage.css'


interface SettingsPageProps {
  settings: UserSetting
  tags: Tag[]
  onUpdateSettings: (patch: Partial<UserSetting>) => void
  onCreateTag: (name: string, color: string) => void
  onUpdateTag: (id: string, patch: { name?: string; color?: string }) => void
  onDeleteTag: (id: string) => void
  sync: ReturnType<typeof useSync>
  reportError: (context: string, e: unknown) => void
  onBack: () => void
}

export function SettingsPage({
  settings,
  tags,
  onUpdateSettings,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  sync,
  reportError,
  onBack,
}: SettingsPageProps) {
  const [newTag, setNewTag] = useState('')
  const [newColor, setNewColor] = useState(() => nextTagColor(tags))
  const addTag = () => {
    onCreateTag(newTag.trim(), newColor)
    setNewTag('')
    // The next tag gets the next color (you can still pick any).
    setNewColor(nextTagColor([...tags, { id: '', name: '', color: newColor }]))
  }

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
              onChange={(e) => e.target.value && onUpdateSettings({ dayStartTime: e.target.value })}
            />
          </div>

          <div className="settings-row">
            <label htmlFor="day-end">End-of-day rondel time</label>
            <input
              id="day-end"
              type="time"
              className="field settings-control"
              value={settings.endOfDayTime}
              onChange={(e) => e.target.value && onUpdateSettings({ endOfDayTime: e.target.value })}
            />
          </div>
          <StartAtLoginSetting reportError={reportError} />
        </section>

        <section className="settings-card">
          <h2>Tags</h2>
          <p className="settings-hint">Organize tasks. One list, many lenses.</p>

          <ul className="settings-taglist">
            {tags.map((tag) => (
              <li key={tag.id} className="settings-tag">
                <TagColorInput
                  className="settings-tag-color"
                  value={tag.color}
                  label={`${tag.name} color`}
                  onCommit={(color) => onUpdateTag(tag.id, { color })}
                />
                <InlineEditInput
                  className="settings-tag-name"
                  aria-label={`${tag.name} name`}
                  value={tag.name}
                  onCommit={(name) => onUpdateTag(tag.id, { name })}
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
                if (e.key === 'Enter' && newTag.trim()) addTag()
              }}
            />
            <Button
              variant="primary"
              disabled={!newTag.trim()}
              onClick={() => {
                if (newTag.trim()) addTag()
              }}
            >
              Add tag
            </Button>
          </div>
        </section>

        <SyncSettings sync={sync} />
      </div>
    </div>
  )
}
