import React, { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  type: 'user' | 'copilot'
  content: string
  timestamp: Date
  isTyping?: boolean
}

interface CopilotChatProps {
  isOpen: boolean
  onClose: () => void
  engineConfig: any
  setEngineConfig: (config: any) => void
  isRecording: boolean
  isInitialized: boolean
  onApplyChanges: () => Promise<void>
}

const COPILOT_COMMANDS = {
  '/help': 'Muestra todos los comandos disponibles',
  '/noise [low|medium|high|auto]': 'Ajusta el nivel de reducción de ruido',
  '/algorithm [rnnoise|spectral|adaptive]': 'Cambia el algoritmo de procesamiento',
  '/buffer [256|512|1024|2048|4096]': 'Configura el tamaño del buffer',
  '/worker [on|off]': 'Activa/desactiva Web Worker',
  '/degraded [on|off]': 'Permite/deniega modo degradado',
  '/apply': 'Aplica los cambios realizados',
  '/status': 'Muestra la configuración actual'
}

export function CopilotChat({ 
  isOpen, 
  onClose, 
  engineConfig, 
  setEngineConfig, 
  isRecording,
  isInitialized,
  onApplyChanges 
}: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'copilot',
      content: '🤖 Hola! Soy tu copiloto de audio. Puedo ayudarte a configurar el motor de procesamiento. Escribe /help para ver los comandos disponibles.',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (type: 'user' | 'copilot', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const simulateTyping = async (response: string) => {
    setIsTyping(true)
    const typingMessage: Message = {
      id: 'typing',
      type: 'copilot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])
    
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setMessages(prev => prev.filter(m => m.id !== 'typing'))
    addMessage('copilot', response)
    setIsTyping(false)
  }

  const processCommand = async (command: string) => {
    const [cmd, ...args] = command.toLowerCase().split(' ')
    
    switch (cmd) {
      case '/help':
        await simulateTyping(
          '📚 Comandos disponibles:\\n\\n' +
          Object.entries(COPILOT_COMMANDS).map(([cmd, desc]) => `${cmd} - ${desc}`).join('\\n')
        )
        break
        
      case '/noise':
        const noiseLevel = args[0]
        if (['low', 'medium', 'high', 'auto'].includes(noiseLevel)) {
          setEngineConfig((prev: any) => ({ ...prev, noiseReductionLevel: noiseLevel }))
          await simulateTyping(`✅ Nivel de reducción de ruido ajustado a: ${noiseLevel}`)
        } else {
          await simulateTyping('❌ Nivel inválido. Usa: low, medium, high o auto')
        }
        break
        
      case '/algorithm':
        const algo = args[0]
        if (['rnnoise', 'spectral', 'adaptive'].includes(algo)) {
          setEngineConfig((prev: any) => ({ ...prev, algorithm: algo }))
          await simulateTyping(`✅ Algoritmo cambiado a: ${algo}`)
        } else {
          await simulateTyping('❌ Algoritmo inválido. Usa: rnnoise, spectral o adaptive')
        }
        break
        
      case '/buffer':
        const size = parseInt(args[0])
        if ([256, 512, 1024, 2048, 4096].includes(size)) {
          setEngineConfig((prev: any) => ({ ...prev, bufferSize: size }))
          await simulateTyping(`✅ Tamaño de buffer ajustado a: ${size} samples`)
        } else {
          await simulateTyping('❌ Tamaño inválido. Usa: 256, 512, 1024, 2048 o 4096')
        }
        break
        
      case '/worker':
        const workerState = args[0]
        if (['on', 'off'].includes(workerState)) {
          setEngineConfig((prev: any) => ({ ...prev, useWorker: workerState === 'on' }))
          await simulateTyping(`✅ Web Worker ${workerState === 'on' ? 'activado' : 'desactivado'}`)
        } else {
          await simulateTyping('❌ Estado inválido. Usa: on o off')
        }
        break
        
      case '/degraded':
        const degradedState = args[0]
        if (['on', 'off'].includes(degradedState)) {
          setEngineConfig((prev: any) => ({ ...prev, allowDegraded: degradedState === 'on' }))
          await simulateTyping(`✅ Modo degradado ${degradedState === 'on' ? 'permitido' : 'denegado'}`)
        } else {
          await simulateTyping('❌ Estado inválido. Usa: on o off')
        }
        break
        
      case '/apply':
        if (isInitialized && !isRecording) {
          await simulateTyping('⚙️ Aplicando cambios...')
          await onApplyChanges()
          await simulateTyping('✅ Cambios aplicados exitosamente!')
        } else {
          await simulateTyping('❌ No puedo aplicar cambios ahora. Asegúrate de que el motor esté inicializado y no esté grabando.')
        }
        break
        
      case '/status':
        const status = `📊 Configuración actual:
• Reducción de ruido: ${engineConfig.noiseReductionLevel || 'medium'}
• Algoritmo: ${engineConfig.algorithm || 'rnnoise'}
• Buffer: ${engineConfig.bufferSize || 1024} samples
• Web Worker: ${engineConfig.useWorker ? 'activado' : 'desactivado'}
• Modo degradado: ${engineConfig.allowDegraded ? 'permitido' : 'denegado'}`
        await simulateTyping(status)
        break
        
      default:
        await simulateTyping(`❓ Comando no reconocido: ${cmd}. Escribe /help para ver los comandos disponibles.`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return
    
    const userInput = input.trim()
    addMessage('user', userInput)
    setInput('')
    
    if (userInput.startsWith('/')) {
      await processCommand(userInput)
    } else {
      await simulateTyping('💡 Para configurar el motor, usa comandos que empiecen con /. Escribe /help para ver la lista.')
    }
  }

  return (
    <>
      <div className={`slide-panel-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`slide-panel copilot-chat ${isOpen ? 'active' : ''}`}>
        <div className="copilot-header">
          <div className="copilot-title">
            <span className="copilot-icon">🤖</span>
            <h3>Copiloto de Audio</h3>
            <span className="copilot-status">● Online</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="copilot-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              {message.isTyping ? (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <>
                  <div className="message-avatar">
                    {message.type === 'copilot' ? '🤖' : '👤'}
                  </div>
                  <div className="message-content">
                    <pre>{message.content}</pre>
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="copilot-input-form">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un comando..."
            className="copilot-input"
            disabled={isTyping}
          />
          <button 
            type="submit" 
            className="copilot-send"
            disabled={!input.trim() || isTyping}
          >
            <span>↵</span>
          </button>
        </form>
      </div>
    </>
  )
}