import React, { useEffect, useState } from 'react'
import { useMurmurabaSuite, TOKENS, SUITE_TOKENS } from 'murmuraba'
import styles from './ServiceMonitor.module.css'

interface ServiceInfo {
  name: string
  token: symbol | string
  available: boolean
  description: string
}

export function ServiceMonitor() {
  const { container, isReady } = useMurmurabaSuite()
  const [services, setServices] = useState<ServiceInfo[]>([])
  
  useEffect(() => {
    if (!isReady || !container) return
    
    const serviceList: ServiceInfo[] = [
      {
        name: 'AudioProcessor',
        token: SUITE_TOKENS.AudioProcessor,
        available: container.has(SUITE_TOKENS.AudioProcessor),
        description: 'Main audio processing service'
      },
      {
        name: 'Logger',
        token: TOKENS.Logger,
        available: container.has(TOKENS.Logger),
        description: 'Logging and debugging service'
      },
      {
        name: 'MetricsManager',
        token: TOKENS.MetricsManager,
        available: container.has(TOKENS.MetricsManager),
        description: 'Performance metrics tracking'
      },
      {
        name: 'StateManager',
        token: TOKENS.StateManager,
        available: container.has(TOKENS.StateManager),
        description: 'Global state management'
      },
      {
        name: 'EventEmitter',
        token: TOKENS.EventEmitter,
        available: container.has(TOKENS.EventEmitter),
        description: 'Event pub/sub system'
      },
      {
        name: 'WorkerManager',
        token: TOKENS.WorkerManager,
        available: container.has(TOKENS.WorkerManager),
        description: 'Web Worker management'
      }
    ]
    
    setServices(serviceList)
    
    // Use logger if available
    const logger = container.get(TOKENS.Logger)
    if (logger) {
      logger.info('Service Monitor initialized', {
        availableServices: serviceList.filter(s => s.available).map(s => s.name)
      })
    }
  }, [container, isReady])
  
  if (!isReady) return null
  
  return (
    <div className={styles.monitor}>
      <h4 className={styles.title}>MurmurabaSuite Services</h4>
      <div className={styles.services}>
        {services.map(service => (
          <div 
            key={service.name} 
            className={`${styles.service} ${service.available ? styles.available : styles.unavailable}`}
          >
            <div className={styles.serviceHeader}>
              <span className={styles.indicator}>
                {service.available ? '✓' : '✗'}
              </span>
              <span className={styles.name}>{service.name}</span>
            </div>
            <div className={styles.description}>{service.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}