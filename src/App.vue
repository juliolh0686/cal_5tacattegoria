<script setup>
import { computed, reactive, watch } from 'vue'
import {
  MESES,
  UIT_POR_ANIO,
  calcularQuinta,
  mesesVacios,
  round2,
  toNumber,
} from './lib/quinta.js'

const STORAGE_KEY = 'quinta-categoria-2026'

function estadoInicial() {
  return {
    trabajador: '',
    documento: '',
    ejercicio: 2026,
    uit: UIT_POR_ANIO[2026],
    mesCalculo: new Date().getMonth() + 1,
    sueldoBase: 0,
    meses: mesesVacios(),
  }
}

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return estadoInicial()
    const data = JSON.parse(raw)
    const base = estadoInicial()
    return {
      ...base,
      ...data,
      meses: MESES.map((m, i) => ({
        ...base.meses[i],
        ...(data.meses?.[i] ?? {}),
        id: m.id,
      })),
    }
  } catch {
    return estadoInicial()
  }
}

const form = reactive(cargar())

watch(
  form,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

watch(
  () => form.ejercicio,
  (anio) => {
    if (UIT_POR_ANIO[anio]) form.uit = UIT_POR_ANIO[anio]
  },
)

const resultado = computed(() =>
  calcularQuinta({
    meses: form.meses,
    uit: form.uit,
  }),
)

const retencionSeleccionada = computed(
  () => resultado.value.retenciones[form.mesCalculo - 1],
)

const resumenIngresos = computed(() =>
  form.meses.reduce(
    (totales, mes) => {
      totales.ordinario += toNumber(mes.ordinario)
      totales.variable += toNumber(mes.variable)
      totales.gratificacionBase += toNumber(mes.gratificacion)
      totales.extraordinario += toNumber(mes.extraordinario)
      return totales
    },
    { ordinario: 0, variable: 0, gratificacionBase: 0, extraordinario: 0 },
  ),
)

const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
})

function soles(value) {
  return money.format(round2(value))
}

function pct(value) {
  return `${round2(value)} %`
}

function aplicarSueldo() {
  const monto = toNumber(form.sueldoBase)
  form.meses.forEach((mes) => {
    mes.ordinario = monto
  })
  form.meses[6].gratificacion = monto
  form.meses[11].gratificacion = monto
}

function limpiar() {
  const nuevo = estadoInicial()
  Object.assign(form, nuevo)
  form.meses = mesesVacios()
}

function ejemplo() {
  form.trabajador = 'Ana Torres Ríos'
  form.documento = '45678912'
  form.ejercicio = 2026
  form.uit = 5500
  form.sueldoBase = 4500
  form.meses = mesesVacios()
  form.meses.forEach((mes) => {
    mes.ordinario = 4500
  })
  form.meses[6].gratificacion = 4500
  form.meses[11].gratificacion = 4500
  form.meses[2].variable = 350
  form.meses[3].extraordinario = 2800
  const pagosEjemplo = [
    163.33, 163.33, 189.17, 396.57, 163.57, 163.58, 163.58, 163.57, 163.57, 163.58,
    163.58, 0,
  ]
  form.meses.forEach((mes, i) => {
    mes.pagoACuenta = pagosEjemplo[i]
  })
}

function imprimirResumen() {
  window.print()
}

function normalizarNombre() {
  form.trabajador = String(form.trabajador ?? '').toLocaleUpperCase('es-PE')
}

function bonificacionGratificacion(mes) {
  return round2(Math.max(0, toNumber(mes.gratificacion)) * 0.09)
}

