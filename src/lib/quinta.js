/** Motor de cálculo de renta de quinta categoría (Perú). */

export const MESES = [
  { id: 1, nombre: 'Enero', corto: 'Ene' },
  { id: 2, nombre: 'Febrero', corto: 'Feb' },
  { id: 3, nombre: 'Marzo', corto: 'Mar' },
  { id: 4, nombre: 'Abril', corto: 'Abr' },
  { id: 5, nombre: 'Mayo', corto: 'May' },
  { id: 6, nombre: 'Junio', corto: 'Jun' },
  { id: 7, nombre: 'Julio', corto: 'Jul' },
  { id: 8, nombre: 'Agosto', corto: 'Ago' },
  { id: 9, nombre: 'Setiembre', corto: 'Set' },
  { id: 10, nombre: 'Octubre', corto: 'Oct' },
  { id: 11, nombre: 'Noviembre', corto: 'Nov' },
  { id: 12, nombre: 'Diciembre', corto: 'Dic' },
]

export const UIT_POR_ANIO = {
  2024: 5150,
  2025: 5350,
  2026: 5500,
}

/** Tramos del art. 53° de la Ley del Impuesto a la Renta. */
export const TRAMOS = [
  { hastaUit: 5, tasa: 0.08, etiqueta: 'Hasta 5 UIT' },
  { hastaUit: 20, tasa: 0.14, etiqueta: 'Más de 5 UIT hasta 20 UIT' },
  { hastaUit: 35, tasa: 0.17, etiqueta: 'Más de 20 UIT hasta 35 UIT' },
  { hastaUit: 45, tasa: 0.2, etiqueta: 'Más de 35 UIT hasta 45 UIT' },
  { hastaUit: Infinity, tasa: 0.3, etiqueta: 'Más de 45 UIT' },
]

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function mesVacio(id) {
  return {
    id,
    ordinario: 0,
    variable: 0,
    gratificacion: 0,
    extraordinario: 0,
    pagoACuenta: 0,
  }
}

export function mesesVacios() {
  return MESES.map((m) => mesVacio(m.id))
}

export function totalMes(mes) {
  return round2(
    toNumber(mes.ordinario) +
      toNumber(mes.variable) +
      round2(toNumber(mes.gratificacion) * 1.09) +
      toNumber(mes.extraordinario),
  )
}

export function rentaBrutaAnual(meses) {
  return round2(meses.reduce((acc, mes) => acc + totalMes(mes), 0))
}

export function aplicarImpuesto(rentaNeta, uit) {
  const neta = Math.max(0, round2(rentaNeta))
  const detalle = []
  let restante = neta
  let desdeUit = 0
  let impuesto = 0

  for (const tramo of TRAMOS) {
    const ancho = (tramo.hastaUit - desdeUit) * uit
    const base = Math.min(restante, ancho)
    const monto = round2(base * tramo.tasa)
    detalle.push({
      etiqueta: tramo.etiqueta,
      tasa: tramo.tasa,
      desde: round2(desdeUit * uit),
      hasta: tramo.hastaUit === Infinity ? null : round2(tramo.hastaUit * uit),
      base: round2(base),
      impuesto: monto,
    })
    impuesto = round2(impuesto + monto)
    restante = round2(restante - base)
    desdeUit = tramo.hastaUit
    if (restante <= 0) break
  }

  return { impuesto, detalle }
}

function gratificacionEsperada(mes, sueldoProyeccion) {
  const ingresada = toNumber(mes?.gratificacion)
  if (ingresada > 0) return round2(ingresada * 1.09)
  return round2(toNumber(sueldoProyeccion) * 1.09)
}

/**
 * Proyección de renta bruta anual al mes de retención, según el procedimiento
 * de SUNAT (remuneración del mes × meses restantes + gratificaciones ordinarias
 * pendientes + importes de meses anteriores).
 */
