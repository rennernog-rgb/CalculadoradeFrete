// Piso mínimo do frete rodoviário — ANTT Resolução 5.820/2019
// Dados públicos e gratuitos. Verifique periodicamente em antt.gov.br.
// Valores: R$/km por eixo × tipo de carga.

export const TIPOS_CARGA = [
  { value: 'carga_geral',    label: 'Carga Geral' },
  { value: 'granel_solido',  label: 'Granel Sólido' },
  { value: 'granel_liquido', label: 'Granel Líquido' },
  { value: 'frigorificada',  label: 'Frigorificada / Refrigerada' },
  { value: 'neogranel',      label: 'Neogranel' },
  { value: 'conteiner',      label: 'Conteinerizada' },
]

// { [eixos]: { [tipoCarga]: R$/km } }
const TABELA_ANTT = {
  2: { carga_geral: 1.4039, granel_solido: 1.3447, granel_liquido: 1.5440, frigorificada: 1.7110, neogranel: 1.4039, conteiner: 1.4039 },
  3: { carga_geral: 1.8640, granel_solido: 1.6776, granel_liquido: 2.1000, frigorificada: 2.4470, neogranel: 1.8640, conteiner: 2.0100 },
  4: { carga_geral: 2.1730, granel_solido: 1.9557, granel_liquido: 2.4980, frigorificada: 2.8550, neogranel: 2.1730, conteiner: 2.3400 },
  5: { carga_geral: 2.6100, granel_solido: 2.2500, granel_liquido: 3.0760, frigorificada: 3.4720, neogranel: 2.6100, conteiner: 2.8100 },
  6: { carga_geral: 3.3190, granel_solido: 2.8170, granel_liquido: 3.8340, frigorificada: 4.3750, neogranel: 3.3190, conteiner: 3.5760 },
  7: { carga_geral: 3.4540, granel_solido: 2.9300, granel_liquido: 3.9880, frigorificada: 4.5510, neogranel: 3.4540, conteiner: 3.7220 },
}

// Retorna o frete mínimo total em R$ para a viagem.
// Eixos fora de 2–7 são fixados no extremo mais próximo.
export function calcularFreteMinimo(distanciaKm, numEixos, tipoCarga) {
  const eixos = Math.min(Math.max(Math.round(numEixos), 2), 7)
  const rates = TABELA_ANTT[eixos]
  if (!rates || !tipoCarga || !rates[tipoCarga]) return 0
  return distanciaKm * rates[tipoCarga]
}
