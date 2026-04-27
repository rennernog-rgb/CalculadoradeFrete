// Piso mínimo do frete rodoviário — Resolução ANTT 5.867/2020
// Fórmula: frete_mínimo = (distância_km × CCD) + CC
// Retorno vazio (quando aplicável): + 0,92 × distância_km × CCD
//
// ✅ VERIFICADO via calculadora oficial (calculadorafrete.antt.gov.br):
//   PORT.SUROC 04/2026 — 9 eixos / Granel Sólido: CCD=9,2662 CC=877,83
//
// ⚠️  Os demais valores abaixo estão desatualizados (base Res. 5.867/2020).
//     Atualize cada linha testando na calculadora oficial da ANTT:
//     https://calculadorafrete.antt.gov.br/
//     Selecione: Tabela A | composição veicular = Sim | alto desempenho = Não

export const TIPOS_CARGA = [
  { value: 'carga_geral',    label: 'Carga Geral' },
  { value: 'granel_solido',  label: 'Granel Sólido' },
  { value: 'granel_liquido', label: 'Granel Líquido' },
  { value: 'frigorificada',  label: 'Frigorificada / Refrigerada' },
  { value: 'neogranel',      label: 'Neogranel' },
  { value: 'conteiner',      label: 'Conteinerizada' },
]

// { [eixos]: { [tipoCarga]: { ccd: R$/km, cc: R$ fixo } } }
const TABELA_ANTT = {
  2: {
    carga_geral:    { ccd: 2.3198, cc:  82.64 },
    granel_solido:  { ccd: 2.1965, cc:  76.42 },
    granel_liquido: { ccd: 2.6677, cc:  94.53 },
    frigorificada:  { ccd: 3.0157, cc: 107.43 },
    neogranel:      { ccd: 2.3198, cc:  82.64 },
    conteiner:      { ccd: 2.3198, cc:  82.64 },
  },
  3: {
    carga_geral:    { ccd: 3.1718, cc: 111.02 },
    granel_solido:  { ccd: 3.0047, cc: 102.37 },
    granel_liquido: { ccd: 3.6475, cc: 127.67 },
    frigorificada:  { ccd: 4.1233, cc: 144.33 },
    neogranel:      { ccd: 3.1718, cc: 111.02 },
    conteiner:      { ccd: 3.3304, cc: 116.57 },
  },
  4: {
    carga_geral:    { ccd: 3.7935, cc: 132.03 },
    granel_solido:  { ccd: 3.5906, cc: 121.37 },
    granel_liquido: { ccd: 4.3625, cc: 151.83 },
    frigorificada:  { ccd: 4.9316, cc: 171.64 },
    neogranel:      { ccd: 3.7935, cc: 132.03 },
    conteiner:      { ccd: 3.9832, cc: 138.63 },
  },
  5: {
    carga_geral:    { ccd: 4.7957, cc: 164.49 },
    granel_solido:  { ccd: 4.5403, cc: 151.15 },
    granel_liquido: { ccd: 5.5151, cc: 189.16 },
    frigorificada:  { ccd: 6.2344, cc: 213.84 },
    neogranel:      { ccd: 4.7957, cc: 164.49 },
    conteiner:      { ccd: 5.0355, cc: 172.71 },
  },
  6: {
    carga_geral:    { ccd: 5.7618, cc: 197.94 },
    granel_solido:  { ccd: 5.4552, cc: 179.93 },
    granel_liquido: { ccd: 6.6261, cc: 227.63 },
    frigorificada:  { ccd: 7.4903, cc: 257.32 },
    neogranel:      { ccd: 5.7618, cc: 197.94 },
    conteiner:      { ccd: 6.0499, cc: 207.84 },
  },
  7: {
    carga_geral:    { ccd: 6.1276, cc: 209.50 },
    granel_solido:  { ccd: 5.8023, cc: 190.75 },
    granel_liquido: { ccd: 7.0467, cc: 240.92 },
    frigorificada:  { ccd: 7.9659, cc: 272.35 },
    neogranel:      { ccd: 6.1276, cc: 209.50 },
    conteiner:      { ccd: 6.4340, cc: 219.98 },
  },
  9: {
    // ✅ PORT.SUROC 04/2026 — valores verificados
    granel_solido:  { ccd: 9.2662, cc: 877.83 },
    // ⚠️ Restantes precisam ser verificados na calculadora oficial
    carga_geral:    { ccd: 9.7792, cc: 925.77 },
    granel_liquido: { ccd: 10.648, cc: 1008.5 },
    frigorificada:  { ccd: 12.034, cc: 1139.2 },
    neogranel:      { ccd: 9.7792, cc: 925.77 },
    conteiner:      { ccd: 10.268, cc: 972.16 },
  },
}

/**
 * Retorna o frete mínimo ANTT em R$ para o trecho carregado.
 * Para veículos com eixos fora do range 2–9, usa o extremo mais próximo.
 */
export function calcularFreteMinimo(distanciaKm, numEixos, tipoCarga) {
  const eixoValidos = [2, 3, 4, 5, 6, 7, 9]
  const eixos = eixoValidos.reduce((prev, cur) =>
    Math.abs(cur - numEixos) < Math.abs(prev - numEixos) ? cur : prev
  )
  const rates = TABELA_ANTT[eixos]
  if (!rates || !tipoCarga || !rates[tipoCarga]) return 0
  const { ccd, cc } = rates[tipoCarga]
  return (distanciaKm * ccd) + cc
}

/**
 * Retorna o adicional de retorno vazio conforme fórmula ANTT:
 * 0,92 × distância × CCD  (sem o componente fixo CC)
 */
export function calcularRetornoVazio(distanciaKm, numEixos, tipoCarga) {
  const eixoValidos = [2, 3, 4, 5, 6, 7, 9]
  const eixos = eixoValidos.reduce((prev, cur) =>
    Math.abs(cur - numEixos) < Math.abs(prev - numEixos) ? cur : prev
  )
  const rates = TABELA_ANTT[eixos]
  if (!rates || !tipoCarga || !rates[tipoCarga]) return 0
  return 0.92 * distanciaKm * rates[tipoCarga].ccd
}
