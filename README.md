# Calculadora de renta de quinta categoría

Aplicación Vue.js para calcular el Impuesto a la Renta de quinta categoría de trabajadores en planilla (Perú).

## Qué calcula

- Renta bruta anual a partir de las remuneraciones de los 12 meses.
- Deducción fija de 7 UIT.
- Impuesto anual con las tasas progresivas: 8 %, 14 %, 17 %, 20 % y 30 %.
- Retención mensual proyectada según el procedimiento de SUNAT (el usuario selecciona el mes del cálculo y ve el descuento mensual que corresponde).

UIT 2026 por defecto: **S/ 5,500** (D.S. N.° 301-2025-EF).

## Cómo usarla

```bash
npm install
npm run dev
```

## Publicar en GitHub Pages

El workflow `.github/workflows/deploy.yml` compila y publica la aplicación en GitHub Pages cada vez que se actualiza la rama `main` (también se puede ejecutar manualmente desde Actions). Vite configura automáticamente la ruta base según el nombre del repositorio.

1. Sube este proyecto a un repositorio de GitHub con la rama principal llamada `main`.
2. En GitHub, abre **Settings → Pages** y selecciona **GitHub Actions** como origen de publicación.
3. Espera a que finalice el workflow **Deploy to GitHub Pages** en la pestaña **Actions**. La URL publicada aparecerá en el resultado del despliegue.

1. Completa los datos del trabajador y el ejercicio.
2. Ingresa la remuneración ordinaria y, si corresponde, cópiala a los 12 meses.
3. Carga las gratificaciones de julio y diciembre, variables y extraordinarios.
4. Revisa el impuesto anual, los tramos y la retención de cada mes.

La CTS no forma parte de quinta categoría y no debe incluirse.

## Aviso

Es una herramienta de apoyo. La retención definitiva la determina el empleador conforme a la normativa vigente y a SUNAT.
