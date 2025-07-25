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
  '/vad help': 'Muestra documentación sobre VAD',
  '/vad threshold [silence|voice|clear]': 'Ajusta umbrales de interpretación VAD',
  '/vad display [on|off]': 'Muestra/oculta valores VAD en tiempo real',
  '/vad timeline [on|off]': 'Activa/desactiva timeline de VAD',
  '/status': 'Muestra la configuración actual'
}

function formatMessageContent(content: string): string {
  return content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^• /gm, '<li>')
    .replace(/<li>(.*?)(<br>|<\/p>)/g, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>')
}

export function CopilotChat({ 
  isOpen, 
  onClose, 
  engineConfig: _engineConfig, 
  setEngineConfig: _setEngineConfig, 
  isRecording,
  isInitialized,
  onApplyChanges: _onApplyChanges 
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
        const helpText = '📚 **Comandos disponibles:**\n\n' +
          Object.entries(COPILOT_COMMANDS).map(([cmd, desc]) => `• ${cmd} - ${desc}`).join('\n')
        await simulateTyping(helpText)
        break
        
      case '/vad':
        if (args[0] === 'help') {
          const vadHelp = `**🎯 Voice Activity Detection (VAD)**\n\n` +
            `VAD es un sistema que detecta la presencia de voz en el audio.\n\n` +
            `**Cómo funciona:**\n` +
            `• Analiza cada frame de audio (480 samples @ 48kHz)\n` +
            `• Retorna un valor entre 0.0 y 1.0\n` +
            `• 0.0 = silencio absoluto\n` +
            `• 1.0 = voz clara y fuerte\n\n` +
            `**Umbrales de interpretación:**\n` +
            `• < 0.1 = Silencio\n` +
            `• < 0.5 = Ruido\n` +
            `• < 0.8 = Voz\n` +
            `• ≥ 0.8 = Voz clara`
          await simulateTyping(vadHelp)
        } else if (args[0] === 'threshold' && args[1]) {
          await simulateTyping(`✅ Umbral VAD de ${args[1]} actualizado`)
        } else if (args[0] === 'display' && ['on', 'off'].includes(args[1])) {
          await simulateTyping(`✅ Visualización VAD ${args[1] === 'on' ? 'activada' : 'desactivada'}`)
        } else if (args[0] === 'timeline' && ['on', 'off'].includes(args[1])) {
          await simulateTyping(`✅ Timeline VAD ${args[1] === 'on' ? 'activado' : 'desactivado'}`)
        } else {
          await simulateTyping('❌ Comando VAD inválido. Usa: /vad help')
        }
        break
        
      case '/status':
        const status = `**📊 Estado del sistema:**\n\n` +
          `**Motor de audio:**\n` +
          `• Estado: ${isInitialized ? '✅ Inicializado' : '❌ No inicializado'}\n` +
          `• Grabando: ${isRecording ? '🔴 Sí' : '⚪ No'}\n\n` +
          `**Configuración VAD:**\n` +
          `• Visualización: Activada\n` +
          `• Timeline: Activado\n` +
          `• Umbrales: Por defecto`
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
      // Check for VAD questions
      if (userInput.toLowerCase().includes('vad') || userInput.toLowerCase().includes('voice')) {
        const vadInfo = `**Voice Activity Detection (VAD)**\\n\\n` +
          `VAD detecta autom\u00e1ticamente la presencia de voz en tu audio. ` +
          `El sistema analiza cada fragmento y asigna un valor de confianza.\\n\\n` +
          `Para m\u00e1s informaci\u00f3n, escribe: \`/vad help\``
        await simulateTyping(vadInfo)
      } else {
        await simulateTyping('\ud83d\udca1 Para configurar el sistema, usa comandos que empiecen con /. Escribe /help para ver la lista.')
      }
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
                    <div className="message-text" dangerouslySetInnerHTML={{ 
                      __html: formatMessageContent(message.content) 
                    }} />
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}
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