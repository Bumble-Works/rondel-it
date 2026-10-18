import { Button } from './Button'
import { Modal } from './Modal'
import './ChoiceModal.css'

export interface Choice<T extends string> {
  value: T
  label: string
  primary?: boolean
}

interface ChoiceModalProps<T extends string> {
  open: boolean
  title: string
  message: string
  choices: Array<Choice<T>>
  onChoose: (value: T) => void
  /** Closing without choosing cancels the change. */
  onCancel: () => void
}

/** Asks the user to pick one of a few options (e.g. "only this one" vs "all"). */
export function ChoiceModal<T extends string>({ open, title, message, choices, onChoose, onCancel }: ChoiceModalProps<T>) {
  return (
    <Modal
      open={open}
      title={title}
      width={420}
      onClose={onCancel}
      footer={
        <div className="choice-actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {choices.map((choice) => (
            <Button key={choice.value} variant={choice.primary ? 'primary' : 'secondary'} onClick={() => onChoose(choice.value)}>
              {choice.label}
            </Button>
          ))}
        </div>
      }
    >
      <p className="choice-message">{message}</p>
    </Modal>
  )
}
