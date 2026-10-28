import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { createAppQueryClient } from './services/queries/queryClient'
import './index.css'
import App from './App.tsx'
import { ReminderPopup } from './features/reminders/ReminderPopup'
import { isReminderPopup } from './features/reminders/reminderWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={createAppQueryClient()}>
      {isReminderPopup() ? <ReminderPopup /> : <App />}
    </QueryClientProvider>
  </StrictMode>,
)
