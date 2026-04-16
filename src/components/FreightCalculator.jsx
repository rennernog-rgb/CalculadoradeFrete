import { useState, useMemo, useEffect, useRef } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import './FreightCalculator.css'

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const DASH = '—'

const initialState = {
  origem: '',
  destino: '',
  distanciaKm: '',
  mediaConsumo: '',
  quantidadeEixos: '',
  quantidadePedagios: '',
  valorMedioPorEixo: '',
  tipoCarga: '',
  valorDiesel: '',
  capacidadeCarga: '',
  valorPorTonelada: '',
  viagensPorSemana: '',
}

export default function FreightCalculator() {
  const [form, setForm] = useState(initialState)
  const [loadingDist, setLoadingDist]   = useState(false)
  const [distAutoFill, setDistAutoFill] = useState(false)

  const origemRef    = useRef(null)
  const destinoRef   = useRef(null)
  const origemPlace  = useRef(null)
  const destinoPlace = useRef(null)

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'distanciaKm') setDistAutoFill(false)
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleReset() {
    setForm(initialState)
    origemPlace.current  = null
    destinoPlace.current = null
    setLoadingDist(false)
    setDistAutoFill(false)
  }

  function calcularDistancia() {
    if (!origemPlace.current?.geometry || !destinoPlace.current?.geometry) return
    const g = window.google
    if (!g) return
    setLoadingDist(true)
    new g.maps.DistanceMatrixService().getDistanceMatrix(
      {
        origins:      [origemPlace.current.geometry.location],
        destinations: [destinoPlace.current.geometry.location],
        travelMode:   g.maps.TravelMode.DRIVING,
        unitSystem:   g.maps.UnitSystem.METRIC,
      },
      (res, status) => {
        setLoadingDist(false)
        if (status !== 'OK') return
        const el = res.rows[0].elements[0]
        if (el.status !== 'OK') return
        setForm(prev => ({ ...prev, distanciaKm: (el.distance.value / 1000).toFixed(1) }))
        setDistAutoFill(true)
      }
    )
  }

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!apiKey) return

    const opts = {
      componentRestrictions: { country: 'br' },
      fields: ['geometry', 'name', 'formatted_address'],
    }

    setOptions({ apiKey, version: 'weekly' })

    importLibrary('places').then(({ Autocomplete }) => {
      const acOrigem  = new Autocomplete(origemRef.current,  opts)
      const acDestino = new Autocomplete(destinoRef.current, opts)

      acOrigem.addListener('place_changed', () => {
        const p = acOrigem.getPlace()
        if (!p.geometry) return
        origemPlace.current = p
        setForm(prev => ({ ...prev, origem: p.name || p.formatted_address }))
        setDistAutoFill(false)
        calcularDistancia()
      })

      acDestino.addListener('place_changed', () => {
        const p = acDestino.getPlace()
        if (!p.geometry) return
        destinoPlace.current = p
        setForm(prev => ({ ...prev, destino: p.name || p.formatted_address }))
        setDistAutoFill(false)
        calcularDistancia()
      })
    }).catch(() => {})
  }, [])

  const calc = useMemo(() => {
    const distancia   = parseFloat(form.distanciaKm)      || 0
    const consumo     = parseFloat(form.mediaConsumo)      || 0
    const diesel      = parseFloat(form.valorDiesel)       || 0
    const capacidade  = parseFloat(form.capacidadeCarga)   || 0
    const valorTon    = parseFloat(form.valorPorTonelada)  || 0
    const viagens     = parseFloat(form.viagensPorSemana)  || 0
    const eixos       = parseFloat(form.quantidadeEixos)   || 0
    const numPedagios = parseFloat(form.quantidadePedagios)|| 0
    const valorEixo   = parseFloat(form.valorMedioPorEixo) || 0

    const gastoCombustivel = consumo > 0 ? (distancia / consumo) * diesel : 0
    const custoPedagio     = eixos * valorEixo * numPedagios
    const faturamentoBruto = capacidade * valorTon
    const lucroLiquido     = faturamentoBruto - gastoCombustivel - custoPedagio

    const lucroSemanal = lucroLiquido * viagens
    const lucroDiario  = viagens > 0 ? lucroSemanal / 5 : 0
    const lucroMensal  = lucroDiario * 22

    const prontoViagem  = distancia > 0 && consumo > 0 && diesel > 0 && capacidade > 0 && valorTon > 0
    const prontoProjecao = prontoViagem && viagens > 0

    return {
      gastoCombustivel, custoPedagio, faturamentoBruto, lucroLiquido,
      lucroSemanal, lucroDiario, lucroMensal,
      prontoViagem, prontoProjecao,
    }
  }, [
    form.distanciaKm, form.mediaConsumo, form.valorDiesel,
    form.capacidadeCarga, form.valorPorTonelada, form.viagensPorSemana,
    form.quantidadeEixos, form.quantidadePedagios, form.valorMedioPorEixo,
  ])

  const lucroPositivo = calc.lucroMensal >= 0

  return (
    <div className="fc-wrapper">

      {/* ── HEADER ── */}
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
          <p>Dashboard de gestão logística e projeção financeira</p>
        </div>
        <div className="fc-header-badge">v2.0 · Gestão Logística</div>
      </header>

      {/* ── DASHBOARD ── */}
      <div className="fc-dashboard">

        {/* ── Coluna Esquerda: Formulário ── */}
        <div className="fc-form-col">
          <form onSubmit={(e) => e.preventDefault()}>

            {/* Informações da Rota */}
            <section className="fc-section">
              <div className="fc-section-label">
                <span className="fc-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="10" r="3" />
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                </span>
                Informações da Rota
              </div>
              <div className="fc-grid fc-grid-2">
                <div className="fc-field">
                  <label htmlFor="origem">Origem <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <input ref={origemRef} id="origem" name="origem" type="text" placeholder="Ex: São Paulo, SP" value={form.origem} onChange={handleChange} />
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="destino">Destino <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" fill="currentColor" />
                    </svg>
                    <input ref={destinoRef} id="destino" name="destino" type="text" placeholder="Ex: Rio de Janeiro, RJ" value={form.destino} onChange={handleChange} />
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="distanciaKm">
                    Distância Total <span className="fc-required">*</span>
                    {distAutoFill && <span className="fc-maps-tag">Google Maps</span>}
                  </label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12h20M17 7l5 5-5 5" />
                    </svg>
                    <input
                      id="distanciaKm" name="distanciaKm" type="number"
                      min="0" step="0.01" placeholder="0"
                      value={form.distanciaKm} onChange={handleChange}
                      className={distAutoFill ? 'fc-input--autofill' : ''}
                    />
                    {loadingDist
                      ? <span className="fc-unit-spin">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                        </span>
                      : <span className="fc-unit">km</span>
                    }
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="viagensPorSemana">Viagens por Semana <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <input id="viagensPorSemana" name="viagensPorSemana" type="number" min="0" step="1" placeholder="0" value={form.viagensPorSemana} onChange={handleChange} />
                    <span className="fc-unit">viagens</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Dados do Veículo */}
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
                  <label htmlFor="mediaConsumo">Média de Consumo <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                    <input id="mediaConsumo" name="mediaConsumo" type="number" min="0" step="0.01" placeholder="0,00" value={form.mediaConsumo} onChange={handleChange} />
                    <span className="fc-unit">km/l</span>
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="quantidadeEixos">Qtd. de Eixos <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="18" r="3" />
                      <path d="M6 15V9l6-6 6 6v6" />
                    </svg>
                    <input id="quantidadeEixos" name="quantidadeEixos" type="number" min="0" step="1" placeholder="0" value={form.quantidadeEixos} onChange={handleChange} />
                    <span className="fc-unit">eixos</span>
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="capacidadeCarga">Capacidade de Carga <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    <input id="capacidadeCarga" name="capacidadeCarga" type="number" min="0" step="0.1" placeholder="0,0" value={form.capacidadeCarga} onChange={handleChange} />
                    <span className="fc-unit">ton</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Pedágios da Rota */}
            <section className="fc-section">
              <div className="fc-section-label">
                <span className="fc-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                Pedágios da Rota
                {calc.custoPedagio > 0 && (
                  <span className="fc-section-badge-cost">
                    Custo total: {formatBRL(calc.custoPedagio)}
                  </span>
                )}
              </div>
              <div className="fc-grid fc-grid-2">
                <div className="fc-field">
                  <label htmlFor="quantidadePedagios">Praças de Pedágio</label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input id="quantidadePedagios" name="quantidadePedagios" type="number" min="0" step="1" placeholder="0" value={form.quantidadePedagios} onChange={handleChange} />
                    <span className="fc-unit">praças</span>
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="valorMedioPorEixo">Valor Médio por Eixo</label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <span className="fc-prefix">R$</span>
                    <input id="valorMedioPorEixo" name="valorMedioPorEixo" type="number" min="0" step="0.01" placeholder="0,00" value={form.valorMedioPorEixo} onChange={handleChange} className="has-prefix" />
                    <span className="fc-unit">/ eixo</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Carga e Receita */}
            <section className="fc-section">
              <div className="fc-section-label">
                <span className="fc-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
                Carga e Receita
              </div>
              <div className="fc-grid fc-grid-3">
                <div className="fc-field">
                  <label htmlFor="tipoCarga">Tipo de Carga <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <input id="tipoCarga" name="tipoCarga" type="text" placeholder="Ex: Granel, Frigorificado..." value={form.tipoCarga} onChange={handleChange} />
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="valorDiesel">Diesel S10 <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="fc-prefix">R$</span>
                    <input id="valorDiesel" name="valorDiesel" type="number" min="0" step="0.01" placeholder="0,00" value={form.valorDiesel} onChange={handleChange} className="has-prefix" />
                    <span className="fc-unit">/ litro</span>
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="valorPorTonelada">Valor por Tonelada <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <span className="fc-prefix">R$</span>
                    <input id="valorPorTonelada" name="valorPorTonelada" type="number" min="0" step="0.01" placeholder="0,00" value={form.valorPorTonelada} onChange={handleChange} className="has-prefix" />
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

          </form>
        </div>

        {/* ── Coluna Direita: Painel Executivo (sticky) ── */}
        <aside className="fc-panel-col">

          {/* Card: Projeção de Lucratividade */}
          <div className={`fc-proj-card ${calc.prontoProjecao ? 'fc-proj-card--active' : ''}`}>
            <div className="fc-proj-top">
              <span className="fc-proj-eyebrow">Projeção de Lucratividade</span>
              {calc.prontoProjecao && (
                <span className={`fc-proj-status ${lucroPositivo ? '' : 'fc-proj-status--loss'}`}>
                  {lucroPositivo ? '↑ Lucrativo' : '↓ Deficitário'}
                </span>
              )}
            </div>

            <div className="fc-proj-main">
              <span className="fc-proj-main-label">Lucro Mensal Estimado</span>
              <span className={`fc-proj-main-value ${calc.prontoProjecao ? (lucroPositivo ? 'positive' : 'negative') : ''}`}>
                {calc.prontoProjecao ? formatBRL(calc.lucroMensal) : DASH}
              </span>
              <span className="fc-proj-main-sub">22 dias úteis / mês</span>
            </div>

            <div className="fc-proj-secondary">
              <div className="fc-proj-sec-item">
                <span className="fc-proj-sec-label">Semanal</span>
                <span className={`fc-proj-sec-value ${calc.prontoProjecao && calc.lucroSemanal < 0 ? 'negative' : ''}`}>
                  {calc.prontoProjecao ? formatBRL(calc.lucroSemanal) : DASH}
                </span>
              </div>
              <div className="fc-proj-sec-divider" />
              <div className="fc-proj-sec-item">
                <span className="fc-proj-sec-label">Diário</span>
                <span className={`fc-proj-sec-value ${calc.prontoProjecao && calc.lucroDiario < 0 ? 'negative' : ''}`}>
                  {calc.prontoProjecao ? formatBRL(calc.lucroDiario) : DASH}
                </span>
              </div>
            </div>

            {!calc.prontoProjecao && (
              <p className="fc-proj-hint">
                Preencha todos os campos obrigatórios para ver as projeções
              </p>
            )}
          </div>

          {/* Card: Resultado por Viagem */}
          <div className="fc-breakdown-card">
            <div className="fc-breakdown-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Resultado por Viagem
            </div>

            <div className="fc-breakdown-list">
              <div className="fc-breakdown-row">
                <div className="fc-breakdown-label">
                  <span className="fc-dot fc-dot--revenue" />
                  Faturamento Bruto
                </div>
                <span className="fc-breakdown-value">
                  {calc.prontoViagem ? formatBRL(calc.faturamentoBruto) : DASH}
                </span>
              </div>

              <div className="fc-breakdown-row">
                <div className="fc-breakdown-label">
                  <span className="fc-dot fc-dot--fuel" />
                  − Combustível
                </div>
                <span className="fc-breakdown-value fc-breakdown-value--cost">
                  {calc.prontoViagem ? formatBRL(calc.gastoCombustivel) : DASH}
                </span>
              </div>

              <div className="fc-breakdown-row">
                <div className="fc-breakdown-label">
                  <span className="fc-dot fc-dot--toll" />
                  − Pedágio
                </div>
                <span className="fc-breakdown-value fc-breakdown-value--cost">
                  {calc.prontoViagem
                    ? formatBRL(calc.custoPedagio)
                    : DASH}
                </span>
              </div>

              <div className="fc-breakdown-sep" />

              <div className="fc-breakdown-row fc-breakdown-row--total">
                <div className="fc-breakdown-label">
                  <span className={`fc-dot ${calc.prontoViagem && calc.lucroLiquido < 0 ? 'fc-dot--negative' : 'fc-dot--profit'}`} />
                  = Lucro Líquido
                </div>
                <span className={`fc-breakdown-value fc-breakdown-value--total ${
                  calc.prontoViagem
                    ? calc.lucroLiquido >= 0
                      ? 'fc-breakdown-value--profit'
                      : 'fc-breakdown-value--negative'
                    : ''
                }`}>
                  {calc.prontoViagem ? formatBRL(calc.lucroLiquido) : DASH}
                </span>
              </div>
            </div>

            {calc.prontoViagem && (
              <div className="fc-breakdown-footer">
                Faturamento − Combustível − Pedágio
              </div>
            )}
          </div>

        </aside>
      </div>

      <footer className="fc-footer">
        <span>* Campos obrigatórios</span>
        <span>Calculadora de Frete v2.0</span>
      </footer>
    </div>
  )
}
