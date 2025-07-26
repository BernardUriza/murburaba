import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit'
import type { Notification } from '../types'

interface UIState {
  // Modals and panels
  showAudioDemo: boolean
  showAdvancedMetrics: boolean
  showSettings: boolean
  showCopilot: boolean
  
  // UI preferences
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
  
  // Notifications
  notifications: Notification[]
  
  // UI error state
  lastError: string | null
  errorTimestamp: number | null
}

const initialState: UIState = {
  showAudioDemo: false,
  showAdvancedMetrics: false,
  showSettings: false,
  showCopilot: false,
  theme: 'light',
  sidebarCollapsed: false,
  notifications: [],
  lastError: null,
  errorTimestamp: null
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleAudioDemo: (state) => {
      state.showAudioDemo = !state.showAudioDemo
    },
    toggleAdvancedMetrics: (state) => {
      state.showAdvancedMetrics = !state.showAdvancedMetrics
    },
    toggleSettings: (state) => {
      state.showSettings = !state.showSettings
    },
    toggleCopilot: (state) => {
      state.showCopilot = !state.showCopilot
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    addNotification: (state, action: PayloadAction<{
      type: 'info' | 'success' | 'warning' | 'error'
      message: string
    }>) => {
      const notification: Notification = {
        id: nanoid(),
        timestamp: Date.now(),
        ...action.payload
      }
      state.notifications.push(notification)
      
      // Auto-remove old notifications (keep last 10)
      if (state.notifications.length > 10) {
        state.notifications = state.notifications.slice(-10)
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
    setUIError: (state, action: PayloadAction<string>) => {
      state.lastError = action.payload
      state.errorTimestamp = Date.now()
      
      // Also add as error notification
      state.notifications.push({
        id: nanoid(),
        type: 'error',
        message: action.payload,
        timestamp: Date.now()
      })
    },
    clearUIError: (state) => {
      state.lastError = null
      state.errorTimestamp = null
    }
  }
})

export const {
  toggleAudioDemo,
  toggleAdvancedMetrics,
  toggleSettings,
  toggleCopilot,
  setTheme,
  toggleSidebar,
  addNotification,
  removeNotification,
  clearNotifications,
  setUIError,
  clearUIError
} = uiSlice.actions

export default uiSlice.reducer