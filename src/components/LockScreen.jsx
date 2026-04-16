import { useState } from 'react'
import './LockScreen.css'

const SENHA = '1810'

export default function LockScreen({ onUnlock }) {
  const [input, setInput] = useState('')
  const [erro, setErro] = useState(false)
  const [shake, setShake] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (input === SENHA) {
      sessionStorage.setItem('fc_auth', '1')
      onUnlock()
    } else {
      setErro(true)
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 500)
    }
  }

  function handleChange(e) {
    setInput(e.target.value)
    if (erro) setErro(false)
  }

  return (
    <div className="lock-wrapper">
      <div className="lock-bg" />

      <div className={`lock-card ${shake ? 'lock-card--shake' : ''}`}>
        <div className="lock-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="lock-title">Acesso Restrito</h1>
        <p className="lock-subtitle">Digite a senha para acessar a Calculadora de Frete</p>

        <form className="lock-form" onSubmit={handleSubmit}>
          <div className={`lock-input-wrap ${erro ? 'lock-input-wrap--error' : ''}`}>
            <input
              type="password"
              placeholder="••••••"
              value={input}
              onChange={handleChange}
              autoFocus
              className="lock-input"
              maxLength={20}
            />
          </div>

          {erro && (
            <p className="lock-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Senha incorreta. Tente novamente.
            </p>
          )}

          <button type="submit" className="lock-btn">
            Entrar
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        <p className="lock-footer">Calculadora de Frete v2.0 · Gestão Logística</p>
      </div>
    </div>
  )
}
