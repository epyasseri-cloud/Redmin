# DocRemind

Base del proyecto para gestionar documentos y recordatorios de caducidad.

## Estructura inicial

- frontend: React + Vite
- backend: Node.js + Express
- supabase/migrations: SQL base

## Requisitos

- Node.js 20+
- npm 10+
- Proyecto Supabase creado

## Configuracion local

1. Completa variables en frontend/.env y backend/.env.
2. Instala dependencias:
   - frontend: npm install
   - backend: npm install
3. Aplica migracion SQL en Supabase con el contenido de supabase/migrations/001_initial_schema.sql.

## Ejecucion

Terminal 1 (frontend):

```bash
cd frontend
npm run dev
```

Terminal 2 (backend):

```bash
cd backend
npm start
```

## Checklist modulo 0

- [ ] Repositorio creado en GitHub y clonado localmente.
- [ ] Frontend arranca con npm run dev.
- [ ] Backend arranca con npm start.
- [ ] Supabase activo con tablas profiles y documents.
- [ ] Variables de entorno cargadas correctamente.

## APIs externas por configurar

- Google Cloud Vision API key
- OpenAI API key (opcional fallback)
- SendGrid API key
- Twilio SID/Auth Token (opcional para inicio)

## Modulo 5: Recordatorios automaticos

El backend ahora incluye un scheduler diario para enviar recordatorios de documentos por vencer.

### Variables de entorno nuevas (backend/.env)

- `SENDGRID_FROM_EMAIL`: remitente valido para emails.
- `REMINDER_CRON_ENABLED`: `true` o `false` para activar/desactivar scheduler.
- `REMINDER_CRON`: expresion cron (default `0 9 * * *`).
- `REMINDER_TIMEZONE`: zona horaria del scheduler (default `Europe/Madrid`).
- `REMINDER_DAYS_BEFORE`: dias objetivo separados por comas (default `30,7,1,0`).
- `REMINDER_RUN_ON_START`: si es `true`, corre un ciclo al iniciar backend.
- `REMINDER_RUN_SECRET`: secreto para disparar el ciclo manual via API.

### Endpoint manual de prueba

`POST /api/reminders/run` con header `x-reminder-secret: <REMINDER_RUN_SECRET>`

Ejemplo en PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/reminders/run" -Headers @{ "x-reminder-secret" = "TU_SECRETO" }
```

Si SendGrid/Twilio no estan configurados, el ciclo se ejecuta sin romper la app y registra el motivo en logs.
