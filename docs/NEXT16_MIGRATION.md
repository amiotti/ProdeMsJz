# Migración Controlada a Next.js 16

Este plan prepara la app para migrar de Next 14.2.35 a Next 16 minimizando riesgo operativo.

## Estado actual

- App en `next@^14.2.35`.
- Se adaptó el uso de `cookies()` a formato async-compatible (`await cookies()`) para reducir fricción de Request APIs en Next 16.
- Se agregó preflight de migración: `npm run migration:next16:preflight`.

## Objetivo de migración

- Actualizar a Next 16 con el menor downtime posible.
- Mantener funcionalidad de login, predicciones, resultados, pagos y panel admin.

## Fase 1 - Preflight (sin ruptura)

1. Ejecutar:
   - `npm run migration:next16:preflight`
2. Corregir todo issue bloqueante detectado por script.
3. Revisar warnings de:
   - `params` y `searchParams` en App Router
   - APIs sync heredadas

## Fase 2 - Upgrade técnico

1. Crear rama de trabajo:
   - `chore/next16-migration`
2. Actualizar dependencias principales:
   - `next@16`
   - `react@19`
   - `react-dom@19`
   - `@types/react@19`
   - `@types/react-dom@19`
3. Reinstalar y compilar:
   - `npm install`
   - `npm run build`

## Fase 3 - Compatibilidad App Router

1. Ajustar `params` / `searchParams` en páginas dinámicas a forma async cuando aplique.
2. Verificar rutas API con `cookies()` y `headers()`.
3. Validar redirects, login/logout y navegación mobile/desktop.

## Fase 4 - Validación funcional

Checklist mínimo:

- Registro / login / logout
- Pago de inscripción y estado de pago
- Carga de predicciones (grupos + fases finales)
- Carga de resultados oficiales (admin)
- Tabla y estadísticas
- Formulario de contacto y panel de consultas (admin)

## Fase 5 - Deploy gradual

1. Deploy a preview.
2. Smoke test funcional + logs.
3. Deploy producción en ventana controlada.
4. Monitoreo 24h de errores API / tiempo de respuesta.

## Rollback

Si hay regresión crítica:

1. Revertir deploy a build estable anterior.
2. Restaurar lockfile previo.
3. Reabrir rama de migración con fix puntual.

## Comandos útiles

- Preflight: `npm run migration:next16:preflight`
- Build: `npm run build`
- Auditoría: `npm audit`
