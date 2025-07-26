import React from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { toggleAudioDemo, toggleAdvancedMetrics, addNotification } from '../store/slices/uiSlice'
import { setChunkDuration, setEnableAGC } from '../store/slices/audioSlice'

export function ReduxDemo() {
  const dispatch = useAppDispatch()
  
  // Seleccionar estado desde Redux
  const { showAudioDemo, showAdvancedMetrics, notifications } = useAppSelector(state => state.ui)
  const { chunkDuration, enableAGC, isProcessing } = useAppSelector(state => state.audio)

  return (
    <div className="p-4 bg-gray-100 rounded-lg mb-6">
      <h3 className="text-lg font-bold mb-4">🧨 Redux Store Demo</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold mb-2">UI State (Redux)</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showAudioDemo}
                onChange={() => dispatch(toggleAudioDemo())}
              />
              Show Audio Demo: {showAudioDemo ? 'ON' : 'OFF'}
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showAdvancedMetrics}
                onChange={() => dispatch(toggleAdvancedMetrics())}
              />
              Show Advanced Metrics: {showAdvancedMetrics ? 'ON' : 'OFF'}
            </label>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Audio State (Redux)</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enableAGC}
                onChange={(e) => dispatch(setEnableAGC(e.target.checked))}
              />
              Enable AGC: {enableAGC ? 'ON' : 'OFF'}
            </label>
            
            <div className="flex items-center gap-2">
              <label>Chunk Duration:</label>
              <select
                value={chunkDuration}
                onChange={(e) => dispatch(setChunkDuration(Number(e.target.value)))}
                className="border rounded px-2 py-1"
              >
                <option value={2}>2s</option>
                <option value={5}>5s</option>
                <option value={8}>8s</option>
                <option value={10}>10s</option>
              </select>
            </div>
            
            <div>
              Processing: {isProcessing ? '🔄 YES' : '✅ NO'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          className="btn btn-primary"
          onClick={() => dispatch(addNotification({
            type: 'success',
            message: 'Redux is working! 🎉'
          }))}
        >
          Add Success Notification
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={() => dispatch(addNotification({
            type: 'error',
            message: 'Example error from Redux'
          }))}
        >
          Add Error Notification
        </button>
      </div>
      
      {notifications.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Notifications:</h4>
          <div className="space-y-1">
            {notifications.map(notif => (
              <div 
                key={notif.id}
                className={`p-2 rounded text-sm ${
                  notif.type === 'error' ? 'bg-red-100 text-red-800' : 
                  notif.type === 'success' ? 'bg-green-100 text-green-800' : 
                  'bg-blue-100 text-blue-800'
                }`}
              >
                {notif.type.toUpperCase()}: {notif.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}