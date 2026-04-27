import { useState, useMemo, useEffect, useRef } from 'react'
import { TIPOS_CARGA, calcularFreteMinimo, calcularRetornoVazio } from '../data/tabelaMinima'
import './FreightCalculator.css'

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const DASH = '—'
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

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
  const [origemSuggs, setOrigemSuggs]   = useState([])
  const [destinoSuggs, setDestinoSuggs] = useState([])
  const [mapsReady, setMapsReady]       = useState(false)
  const [mapsError, setMapsError]       = useState('')
  const [voltarVazio, setVoltarVazio]   = useState(false)

  const origemPlace  = useRef(null)
  const destinoPlace = useRef(null)
  const origemTimer  = useRef(null)
  const destinoTimer = useRef(null)

  useEffect(() => {
    if (!API_KEY) {
      setMapsError('Chave de API não configurada.')
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=routes`
    script.async = true
    script.onload  = () => setMapsReady(true)
    script.onerror = () => setMapsError('Erro ao carregar o script do Google Maps.')
    document.head.appendChild(script)
    return () => { if (document.head.contains(script)) document.head.removeChild(script) }
  }, [])

  async function buscarSugestoes(value, setSuggs) {
    if (!value || !API_KEY) { setSuggs([]); return }
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
        },
        body: JSON.stringify({ input: value, languageCode: 'pt-BR', regionCode: 'BR' }),
      })
      const data = await res.json()
      if (data.error) {
        setMapsError('Places API: ' + data.error.message)
        setSuggs([])
      } else {
        setSuggs(data.suggestions || [])
      }
    } catch (err) {
      setMapsError('Erro na busca: ' + err.message)
      setSuggs([])
    }
  }

  async function buscarCoordenadas(placeId) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'location',
      },
    })
    const data = await res.json()
    if (!data.location) return null
    return { lat: data.location.latitude, lng: data.location.longitude }
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'distanciaKm') setDistAutoFill(false)
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleReset() {
    setForm(initialState)
    origemPlace.current  = null
    destinoPlace.current = null
    setOrigemSuggs([])
    setDestinoSuggs([])
    setLoadingDist(false)
    setDistAutoFill(false)
    setVoltarVazio(false)
    setMapsError('')
  }

  function handleOrigemChange(e) {
    const value = e.target.value
    setForm(prev => ({ ...prev, origem: value }))
    origemPlace.current = null
    setDistAutoFill(false)
    clearTimeout(origemTimer.current)
    origemTimer.current = setTimeout(() => buscarSugestoes(value, setOrigemSuggs), 350)
  }

  function handleDestinoChange(e) {
    const value = e.target.value
    setForm(prev => ({ ...prev, destino: value }))
    destinoPlace.current = null
    setDistAutoFill(false)
    clearTimeout(destinoTimer.current)
    destinoTimer.current = setTimeout(() => buscarSugestoes(value, setDestinoSuggs), 350)
  }

  async function selecionarLugar(sugg, campo, placeRef, setSuggs) {
    const pred = sugg.placePrediction
    const nome = pred.structuredFormat.mainText.text
    setForm(prev => ({ ...prev, [campo]: nome }))
    setSuggs([])
    const coords = await buscarCoordenadas(pred.placeId)
    if (!coords) return
    placeRef.current = coords
    calcularDistancia()
  }

  function calcularDistancia() {
    if (!origemPlace.current || !destinoPlace.current) return
    if (!window.google?.maps?.DistanceMatrixService) return
    setLoadingDist(true)
    const svc = new window.google.maps.DistanceMatrixService()
    svc.getDistanceMatrix(
      {
        origins:      [origemPlace.current],
        destinations: [destinoPlace.current],
        travelMode:   window.google.maps.TravelMode.DRIVING,
        unitSystem:   window.google.maps.UnitSystem.METRIC,
      },
      (res, status) => {
        setLoadingDist(false)
        if (status !== 'OK') { setMapsError('Distance Matrix: ' + status); return }
        const el = res.rows[0].elements[0]
        if (el.status !== 'OK') { setMapsError('Rota inválida: ' + el.status); return }
        setForm(prev => ({ ...prev, distanciaKm: (el.distance.value / 1000).toFixed(1) }))
        setDistAutoFill(true)
        setMapsError('')
      }
    )
  }

  const calc = useMemo(() => {
    const distanciaBase = parseFloat(form.distanciaKm) || 0
    const distancia     = voltarVazio ? distanciaBase * 2 : distanciaBase
    const consumo   = parseFloat(form.mediaConsumo)      || 0
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

    const prontoViagem   = distancia > 0 && consumo > 0 && diesel > 0 && capacidade > 0 && valorTon > 0
    const prontoProjecao = prontoViagem && viagens > 0

    // Piso mínimo ANTT: fórmula = (distância × CCD) + CC
    // Usa distanciaBase (trecho carregado). Retorno vazio = 0,92 × distância × CCD.
    const temDadosAntt = form.tipoCarga && eixos >= 2 && distanciaBase > 0
    const freteMinIda      = temDadosAntt ? calcularFreteMinimo(distanciaBase, eixos, form.tipoCarga) : 0
    const freteMinRetorno  = (temDadosAntt && voltarVazio) ? calcularRetornoVazio(distanciaBase, eixos, form.tipoCarga) : 0
    const freteMinimo      = freteMinIda + freteMinRetorno
    const freteMinimoPorTon = (freteMinimo > 0 && capacidade > 0) ? freteMinimo / capacidade : 0
    const abaixoDoMinimo = valorTon > 0 && freteMinimoPorTon > 0 && valorTon < freteMinimoPorTon

    return {
      gastoCombustivel, custoPedagio, faturamentoBruto, lucroLiquido,
      lucroSemanal, lucroDiario, lucroMensal, prontoViagem, prontoProjecao,
      distanciaEfetiva: distancia,
      freteMinimo, freteMinimoPorTon, abaixoDoMinimo,
    }
  }, [
    form.distanciaKm, form.mediaConsumo, form.valorDiesel,
    form.capacidadeCarga, form.valorPorTonelada, form.viagensPorSemana,
    form.quantidadeEixos, form.quantidadePedagios, form.valorMedioPorEixo,
    voltarVazio, form.tipoCarga,
  ])

  const lucroPositivo = calc.lucroMensal >= 0

  function SuggList({ suggs, onSelect }) {
    if (!suggs.length) return null
    return (
      <ul className="fc-sugg-list">
        {suggs.map(s => (
          <li key={s.placePrediction.placeId} onMouseDown={() => onSelect(s)}>
            <span className="fc-sugg-main">{s.placePrediction.structuredFormat.mainText.text}</span>
            <span className="fc-sugg-sub">{s.placePrediction.structuredFormat.secondaryText?.text}</span>
          </li>
        ))}
      </ul>
    )
  }

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
          <p>Dashboard de gestão logística e projeção financeira</p>
        </div>
        <div className="fc-header-badge">v2.0 · Gestão Logística</div>
      </header>

      <div className="fc-dashboard">
        <div className="fc-form-col">
          <form onSubmit={(e) => e.preventDefault()}>

            {mapsError && (
              <div className="fc-api-error">
                ⚠ {mapsError}
              </div>
            )}

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
                  <div className="fc-input-wrap fc-autocomplete-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <input
                      id="origem" name="origem" type="text"
                      placeholder="Ex: São Paulo, SP"
                      value={form.origem}
                      onChange={handleOrigemChange}
                      onBlur={() => setTimeout(() => setOrigemSuggs([]), 200)}
                      autoComplete="off"
                    />
                    <SuggList suggs={origemSuggs} onSelect={s => selecionarLugar(s, 'origem', origemPlace, setOrigemSuggs)} />
                  </div>
                </div>

                <div className="fc-field">
                  <label htmlFor="destino">Destino <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap fc-autocomplete-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" fill="currentColor" />
                    </svg>
                    <input
                      id="destino" name="destino" type="text"
                      placeholder="Ex: Rio de Janeiro, RJ"
                      value={form.destino}
                      onChange={handleDestinoChange}
                      onBlur={() => setTimeout(() => setDestinoSuggs([]), 200)}
                      autoComplete="off"
                    />
                    <SuggList suggs={destinoSuggs} onSelect={s => selecionarLugar(s, 'destino', destinoPlace, setDestinoSuggs)} />
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
                      id="distanciaKm" name="distanciaKm" type="number" inputMode="decimal"
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
                  <label className="fc-checkbox-label">
                    <input
                      type="checkbox"
                      checked={voltarVazio}
                      onChange={e => setVoltarVazio(e.target.checked)}
                    />
                    Voltar vazio
                    {voltarVazio && form.distanciaKm && (
                      <span className="fc-checkbox-hint">
                        {(parseFloat(form.distanciaKm) * 2).toFixed(1)} km total
                      </span>
                    )}
                  </label>
                </div>

                <div className="fc-field">
                  <label htmlFor="viagensPorSemana">Viagens por Semana <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <input id="viagensPorSemana" name="viagensPorSemana" type="number" inputMode="numeric" min="0" step="1" placeholder="0" value={form.viagensPorSemana} onChange={handleChange} />
                    <span className="fc-unit">viagens</span>
                  </div>
                </div>
              </div>
            </section>

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
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
                    <input id="mediaConsumo" name="mediaConsumo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={form.mediaConsumo} onChange={handleChange} />
                    <span className="fc-unit">km/l</span>
                  </div>
                </div>
                <div className="fc-field">
                  <label htmlFor="quantidadeEixos">Qtd. de Eixos <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" /><path d="M6 15V9l6-6 6 6v6" /></svg>
                    <input id="quantidadeEixos" name="quantidadeEixos" type="number" inputMode="numeric" min="0" step="1" placeholder="0" value={form.quantidadeEixos} onChange={handleChange} />
                    <span className="fc-unit">eixos</span>
                  </div>
                </div>
                <div className="fc-field">
                  <label htmlFor="capacidadeCarga">Capacidade de Carga <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                    <input id="capacidadeCarga" name="capacidadeCarga" type="number" inputMode="decimal" min="0" step="0.1" placeholder="0,0" value={form.capacidadeCarga} onChange={handleChange} />
                    <span className="fc-unit">ton</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="fc-section">
              <div className="fc-section-label">
                <span className="fc-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                Pedágios da Rota
                {calc.custoPedagio > 0 && (
                  <span className="fc-section-badge-cost">Custo total: {formatBRL(calc.custoPedagio)}</span>
                )}
              </div>
              <div className="fc-grid fc-grid-2">
                <div className="fc-field">
                  <label htmlFor="quantidadePedagios">Praças de Pedágio</label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    <input id="quantidadePedagios" name="quantidadePedagios" type="number" inputMode="numeric" min="0" step="1" placeholder="0" value={form.quantidadePedagios} onChange={handleChange} />
                    <span className="fc-unit">praças</span>
                  </div>
                </div>
                <div className="fc-field">
                  <label htmlFor="valorMedioPorEixo">Valor Médio por Eixo</label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    <span className="fc-prefix">R$</span>
                    <input id="valorMedioPorEixo" name="valorMedioPorEixo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={form.valorMedioPorEixo} onChange={handleChange} className="has-prefix" />
                    <span className="fc-unit">/ eixo</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="fc-section">
              <div className="fc-section-label">
                <span className="fc-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </span>
                Carga e Receita
              </div>
              <div className="fc-grid fc-grid-3">
                <div className="fc-field">
                  <label htmlFor="tipoCarga">Tipo de Carga <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                    <select
                      id="tipoCarga"
                      name="tipoCarga"
                      value={form.tipoCarga}
                      onChange={handleChange}
                      className={!form.tipoCarga ? 'fc-select-empty' : ''}
                    >
                      <option value="">Selecione o tipo...</option>
                      {TIPOS_CARGA.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <svg className="fc-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
                <div className="fc-field">
                  <label htmlFor="valorDiesel">Diesel S10 <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <span className="fc-prefix">R$</span>
                    <input id="valorDiesel" name="valorDiesel" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={form.valorDiesel} onChange={handleChange} className="has-prefix" />
                    <span className="fc-unit">/ litro</span>
                  </div>
                </div>
                <div className="fc-field">
                  <label htmlFor="valorPorTonelada">Valor por Tonelada <span className="fc-required">*</span></label>
                  <div className="fc-input-wrap">
                    <svg className="fc-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    <span className="fc-prefix">R$</span>
                    <input id="valorPorTonelada" name="valorPorTonelada" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={form.valorPorTonelada} onChange={handleChange} className="has-prefix" />
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

        <aside className="fc-panel-col">
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
              <p className="fc-proj-hint">Preencha todos os campos obrigatórios para ver as projeções</p>
            )}
          </div>

          <div className="fc-breakdown-card">
            <div className="fc-breakdown-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Resultado por Viagem
            </div>
            <div className="fc-breakdown-list">
              <div className="fc-breakdown-row">
                <div className="fc-breakdown-label"><span className="fc-dot fc-dot--revenue" />Faturamento Bruto</div>
                <span className="fc-breakdown-value">{calc.prontoViagem ? formatBRL(calc.faturamentoBruto) : DASH}</span>
              </div>
              <div className="fc-breakdown-row">
                <div className="fc-breakdown-label"><span className="fc-dot fc-dot--fuel" />− Combustível</div>
                <span className="fc-breakdown-value fc-breakdown-value--cost">{calc.prontoViagem ? formatBRL(calc.gastoCombustivel) : DASH}</span>
              </div>
              <div className="fc-breakdown-row">
                <div className="fc-breakdown-label"><span className="fc-dot fc-dot--toll" />− Pedágio</div>
                <span className="fc-breakdown-value fc-breakdown-value--cost">{calc.prontoViagem ? formatBRL(calc.custoPedagio) : DASH}</span>
              </div>
              <div className="fc-breakdown-sep" />
              <div className="fc-breakdown-row fc-breakdown-row--total">
                <div className="fc-breakdown-label">
                  <span className={`fc-dot ${calc.prontoViagem && calc.lucroLiquido < 0 ? 'fc-dot--negative' : 'fc-dot--profit'}`} />
                  = Lucro Líquido
                </div>
                <span className={`fc-breakdown-value fc-breakdown-value--total ${calc.prontoViagem ? (calc.lucroLiquido >= 0 ? 'fc-breakdown-value--profit' : 'fc-breakdown-value--negative') : ''}`}>
                  {calc.prontoViagem ? formatBRL(calc.lucroLiquido) : DASH}
                </span>
              </div>
            </div>
            {calc.prontoViagem && <div className="fc-breakdown-footer">Faturamento − Combustível − Pedágio</div>}

            {calc.freteMinimo > 0 && (
              <div className="fc-antt-section">
                <div className="fc-antt-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Piso Mínimo ANTT
                </div>
                <div className="fc-antt-row">
                  <span>Por viagem</span>
                  <span className="fc-antt-value">{formatBRL(calc.freteMinimo)}</span>
                </div>
                {calc.freteMinimoPorTon > 0 && (
                  <div className="fc-antt-row">
                    <span>Por tonelada</span>
                    <span className="fc-antt-value">{formatBRL(calc.freteMinimoPorTon)}/ton</span>
                  </div>
                )}
                <div className={`fc-antt-badge ${calc.abaixoDoMinimo ? 'fc-antt-badge--warn' : calc.prontoViagem ? 'fc-antt-badge--ok' : ''}`}>
                  {calc.abaixoDoMinimo
                    ? '⚠ Abaixo do Mínimo Legal'
                    : calc.prontoViagem
                      ? '✓ Dentro do Mínimo Legal'
                      : 'Informe o valor/ton para comparar'}
                </div>
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
