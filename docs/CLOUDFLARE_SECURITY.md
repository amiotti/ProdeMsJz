# Cloudflare hardening (PRODE)

## 1) DNS/Proxy
- En Cloudflare, dejar el registro `A`/`CNAME` del dominio en **Proxied** (nube naranja).

## 2) WAF Managed Rules
- Security > WAF > Managed rules:
  - Activar reglas administradas de Cloudflare.
  - Activar OWASP Core Ruleset.

## 3) Bot protection
- Security > Bots:
  - Activar **Bot Fight Mode** (o Super Bot Fight Mode si tu plan lo permite).
  - Bloquear verified bots no deseados si no necesitás indexación.

## 4) Geographic restriction
- Security > WAF > Custom rules:
  - Regla: `ip.geoip.country ne "AR"` -> **Block**.
  - Si necesitás permitir admin desde otro país, agregar excepción por IP.

## 5) Rate limiting (edge)
- Security > WAF > Rate limiting rules:
  - `/api/auth/*`: 20 req / 5 min por IP -> Block 10 min.
  - `/api/predictions*`, `/api/results*`, `/api/profile*`, `/api/users*`: 120 req / 1 min por IP -> Managed Challenge / Block.
  - `/api/contact`: 10 req / 1 min por IP -> Managed Challenge.

## 6) Headers / Origin lock
- SSL/TLS:
  - Full (strict)
  - Always use HTTPS
- Origin Rules:
  - Pasar `CF-Connecting-IP` al origen (ya compatible en app).

## 7) Webhooks
- Excluir de bloqueos agresivos:
  - `/api/payments/talo/webhook`
  - `/api/payments/galio/webhook`
- Mantener validación de firma en backend.

