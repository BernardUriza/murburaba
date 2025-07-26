import { createSlice, PayloadAction } from '@reduxjs/toolkit'

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
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    message: string
    timestamp: number
  }>
}

const initialState: UIState = {
  showAudioDemo: false,
  showAdvancedMetrics: false,
  showSettings: false,
  showCopilot: false,
  theme: 'light',
  sidebarCollapsed: false,
  notifications: []
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
      state.notifications.push({
        id: `notif-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        ...action.payload
      })
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
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
  clearNotifications
} = uiSlice.actions

export default uiSlice.reducer