import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ReminderPopup } from './features/reminders/ReminderPopup'
import { isReminderPopup } from './features/reminders/reminderWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isReminderPopup() ? <ReminderPopup /> : <App />}</StrictMode>,
)
