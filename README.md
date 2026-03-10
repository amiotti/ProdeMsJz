# PRODE Mundial 2026 (Next.js + InstantDB + Galio Pay)

Aplicación web de PRODE para el Mundial FIFA 2026.

Permite:
- registrar participantes,
- cobrar inscripción,
- cargar predicciones por partido,
- cargar resultados oficiales (admin),
- calcular tabla de posiciones automáticamente,
- mostrar estadísticas y vistas públicas.

## Stack

- `Next.js 14` (App Router)
- `React 18`
- `TypeScript`
- `InstantDB` (persistencia)
- `Galio Pay` (links de pago de inscripción)
- `Vercel Analytics` (web analytics)

## Funcionalidades principales

## 1) Landing pública (`/`)

- Pantalla de inicio con imagen de fondo (`public/Landing.*`)
- CTA para `Iniciar sesión / Registrarse`
- Acceso a tabla pública (`/leaderboard`)
- Modo claro/oscuro disponible sin sesión
- Estética glass + animaciones suaves

## 2) Registro e inicio de sesión (`/register`, `/login`)

- Registro de usuario con:
  - nombre
  - apellido
  - email
  - teléfono
  - contraseña
- Login por email + contraseña
- Al registrarse:
  - se crea el usuario,
  - se inicia sesión,
  - redirige a `/inicio`
  - el pago puede hacerse después (no redirige automáticamente al checkout)
- Diseño responsive + tema claro/oscuro

## 3) Sesiones y seguridad de acceso

- Sesión por cookie `httpOnly`
- Expiración por inactividad: **15 minutos**
- Cierre de sesión al cerrar el navegador (cookie de sesión)
- Renovación de sesión mientras el usuario interactúa

## 4) Inicio privado (`/inicio`)

- Resumen general del PRODE
- Premios del Top 5
- Métricas rápidas:
  - usuarios
  - resultados cargados
  - predicciones totales
  - avance del fixture
- Próximo partido, líder provisional y datos del torneo
- Visualización de grupos (zonas) y equipos
- Si el usuario ya está logueado, **no se muestra** CTA de registro

## 5) Calendario (`/calendar`)

- Fixture del Mundial 2026 (fase de grupos cargada)
- Fechas en formato corto (`dd/m/aa`)
- Horarios mostrados en formato local de Argentina (`hs`)
- Códigos de partido en una sola línea
- Vista optimizada para mobile

## 6) Selecciones (`/teams` y `/teams/[slug]`)

- Listado de selecciones por grupo
- Ficha individual por selección con:
  - datos generales
  - resumen enciclopédico (Wikipedia, resumido)
  - claves deportivas / datos relevantes
  - partidos de fase de grupos
  - enlace a noticias oficiales FIFA del equipo (`team-news`)
- Correcciones de acentos/caracteres (UTF-8 / sanitización de textos)
- Tabla de fixture alineada para mejor lectura

## 7) Predicciones (`/predictions`)

- Carga de predicciones por partido
- Guardado individual por partido
- Guardado por grupo (botón `Guardar grupo`)
- Filtro / orden por:
  - grupo
  - fecha de partido
- Probabilidad de victoria por equipo (visual)
- Restricción por pago:
  - si no está aprobada la inscripción, no debería poder cargar predicciones
- Restricción temporal:
  - se pueden editar hasta **1 hora antes** del partido
  - partidos ya jugados no aparecen como disponibles para cargar

## 8) Resultados oficiales (`/results`)

- Carga de resultados oficiales (solo admin)
- Usuarios normales: solo lectura
- Vista conmutada:
  - `Resultados`
  - `Posiciones` (tabla de posiciones por grupo)
- Tabla por grupo actualizada automáticamente según resultados oficiales:
  - `PJ`, `G`, `E`, `P`, `GF`, `GC`, `DG`, `Pts`

## 9) Tabla de posiciones general (`/leaderboard`)

- Ranking general de participantes
- Excluye al administrador
- Muestra:
  - nombre y apellido
  - avatar por iniciales
  - puntos
- Vista pública accesible desde landing
- Soporta tema claro/oscuro en modo público

## 10) Perfil (`/profile`)

- Acceso desde el nombre del usuario en el header
- Datos de registro visibles en modo lectura
- Edición solo al hacer clic en `Editar perfil`
- Sección con predicciones guardadas del usuario
- Descarga de predicciones en PDF (desde backend / DB)

## 11) Usuarios (`/users`) - solo admin

- Listado de usuarios registrados
- Eliminación de usuarios (excepto admin)
- Gestión pensada para administración del grupo

## 12) Estadísticas (`/stats`)

- Dashboard con métricas para admin y usuarios
- Comparativas y gráficos
- Evolución del puntaje:
  - por defecto muestra la curva del usuario actual
  - permite comparar con otro usuario vía desplegable
- Métricas de rendimiento / precisión / distribución (según datos cargados)

## 13) Reglas (`/rules`)

- Explicación de participación
- Restricciones de predicción
- Sistema de puntuación actualizado:
  - **20 puntos**: resultado exacto
  - **10 puntos**: acierto de ganador/empate (signo)
  - **5 puntos**: acierto de goles de uno de los equipos
  - **0 puntos**: sin aciertos

## 14) Términos y Condiciones (`/terms`)

