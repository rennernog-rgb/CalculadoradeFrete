import { useState, useMemo } from 'react'
import './FreightCalculator.css'

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const initialState = {
  origem: '',
  destino: '',
  distanciaKm: '',
  mediaConsumo: '',
  quantidadeEixos: '',
  tipoCarga: '',
  valorDiesel: '',
  capacidadeCarga: '',
  valorPorTonelada: '',
  viagensPorSemana: '',
}

export default function FreightCalculator() {
  const [form, setForm] = useState(initialState)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleReset() {
    setForm(initialState)
  }

  const resultados = useMemo(() => {
    const distancia = parseFloat(form.distanciaKm) || 0
    const consumo = parseFloat(form.mediaConsumo) || 0
    const diesel = parseFloat(form.valorDiesel) || 0
    const capacidade = parseFloat(form.capacidadeCarga) || 0
    const valorTon = parseFloat(form.valorPorTonelada) || 0

    const gastoCombustivel = consumo > 0 ? (distancia / consumo) * diesel : 0
    const faturamentoBruto = capacidade * valorTon
    const lucroLiquido = faturamentoBruto - gastoCombustivel

    const pronto = distancia > 0 && consumo > 0 && diesel > 0 && capacidade > 0 && valorTon > 0

    return { gastoCombustivel, faturamentoBruto, lucroLiquido, pronto }
  }, [form.distanciaKm, form.mediaConsumo, form.valorDiesel, form.capacidadeCarga, form.valorPorTonelada])

  return (
    <div className="fc-wrapper">
      <header className="fc-header">
        <div className="fc-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 5v4h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        <div className="fc-header-text">
          <h1>Calculadora de Frete</h1>
          <p>Preencha os dados abaixo para calcular os custos da operação logística</p>
        </div>
        <div className="fc-header-badge">Gestão Logística</div>
      </header>

      <form className="fc-form" onSubmit={(e) => e.preventDefault()}>

        {/* Seção: Rota */}
        <section className="fc-section">
          <div className="fc-section-label">
            <span className="fc-section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </span>
            Informações da Rota
          </div>
          <div className="fc-grid fc-grid-2">
            <div className="fc-field">
              <label htmlFor="origem">
                Origem
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="10" r="3" />
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
                <input
                  id="origem"
                  name="origem"
                  type="text"
                  placeholder="Ex: São Paulo, SP"
                  value={form.origem}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="fc-field">
              <label htmlFor="destino">
                Destino
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" fill="currentColor" />
                </svg>
                <input
                  id="destino"
                  name="destino"
                  type="text"
                  placeholder="Ex: Rio de Janeiro, RJ"
                  value={form.destino}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="fc-field">
              <label htmlFor="distanciaKm">
                Distância Total
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12h20M17 7l5 5-5 5" />
                </svg>
                <input
                  id="distanciaKm"
                  name="distanciaKm"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.distanciaKm}
                  onChange={handleChange}
                />
                <span className="fc-unit">km</span>
              </div>
            </div>

            <div className="fc-field">
              <label htmlFor="viagensPorSemana">
                Número de Viagens por Semana
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <input
                  id="viagensPorSemana"
                  name="viagensPorSemana"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.viagensPorSemana}
                  onChange={handleChange}
                />
                <span className="fc-unit">viagens</span>
              </div>
            </div>
          </div>
        </section>

        {/* Seção: Veículo */}
        <section className="fc-section">
          <div className="fc-section-label">
            <span className="fc-section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 5v4h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </span>
            Dados do Veículo
          </div>
          <div className="fc-grid fc-grid-3">
            <div className="fc-field">
              <label htmlFor="mediaConsumo">
                Média de Consumo
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
                <input
                  id="mediaConsumo"
                  name="mediaConsumo"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.mediaConsumo}
                  onChange={handleChange}
                />
                <span className="fc-unit">km/l</span>
              </div>
            </div>

            <div className="fc-field">
              <label htmlFor="quantidadeEixos">
                Quantidade de Eixos
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <path d="M6 15V9l6-6 6 6v6" />
                </svg>
                <input
                  id="quantidadeEixos"
                  name="quantidadeEixos"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.quantidadeEixos}
                  onChange={handleChange}
                />
                <span className="fc-unit">eixos</span>
              </div>
            </div>

            <div className="fc-field">
              <label htmlFor="capacidadeCarga">
                Capacidade de Carga
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                <input
                  id="capacidadeCarga"
                  name="capacidadeCarga"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0,0"
                  value={form.capacidadeCarga}
                  onChange={handleChange}
                />
                <span className="fc-unit">ton</span>
              </div>
            </div>
          </div>
        </section>

        {/* Seção: Carga e Combustível */}
        <section className="fc-section">
          <div className="fc-section-label">
            <span className="fc-section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </span>
            Carga e Custos
          </div>
          <div className="fc-grid fc-grid-3">
            <div className="fc-field">
              <label htmlFor="tipoCarga">
                Tipo de Carga
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <input
                  id="tipoCarga"
                  name="tipoCarga"
                  type="text"
                  placeholder="Ex: Granel, Frigorificado..."
                  value={form.tipoCarga}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="fc-field">
              <label htmlFor="valorDiesel">
                Valor do Diesel S10
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="fc-prefix">R$</span>
                <input
                  id="valorDiesel"
                  name="valorDiesel"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valorDiesel}
                  onChange={handleChange}
                  className="has-prefix"
                />
                <span className="fc-unit">/ litro</span>
              </div>
            </div>

            <div className="fc-field">
              <label htmlFor="valorPorTonelada">
                Valor pago por Tonelada
                <span className="fc-required">*</span>
              </label>
              <div className="fc-input-wrap">
                <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span className="fc-prefix">R$</span>
                <input
                  id="valorPorTonelada"
                  name="valorPorTonelada"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valorPorTonelada}
                  onChange={handleChange}
                  className="has-prefix"
                />
                <span className="fc-unit">/ ton</span>
              </div>
            </div>
          </div>
        </section>

        <div className="fc-actions">
          <button type="button" className="fc-btn fc-btn-ghost" onClick={handleReset}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Limpar Campos
          </button>
        </div>

        {/* Seção: Resultados */}
        <section className={`fc-results ${resultados.pronto ? 'fc-results--active' : ''}`}>
          <div className="fc-section-label">
            <span className="fc-section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            Resultados da Viagem
            {!resultados.pronto && (
              <span className="fc-results-hint">Preencha os campos numéricos para ver os resultados</span>
            )}
          </div>

          <div className="fc-results-grid">
            {/* Gasto de Combustível */}
            <div className="fc-result-card fc-result-card--cost">
              <div className="fc-result-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <div className="fc-result-body">
                <span className="fc-result-label">Gasto de Combustível</span>
                <span className="fc-result-formula">(Distância ÷ Consumo) × Diesel</span>
                <span className="fc-result-value">
                  {resultados.pronto ? formatBRL(resultados.gastoCombustivel) : '—'}
                </span>
              </div>
            </div>

            {/* Faturamento Bruto */}
            <div className="fc-result-card fc-result-card--revenue">
              <div className="fc-result-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="fc-result-body">
                <span className="fc-result-label">Faturamento Bruto</span>
                <span className="fc-result-formula">Capacidade × Valor por Tonelada</span>
                <span className="fc-result-value">
                  {resultados.pronto ? formatBRL(resultados.faturamentoBruto) : '—'}
                </span>
              </div>
            </div>

            {/* Lucro Líquido */}
            <div className={`fc-result-card fc-result-card--profit ${resultados.pronto && resultados.lucroLiquido < 0 ? 'fc-result-card--negative' : ''}`}>
              <div className="fc-result-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div className="fc-result-body">
                <span className="fc-result-label">Lucro Líquido da Viagem</span>
                <span className="fc-result-formula">Faturamento Bruto − Gasto de Combustível</span>
                <span className="fc-result-value">
                  {resultados.pronto ? formatBRL(resultados.lucroLiquido) : '—'}
                </span>
              </div>
            </div>
          </div>
        </section>
      </form>

      <footer className="fc-footer">
        <span>* Campos obrigatórios</span>
        <span>Calculadora de Frete v1.0</span>
      </footer>
    </div>
  )
}
