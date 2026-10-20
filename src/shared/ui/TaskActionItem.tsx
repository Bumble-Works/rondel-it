import type { ReactNode } from 'react'
import type { Task } from '../../domain/types'
import { StatusCircle } from './StatusCircle'
import './TaskActionItem.css'

interface TaskActionItemProps {
  task: Task
  /** A short line under the title, e.g. the task's day or reminder time. */
  detail?: string | null
  /** Quick actions, shown beside the title (or under it, if they don't fit). */
  children: ReactNode
}

/** A list of TaskActionItems. */
export function TaskActionList({ children }: { children: ReactNode }) {
  return <ul className="task-action-list">{children}</ul>
}

/** One task in a list that asks for a decision (the nag, the reminder pop-up). */
export function TaskActionItem({ task, detail, children }: TaskActionItemProps) {
  return (
    <li className="task-action-item">
      <div className="task-action-item-main">
        <StatusCircle status={task.status} presentational size={16} />
        <div className="task-action-item-text">
          <span className="task-action-item-title">{task.title}</span>
          {detail && <span className="task-action-item-detail">{detail}</span>}
        </div>
      </div>
      <div className="task-action-item-actions">{children}</div>
    </li>
  )
}
