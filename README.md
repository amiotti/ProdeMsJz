# PRODE Mundial (Next.js)

App PRODE para registrar usuarios, cargar predicciones por partido, cargar resultados oficiales y calcular tabla de posiciones.

## Incluye

- Registro de usuarios (nombre + email)
- Predicciones por partido (fase de grupos)
- Formato Mundial 2026: 12 grupos (A-L)
- Partidos de fase de grupos generados automaticamente (6 por grupo)
- Carga de resultados oficiales
- Tabla de posiciones con puntaje
- Persistencia local en `data/prode-db.json`

## Instalacion

En este entorno no habia `node`/`npm` instalados, por eso no pude ejecutar la app ni correr build.

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Puntaje (editable)

Definido en `lib/prode.ts`:

- `3` puntos: resultado exacto
- `1` punto: ganador/empate correcto
- `0` puntos: resto

## Grupos y equipos

La app ya contempla la estructura de grupos (12 zonas). Los equipos vienen con placeholders (`Equipo A1`, `Equipo A2`, etc.) para que reemplaces el sorteo oficial facilmente en `lib/seed.ts`.
