#!/usr/bin/env node
/**
 * Busca os coeficientes CCD e CC atuais da calculadora oficial da ANTT
 * e atualiza automaticamente src/data/tabelaMinima.js.
 *
 * Uso:  node scripts/fetch-antt-tabela.js
 *
 * Requer: npx playwright install chromium
 */

import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ANTT_URL   = 'https://calculadorafrete.antt.gov.br/'
const DISTANCIA  = '500' // distância fixa usada para forçar o cálculo; CCD/CC não dependem dela

// Mapeamento entre nossa chave interna e o label do select da ANTT
const TIPOS_CARGA = [
  { key: 'carga_geral',    label: 'Carga Geral' },
  { key: 'granel_solido',  label: 'Granel Sólido' },
  { key: 'granel_liquido', label: 'Granel Líquido' },
  { key: 'frigorificada',  label: 'Frigorificada' },
  { key: 'neogranel',      label: 'Neogranel' },
  { key: 'conteiner',      label: 'Conteinerizada' },
]

const EIXOS = [2, 3, 4, 5, 6, 7, 9]

// ─── helpers ────────────────────────────────────────────────────────────────

function parseBR(str) {
  // "9,2662" → 9.2662
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.'))
}

async function setToggle(page, labelText, wantSim) {
  // Botões SIM/NÃO da calculadora ANTT
  const label = page.getByText(labelText, { exact: false })
  const container = label.locator('xpath=ancestor::*[.//button][1]').first()
  const btn = wantSim
    ? container.getByRole('button', { name: /sim/i })
    : container.getByRole('button', { name: /não/i })
  if (await btn.count()) await btn.click()
}

async function extrairCcdCc(page) {
  // Tenta extrair CCD e CC diretamente dos textos do resultado
  const texto = await page.locator('body').innerText()

  const ccdMatch = texto.match(/CCD\D{0,20}([\d]{1,3}[,.][\d]{3,4})/i)
  const ccMatch  = texto.match(/\bCC\b\D{0,20}([\d]{1,3}[,.][\d]{2,3})/i)

  if (!ccdMatch || !ccMatch) return null
  return {
    ccd: parseBR(ccdMatch[1]),
    cc:  parseBR(ccMatch[1]),
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Iniciando Playwright...')
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()

  console.log(`Abrindo ${ANTT_URL}`)
  await page.goto(ANTT_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForTimeout(1500)

  const tabela   = {}
  const erros    = []
  const snapshot = new Date().toISOString().split('T')[0]

  for (const eixos of EIXOS) {
    tabela[eixos] = {}
    console.log(`\n── ${eixos} eixos ──`)

    for (const tipo of TIPOS_CARGA) {
      try {
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(800)

        // 1. Tipo de carga
        const selectCarga = page.locator('select').filter({ hasText: /carga|granel|frio|neogranel|conteiner/i }).first()
        await selectCarga.selectOption({ label: tipo.label })

        // 2. Número de eixos
        const inputEixos = page.getByLabel(/eixo/i).first()
        await inputEixos.fill(String(eixos))

        // 3. Distância
        const inputDist = page.getByLabel(/distância|distancia/i).first()
        await inputDist.fill(DISTANCIA)

        // 4. Composição veicular = Sim
        await setToggle(page, 'composição veicular', true)

        // 5. Alto desempenho = Não
        await setToggle(page, 'alto desempenho', false)

        // 6. Retorno vazio = Não (vamos calcular só a ida)
        await setToggle(page, 'retorno vazio', false)

        // 7. Calcular
        const btnCalc = page.getByRole('button', { name: /calcular/i })
        await btnCalc.click()
        await page.waitForTimeout(1000)

        // 8. Extrair CCD e CC
        const coefs = await extrairCcdCc(page)
        if (coefs) {
          tabela[eixos][tipo.key] = coefs
          console.log(`  ✓ ${tipo.key}: CCD=${coefs.ccd} CC=${coefs.cc}`)
        } else {
          console.warn(`  ✗ ${tipo.key}: coeficientes não encontrados na página`)
          erros.push(`${eixos} eixos / ${tipo.key}`)
        }
      } catch (err) {
        console.error(`  ✗ ${tipo.key}: ${err.message}`)
        erros.push(`${eixos} eixos / ${tipo.key}`)
      }
    }
  }

  await browser.close()

  if (erros.length) {
    console.warn('\n⚠️  Combinações não obtidas:', erros.join(', '))
    if (erros.length === EIXOS.length * TIPOS_CARGA.length) {
      console.error('Nenhum valor obtido — seletores da calculadora ANTT precisam ser revisados.')
      process.exit(1)
    }
  }

  // Grava o arquivo atualizado
  const outputPath = join(__dirname, '..', 'src', 'data', 'tabelaMinima.js')
  writeFileSync(outputPath, gerarArquivo(tabela, snapshot), 'utf8')
  console.log(`\n✅  ${outputPath} atualizado em ${snapshot}`)
}

// ─── gerador do arquivo JS ───────────────────────────────────────────────────

function gerarArquivo(tabela, snapshot) {
  const linhas = Object.entries(tabela).map(([eixos, tipos]) => {
    const tipoLinhas = Object.entries(tipos).map(([key, { ccd, cc }]) =>
      `    ${key.padEnd(14)}: { ccd: ${ccd}, cc: ${cc} },`
    ).join('\n')
    return `  ${eixos}: {\n${tipoLinhas}\n  },`
  }).join('\n')

  return `// Piso mínimo do frete rodoviário — Resolução ANTT 5.867/2020
// Fórmula: frete_mínimo = (distância_km × CCD) + CC
// Retorno vazio (quando aplicável): + 0,92 × distância_km × CCD
//
// Gerado automaticamente por scripts/fetch-antt-tabela.js
// Última atualização: ${snapshot}
// Fonte: https://calculadorafrete.antt.gov.br/

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
${linhas}
}

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

export function calcularRetornoVazio(distanciaKm, numEixos, tipoCarga) {
  const eixoValidos = [2, 3, 4, 5, 6, 7, 9]
  const eixos = eixoValidos.reduce((prev, cur) =>
    Math.abs(cur - numEixos) < Math.abs(prev - numEixos) ? cur : prev
  )
  const rates = TABELA_ANTT[eixos]
  if (!rates || !tipoCarga || !rates[tipoCarga]) return 0
  return 0.92 * distanciaKm * rates[tipoCarga].ccd
}
`
}

main().catch(err => { console.error(err); process.exit(1) })
