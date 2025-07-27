import { useCallback, useEffect, useState } from 'react'
import { useMurmurabaSuite, TOKENS, SUITE_TOKENS } from 'murmuraba'
import type { ILogger, IMetricsManager, IAudioProcessor, IStateManager, IEventEmitter } from 'murmuraba'

export interface SuiteServices {
  logger: ILogger | null
  metricsManager: IMetricsManager | null
  audioProcessor: IAudioProcessor | null
  stateManager: IStateManager | null
  eventEmitter: IEventEmitter | null
}

export function useSuiteServices() {
  const { container, isReady } = useMurmurabaSuite()
  const [services, setServices] = useState<SuiteServices>({
    logger: null,
    metricsManager: null,
    audioProcessor: null,
    stateManager: null,
    eventEmitter: null
  })
  
  useEffect(() => {
    if (!isReady || !container) return
    
    try {
      setServices({
        logger: container.get<ILogger>(TOKENS.Logger),
        metricsManager: container.get<IMetricsManager>(TOKENS.MetricsManager),
        audioProcessor: container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor),
        stateManager: container.get<IStateManager>(TOKENS.StateManager),
        eventEmitter: container.get<IEventEmitter>(TOKENS.EventEmitter)
      })
    } catch (error) {
      console.error('Failed to get suite services:', error)
    }
  }, [container, isReady])
  
  // Helper methods
  const log = useCallback((level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => {
    if (!services.logger) return
    services.logger[level](message, data)
  }, [services.logger])
  
  const recordMetric = useCallback((name: string, value: number) => {
    if (!services.metricsManager) return
    
    // MetricsManager doesn't have recordMetrics method, use individual update methods
    const metricsManager = services.metricsManager as any
    
    if (name === 'inputLevel' && metricsManager.updateInputLevel) {
      metricsManager.updateInputLevel(value)
    } else if (name === 'outputLevel' && metricsManager.updateOutputLevel) {
      metricsManager.updateOutputLevel(value)
    } else if (name === 'noiseReduction' && metricsManager.updateNoiseReduction) {
      metricsManager.updateNoiseReduction(value)
    } else if (metricsManager.recordFrame) {
      // For generic metrics, just record a frame with current timestamp
      metricsManager.recordFrame()
    }
    
    // Log the metric
    if (services.logger) {
      services.logger.debug(`Metric recorded: ${name} = ${value}`)
    }
  }, [services.metricsManager, services.logger])
  
  const emit = useCallback((event: string, data: any) => {
    if (!services.eventEmitter) return
    services.eventEmitter.emit(event, data)
  }, [services.eventEmitter])
  
  const getEngineState = useCallback(() => {
    if (!services.stateManager) return null
    return services.stateManager.getState()
  }, [services.stateManager])
  
  const onStateChange = useCallback((callback: (oldState: any, newState: any) => void) => {
    if (!services.stateManager) return () => {}
    return services.stateManager.onStateChange(callback)
  }, [services.stateManager])
  
  return {
    services,
    isReady,
    // Helper methods
    log,
    recordMetric,
    emit,
    getEngineState,
    onStateChange
  }
}