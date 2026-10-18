import { useState } from 'react'
import { describeRecurrence } from '../../domain/recurrence'
import { formatClock } from '../../domain/dates'
import type { RecurringRule, Tag } from '../../domain/types'
import type { RecurringRuleInput } from '../../services/adapters/DataSource'
import { Icon } from '../../shared/ui/Icon'
import { IconButton } from '../../shared/ui/IconButton'
import { TagChip } from '../../shared/ui/TagChip'
import { RecurringForm } from './RecurringForm'
import './RecurringPage.css'

interface RecurringPageProps {
  rules: RecurringRule[]
  tags: Tag[]
  onCreate: (input: RecurringRuleInput) => void
  onUpdate: (id: string, input: RecurringRuleInput) => void
  onDelete: (id: string) => void
  onCreateTag: (name: string) => Promise<Tag | null>
  onBack: () => void
}

export function RecurringPage({ rules, tags, onCreate, onUpdate, onDelete, onCreateTag, onBack }: RecurringPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  // Bumped after each save so the form starts over.
  const [formKey, setFormKey] = useState(0)

  const tagsById = new Map(tags.map((t) => [t.id, t]))
  const editing = rules.find((r) => r.id === editingId) ?? null

  const startOver = () => {
    setEditingId(null)
    setFormKey((k) => k + 1)
  }
  const save = (input: RecurringRuleInput) => {
    if (editing) onUpdate(editing.id, input)
    else onCreate(input)
    startOver()
  }

  return (
    <div className="recurring">
      <div className="recurring-inner">
        <button type="button" className="recurring-back" onClick={onBack}>
          ← Back to tasks
        </button>
        <h1 className="recurring-title">
          <Icon name="repeat" size={24} /> Recurring
        </h1>
        <p className="recurring-lead">
          <strong>One task at a time:</strong> the first appears right away, and each next one only once the last is
          done (days missed meanwhile are skipped). Edits only change tasks still to come.
        </p>

        <RecurringForm
          key={editing ? `edit-${editing.id}` : `new-${formKey}`}
          tags={tags}
          rule={editing}
          onSubmit={save}
          onCancel={startOver}
          onCreateTag={onCreateTag}
        />

        <section className="recurring-card">
          <h2>Your recurring tasks</h2>
          {rules.length === 0 ? (
            <p className="recurring-empty">No recurring tasks yet.</p>
          ) : (
            <ul className="recurring-list">
              {rules.map((rule) => (
                <li key={rule.id} className={`recurring-item ${rule.id === editingId ? 'is-editing' : ''}`.trim()}>
                  <span className="recurring-item-icon">
                    <Icon name="repeat" size={18} />
                  </span>
                  <div className="recurring-item-body">
                    <span className="recurring-item-title">
                      {rule.flagged && <Icon name="flag-filled" size={14} />}
                      {rule.title}
                    </span>
                    <span className="recurring-item-desc">
                      {describeRecurrence(rule)}
                      {rule.reminderTime && <span> · 🔔 {formatClock(rule.reminderTime)}</span>}
                      {rule.tagIds.length > 0 && (
                        <span className="recurring-item-tags">
                          {rule.tagIds
                            .map((id) => tagsById.get(id))
                            .filter((t): t is Tag => Boolean(t))
                            .map((t) => (
                              <TagChip key={t.id} name={t.name} color={t.color} size="sm" />
                            ))}
                        </span>
                      )}
                    </span>
                  </div>
                  <IconButton
                    icon="pencil"
                    label={`Edit ${rule.title}`}
                    onClick={() => {
                      setEditingId(rule.id)
                      document.querySelector('.recurring')?.scrollTo?.({ top: 0, behavior: 'smooth' })
                    }}
                  />
                  <IconButton
                    icon="trash"
                    label={`Delete ${rule.title}`}
                    onClick={() => {
                      if (rule.id === editingId) startOver()
                      onDelete(rule.id)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