- Términos básicos para Argentina
- Aclaración de premios sujetos a cantidad de participantes
- Aclaración de pagos/transferencias seguras vía `Galio Pay`

## 15) Header, navegación y UX

- Header responsive con menú móvil desplegable (`☰`)
- Modo claro/oscuro con botón en `brand-wrap`
- Indicador de sección activa
- Transición visual entre secciones
- Scroll suave
- Botón flotante para volver arriba (`↑`)

## 16) Responsive (mobile-first mejorado)

- Menú de secciones comprimido en celular
- Formularios adaptados a pantallas chicas
- Tablas con scroll horizontal táctil
- Mejoras de interacción táctil (`tap`, `scroll`, spacing`)

## 17) Pagos de inscripción con Galio Pay

Implementado con Payment Link.

- Generación de link de pago desde backend
- Retorno a la app (`/payment/return`)
- Confirmación de pago y actualización del estado del usuario
- Se guarda comprobante de pago del usuario (`registrationPaymentReceipt`)

### Webhook de Galio

Endpoint implementado:

- `POST /api/payments/galio/webhook`

Qué hace:
- recibe notificación,
- obtiene `paymentId`,
- consulta el pago en Galio (server-to-server),
- valida estado/monto/moneda/referencia,
- aprueba la inscripción del usuario automáticamente.

Notas:
- Si Galio no permite configurar `secret`, el webhook igual valida contra la API de Galio.
- En producción, `GET` del webhook responde `404` (hardening).

## 18) Base de datos (InstantDB)

Persistencia de:
- usuarios
- estado de pago de inscripción
- comprobante de pago
- predicciones
- resultados oficiales
- configuración de puntajes

### Modelo de predicciones

Se migró a un modelo más eficiente para escalar:
- predicciones agrupadas por usuario (objeto/mapa)
- evita una fila por cada predicción individual
- reduce volumen y cantidad de lecturas/escrituras

## 19) Seguridad (hardening aplicado)

Medidas implementadas:

- validación de sesión firmada (HMAC)
- cookie `httpOnly`, `sameSite=lax`
- expiración por inactividad
- validaciones de input (email, teléfono, longitudes)
- CSRF básico por validación de `Origin/Referer` en endpoints mutables
- rate limiting básico en memoria para login/registro/pago
- endpoints sensibles con `Cache-Control: no-store`
- restricciones de rol (admin vs user)
- validación server-side de pagos (retorno + webhook)
- headers de seguridad (`CSP`, `X-Frame-Options`, `nosniff`, etc.)

## 20) Analytics

Se integró `Vercel Web Analytics`:

- dependencia `@vercel/analytics`
- componente `<Analytics />` en `app/layout.tsx`

## Rutas principales

Públicas:
- `/`
- `/leaderboard`
- `/login`
- `/register`
- `/terms`

Con sesión:
- `/inicio`
- `/calendar`
- `/teams`
- `/teams/[slug]`
- `/rules`
- `/predictions`
- `/results`
- `/profile`
- `/stats`

Solo admin:
- `/users`
- edición de resultados en `/results`

## Endpoints API (resumen)

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Datos:
- `GET /api/state`
- `GET /api/predictions/state`
- `GET /api/results/state`
- `POST /api/predictions`
- `POST /api/results`
- `GET/PATCH /api/profile`
- `GET/POST/DELETE /api/users` (con restricciones de rol)

Pagos:
- `POST /api/payments/galio/link`
- `POST /api/payments/galio/webhook`

## Variables de entorno

Ver `.env.example`.

Claves principales:

- `NEXT_PUBLIC_INSTANT_APP_ID`
- `INSTANTDB_ADMIN_TOKEN`
- `PRODE_SESSION_SECRET`
- `PRODE_ADMIN_EMAIL`
- `PRODE_ADMIN_PASSWORD`
- `APP_BASE_URL`, `APP_BASE_URL_LOCAL`, `APP_BASE_URL_PROD`
- `GALIOPAY_CLIENT_ID` (+ variantes `_LOCAL` / `_PROD`)
- `GALIOPAY_API_KEY` (+ variantes `_LOCAL` / `_PROD`)
- `GALIOPAY_API_BASE` (+ variantes)
- `GALIOPAY_REGISTRATION_AMOUNT_ARS` (+ variantes)
- `GALIOPAY_CURRENCY_ID` (+ variantes)
- `GALIOPAY_REGISTRATION_TITLE` (+ variantes)
- `GALIOPAY_WEBHOOK_SECRET` (opcional, si el proveedor lo soporta)

## Instalación local

```bash
npm install
npm run dev
```

Abrir:

- `http://localhost:3000`

## Build de producción

```bash
npm run build
npm start
```

## Despliegue recomendado

Recomendado: `Vercel`

Motivos:
- integración nativa con Next.js App Router
- variables de entorno por ambiente
- Vercel Analytics
- deploy simple y rápido

## Notas de operación

- El admin se crea/actualiza automáticamente desde variables de entorno.
- El administrador no participa en la tabla de posiciones ni carga predicciones.
- La tabla general y estadísticas dependen de resultados oficiales cargados.
- Los horarios se muestran con formato pensado para Argentina.

## Repositorio

GitHub:
- https://github.com/amiotti/ProdeAmigos