export function proyectarRentaBruta(meses, mesId) {
  const idx = mesId - 1
  const actual = meses[idx]
  const ordinarioActual = toNumber(actual.ordinario) + toNumber(actual.variable)
  const mesesRestantes = 13 - mesId

  const anteriores = meses.slice(0, idx).reduce((acc, mes) => acc + totalMes(mes), 0)

  let proyectada = round2(anteriores + ordinarioActual * mesesRestantes)

  if (mesId < 7) {
    proyectada = round2(
      proyectada +
        gratificacionEsperada(meses[6], ordinarioActual) +
        gratificacionEsperada(meses[11], ordinarioActual),
    )
  } else if (mesId === 7) {
    proyectada = round2(
      proyectada +
        round2(toNumber(actual.gratificacion) * 1.09) +
        gratificacionEsperada(meses[11], ordinarioActual),
    )
  } else if (mesId < 12) {
    proyectada = round2(proyectada + gratificacionEsperada(meses[11], ordinarioActual))
  } else {
    proyectada = round2(proyectada + round2(toNumber(actual.gratificacion) * 1.09))
  }

  return {
    rentaBrutaProyectada: proyectada,
    extraordinarioMes: toNumber(actual.extraordinario),
    ordinarioActual,
  }
}

export function calcularQuinta({ meses, uit }) {
  const uitValor = toNumber(uit)
  const deduccionFija = round2(7 * uitValor)
  const deduccionTotal = deduccionFija

  const brutaDefinitiva = rentaBrutaAnual(meses)
  const netaDefinitiva = round2(Math.max(0, brutaDefinitiva - deduccionTotal))
  const anual = aplicarImpuesto(netaDefinitiva, uitValor)

  const retenciones = []

  for (const meta of MESES) {
    const { rentaBrutaProyectada, extraordinarioMes } = proyectarRentaBruta(meses, meta.id)
    const netaProyectada = round2(Math.max(0, rentaBrutaProyectada - deduccionTotal))
    const { impuesto: impuestoProyectado, detalle } = aplicarImpuesto(netaProyectada, uitValor)
    const retenidoAcumulado = round2(
      meses
        .slice(0, meta.id - 1)
        .reduce((acc, mes) => acc + Math.max(0, toNumber(mes.pagoACuenta)), 0),
    )

    // Incluye el mes actual en los meses pendientes (octubre, noviembre y
    // diciembre son 3) y descuenta las retenciones ya ingresadas previamente.
    const mesesPorPagar = 13 - meta.id
    const saldoProyectado = Math.max(0, round2(impuestoProyectado - retenidoAcumulado))
    let retencionOrdinaria = round2(saldoProyectado / mesesPorPagar)
    retencionOrdinaria = Math.max(0, retencionOrdinaria)

    let retencionAdicional = 0
    if (extraordinarioMes > 0) {
      const netaConExtra = round2(Math.max(0, netaProyectada + extraordinarioMes))
      const impuestoConExtra = aplicarImpuesto(netaConExtra, uitValor).impuesto
      retencionAdicional = Math.max(0, round2(impuestoConExtra - impuestoProyectado))
    }

    const retencionMes = round2(retencionOrdinaria + retencionAdicional)

    const pagoACuenta = Math.max(0, toNumber(meses[meta.id - 1].pagoACuenta))

    retenciones.push({
      mesId: meta.id,
      nombre: meta.nombre,
      rentaBrutaProyectada,
      rentaNetaProyectada: netaProyectada,
      impuestoProyectado,
      retencionOrdinaria,
      retencionAdicional,
      retencionMes,
      retenidoAcumulado,
      pagoACuenta,
      totalMes: totalMes(meses[meta.id - 1]),
      detalleTramos: detalle,
    })
  }

  const totalPagosACuenta = round2(
    meses.reduce((acc, mes) => acc + Math.max(0, toNumber(mes.pagoACuenta)), 0),
  )
  const saldoFinal = round2(anual.impuesto - totalPagosACuenta)

  const tasaEfectiva =
    brutaDefinitiva > 0 ? round2((anual.impuesto / brutaDefinitiva) * 100) : 0

  return {
    uit: uitValor,
    deduccionFija,
    deduccionTotal,
    rentaBruta: brutaDefinitiva,
    rentaNeta: netaDefinitiva,
    impuestoAnual: anual.impuesto,
    detalleTramos: anual.detalle,
    tasaEfectiva,
    retenciones,
    totalRetenido: round2(retenciones.reduce((acc, mes) => acc + mes.retencionMes, 0)),
    totalPagosACuenta,
    saldoFinal,
    diferencia: saldoFinal,
  }
}