function actualizarGratificacionTotal(mes, totalIngresado) {
  mes.gratificacion = round2(Math.max(0, toNumber(totalIngresado)) / 1.09)
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div class="hero-top">
        <div>
          <p class="eyebrow">Perú · Impuesto a la renta · Ejercicio {{ form.ejercicio }}</p>
          <h1>Cálculo de Renta de Quinta Categoría</h1>
        </div>
        <button type="button" class="primary print-button" @click="imprimirResumen">
          Imprimir resumen / Guardar PDF
        </button>
      </div>
      <p class="lead">
        Ingresa las remuneraciones de cada mes. El sistema proyecta la renta anual,
        aplica la deducción de 7 UIT, calcula el impuesto y resta los pagos a
        cuenta declarados cada mes.
      </p>
    </header>

    <section class="print-summary">
      <p class="eyebrow">Resumen de cálculo · Ejercicio {{ form.ejercicio }}</p>
      <h1>Cálculo de Renta de Quinta Categoría</h1>
      <div class="print-meta">
        <span><b>Trabajador:</b> {{ form.trabajador || 'No especificado' }}</span>
        <span><b>DNI / CE:</b> {{ form.documento || 'No especificado' }}</span>
        <span><b>Mes del cálculo:</b> {{ retencionSeleccionada.nombre }}</span>
      </div>
      <div class="print-highlight">
        <span>Descuento de quinta categoría · {{ retencionSeleccionada.nombre }}</span>
        <strong>{{ soles(retencionSeleccionada.retencionMes) }}</strong>
      </div>
      <div class="print-kpis">
        <div><span>Renta bruta anual</span><b>{{ soles(resultado.rentaBruta) }}</b></div>
        <div><span>Deducción fija (7 UIT)</span><b>{{ soles(resultado.deduccionFija) }}</b></div>
        <div><span>Renta neta del trabajo</span><b>{{ soles(resultado.rentaNeta) }}</b></div>
        <div><span>Impuesto anual</span><b>{{ soles(resultado.impuestoAnual) }}</b></div>
        <div><span>Pagos a cuenta ingresados</span><b>{{ soles(resultado.totalPagosACuenta) }}</b></div>
        <div>
          <span>{{ resultado.saldoFinal > 0 ? 'Saldo por pagar' : resultado.saldoFinal < 0 ? 'Saldo a favor' : 'Saldo final' }}</span>
          <b>{{ soles(Math.abs(resultado.saldoFinal)) }}</b>
        </div>
      </div>
      <h2 class="print-section-title">Composición de la renta bruta</h2>
      <div class="print-income-breakdown">
        <div><span>Remuneración ordinaria</span><b>{{ soles(resumenIngresos.ordinario) }}</b></div>
        <div><span>Ingresos variables</span><b>{{ soles(resumenIngresos.variable) }}</b></div>
        <div><span>Gratificaciones + 9%</span><b>{{ soles(resumenIngresos.gratificacionBase * 1.09) }}</b></div>
        <div><span>Extraordinarios</span><b>{{ soles(resumenIngresos.extraordinario) }}</b></div>
      </div>
      <div class="print-details-grid">
        <section>
          <h2 class="print-section-title">Retenciones e ingresos por mes</h2>
          <table class="print-table">
            <thead>
              <tr><th>Mes</th><th>Ingreso bruto</th><th>Retención calculada</th><th>Pago a cuenta</th></tr>
            </thead>
            <tbody>
              <tr v-for="fila in resultado.retenciones" :key="`pdf-${fila.mesId}`">
                <td>{{ fila.nombre }}</td>
                <td>{{ soles(fila.totalMes) }}</td>
                <td>{{ soles(fila.retencionMes) }}</td>
                <td>{{ soles(fila.pagoACuenta) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><th>Total</th><th>{{ soles(resultado.rentaBruta) }}</th><th>{{ soles(resultado.totalRetenido) }}</th><th>{{ soles(resultado.totalPagosACuenta) }}</th></tr>
            </tfoot>
          </table>
        </section>
        <section>
          <h2 class="print-section-title">Impuesto por tramos</h2>
          <table class="print-table">
            <thead><tr><th>Tramo</th><th>Tasa</th><th>Base</th><th>Impuesto</th></tr></thead>
            <tbody>
              <tr v-for="tramo in resultado.detalleTramos" :key="`pdf-${tramo.etiqueta}`">
                <td>{{ tramo.etiqueta }}</td><td>{{ pct(tramo.tasa * 100) }}</td>
                <td>{{ soles(tramo.base) }}</td><td>{{ soles(tramo.impuesto) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
      <p class="print-note">Estimación referencial basada en los datos ingresados. La retención definitiva la determina el empleador conforme a la normativa vigente.</p>
      <p class="author-credit">Autor: Julio Loarte Huerto</p>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Datos del trabajador</h2>
        <div class="actions">
          <button type="button" class="ghost" @click="ejemplo">Cargar ejemplo</button>
          <button type="button" class="ghost" @click="limpiar">Limpiar</button>
        </div>
      </div>

      <div class="grid-4">
        <label>
          Nombre
          <input
            v-model="form.trabajador"
            type="text"
            placeholder="Apellidos y nombres"
            style="text-transform: uppercase"
            @input="normalizarNombre"
          />
        </label>
        <label>
          DNI / CE
          <input v-model="form.documento" type="text" placeholder="Documento" />
        </label>
        <label>
          Ejercicio
          <select v-model.number="form.ejercicio">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
            <option :value="2024">2024</option>
          </select>
        </label>
        <label>
          UIT (S/)
          <input v-model.number="form.uit" type="number" min="0" step="50" />
        </label>
        <label>
          Mes del cálculo
          <select v-model.number="form.mesCalculo">
            <option v-for="mes in MESES" :key="mes.id" :value="mes.id">{{ mes.nombre }}</option>
          </select>
        </label>
      </div>

      <div class="grid-2 fill-row">
        <label>
          Remuneración ordinaria mensual
          <input v-model.number="form.sueldoBase" type="number" min="0" step="50" />
        </label>
        <div class="inline-actions">
          <button type="button" class="primary" @click="aplicarSueldo">
            Copiar a los 12 meses
          </button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head panel-head-remuneraciones">
        <h2>Remuneraciones del ejercicio</h2>
        <p class="hint">
          Ordinario: sueldo, asignación familiar y conceptos fijos. Ocasional: horas extra,
          comisiones. Gratificación: Fiestas Patrias y Navidad más bonificación extraordinaria
          del 9%. Extraordinario: utilidades
          y bonos. Pago a cuenta: retención de quinta declarada en el mes (PLAME). La CTS
          no se incluye.
        </p>
      </div>

      <div class="table-wrap">
        <table class="payroll-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Ordinario</th>
              <th>Ocasional</th>
              <th>Gratificación total (incluye 9%)</th>
              <th>Extraordinario</th>
              <th>Pago a cuenta</th>
              <th>Total mes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mes in form.meses" :key="mes.id">
              <th>{{ MESES[mes.id - 1].nombre }}</th>
              <td data-label="Ordinario">
                <input v-model.number="mes.ordinario" type="number" min="0" step="0.01" />
              </td>
              <td data-label="Ocasional">
                <input v-model.number="mes.variable" type="number" min="0" step="0.01" />
              </td>
              <td data-label="Gratificación (incluye 9%)">
                <template v-if="mes.id === 7 || mes.id === 12">
                  <input
                    :value="round2(toNumber(mes.gratificacion) + bonificacionGratificacion(mes))"
                    @change="actualizarGratificacionTotal(mes, $event.target.value)"
                    type="number"
                    min="0"
                    step="0.01"
                    aria-label="Gratificación total con bonificación del 9%"
                  />
                </template>
                <input v-else :value="0" type="number" disabled aria-label="Sin gratificación este mes" />
              </td>
              <td data-label="Extraordinario">
                <input v-model.number="mes.extraordinario" type="number" min="0" step="0.01" />
              </td>
              <td data-label="Pago a cuenta">
                <input v-model.number="mes.pagoACuenta" type="number" min="0" step="0.01" />
              </td>
              <td class="num" data-label="Total del mes">{{ soles(resultado.retenciones[mes.id - 1].totalMes) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th>Total anual</th>
              <td colspan="4"></td>
              <td class="num">{{ soles(resultado.totalPagosACuenta) }}</td>
              <td class="num">{{ soles(resultado.rentaBruta) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <section class="kpi-grid">
      <article>
        <span>Renta bruta anual</span>
        <strong>{{ soles(resultado.rentaBruta) }}</strong>
      </article>
      <article>
        <span>Deducción fija (7 UIT)</span>
        <strong>{{ soles(resultado.deduccionTotal) }}</strong>
      </article>
      <article>
        <span>Renta neta del trabajo</span>
        <strong>{{ soles(resultado.rentaNeta) }}</strong>
      </article>
      <article>
        <span>Impuesto anual</span>
        <strong>{{ soles(resultado.impuestoAnual) }}</strong>
      </article>
    </section>

    <section class="saldo-grid">
      <article>
        <span>Impuesto anual determinado</span>
        <strong>{{ soles(resultado.impuestoAnual) }}</strong>
      </article>
      <article>
        <span>(−) Pagos a cuenta declarados</span>
        <strong>{{ soles(resultado.totalPagosACuenta) }}</strong>
      </article>
      <article class="accent" :class="{ favor: resultado.saldoFinal < 0 }">
        <span>{{ resultado.saldoFinal > 0 ? 'Saldo por pagar' : resultado.saldoFinal < 0 ? 'Saldo a favor' : 'Saldo' }}</span>
        <strong>{{ soles(Math.abs(resultado.saldoFinal)) }}</strong>
      </article>
    </section>

    <section class="selected-retention" aria-live="polite">
      <div>
        <span>Descuento de quinta categoría para {{ retencionSeleccionada.nombre }}</span>
        <small>Saldo del impuesto anual proyectado, repartido entre este mes y los meses restantes del año.</small>
      </div>
      <strong>{{ soles(retencionSeleccionada.retencionMes) }}</strong>
    </section>

    <div class="split">
      <section class="panel">
        <h2>Tramos del impuesto</h2>
        <p class="hint">
          Tasa efectiva sobre renta bruta: {{ pct(resultado.tasaEfectiva) }}
          · Total del impuesto: {{ soles(resultado.impuestoAnual) }}
        </p>
        <div class="table-wrap">
        <table class="compact">
          <thead>
            <tr>
              <th>Tramo</th>
              <th>Tasa</th>
              <th>Base</th>
              <th>Impuesto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tramo in resultado.detalleTramos" :key="tramo.etiqueta">
              <td>{{ tramo.etiqueta }}</td>
              <td>{{ pct(tramo.tasa * 100) }}</td>
              <td class="num">{{ soles(tramo.base) }}</td>
              <td class="num">{{ soles(tramo.impuesto) }}</td>
            </tr>
          </tbody>
        </table>
        </div>
        <p class="legal">
          UIT {{ form.ejercicio }}: {{ soles(form.uit) }}. Deducción fija 7 UIT =
          {{ soles(resultado.deduccionFija) }}. Referencia: art. 53° LIR y procedimiento de
          retención de quinta categoría SUNAT.
        </p>
      </section>

      <section class="panel">
        <h2>Retención mensual proyectada</h2>
        <div class="table-wrap">
        <table class="compact">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Impuesto anual proyectado</th>
              <th>Ordinaria</th>
              <th>Adicional</th>
              <th>Retención</th>
              <th>Pago a cuenta</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in resultado.retenciones" :key="fila.mesId">
              <td>{{ fila.nombre }}</td>
              <td class="num">{{ soles(fila.impuestoProyectado) }}</td>
              <td class="num">{{ soles(fila.retencionOrdinaria) }}</td>
              <td class="num">{{ soles(fila.retencionAdicional) }}</td>
              <td class="num">{{ soles(fila.retencionMes) }}</td>
              <td class="num strong">{{ soles(fila.pagoACuenta) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th colspan="5">Total de pagos a cuenta registrados</th>
              <td class="num">{{ soles(resultado.totalPagosACuenta) }}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      </section>
    </div>

  </div>
  <footer class="app-footer">
    <span class="footer-brand">Cálculo de Renta de Quinta Categoría</span>
    <span class="footer-author"><span>Desarrollado por</span><strong>Julio Loarte Huerto</strong></span>
  </footer>
</template>
