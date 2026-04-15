# DocRemind

Proyecto full stack para registrar documentos, extraer datos por OCR y gestionar recordatorios de caducidad.

## 1) Objetivo tecnico del proyecto

DocRemind busca resolver este flujo:

1. El usuario sube un documento (ej. DNI, pasaporte, carnet).
2. El backend procesa OCR y extrae campos relevantes (numero, fecha de expiracion, etc.).
3. Se guarda la metadata en Supabase.
4. Un scheduler diario revisa vencimientos y envia recordatorios.

Este README esta orientado a revision tecnica rapida: arquitectura, puntos de entrada y validaciones minimas.

## 2) Arquitectura (vista practica)

- frontend: React + Vite (UI, autenticacion, subida de documentos, dashboard).
- backend: Node.js + Express (API REST, OCR, integraciones externas, scheduler).
- supabase: persistencia (tablas y perfiles) + autenticacion.
- servicios externos: Vision/OpenAI para OCR y SendGrid/Twilio para notificaciones.

## 3) Estructura relevante del codigo

### Backend

- `src/index.js`: bootstrap del servidor, middlewares globales y rutas.
- `src/controllers/`: logica de cada modulo (`auth`, `document`, `ocr`).
- `src/routes/`: definicion de endpoints por dominio.
- `src/middlewares/`: auth, rate limit, validaciones y carga de archivos.
- `src/services/`: integraciones (OpenAI, Vision, notificaciones).
- `src/cron/reminderJob.js`: job diario para documentos por vencer.
- `src/utils/`: utilidades de regex y cliente de Supabase.

### Frontend

- `src/pages/`: vistas principales (`Login`, `Register`, `Dashboard`, `NewDocument`, etc.).
- `src/components/`: componentes reutilizables por modulo.
- `src/hooks/useAuth.jsx`: estado/sesion de autenticacion.
- `src/services/`: capa de cliente API y Supabase.

### Base de datos

- `supabase/migrations/001_initial_schema.sql`: esquema base (tablas principales).
- `supabase/migrations/002_trigger_profile.sql`: trigger para perfiles.

## 4) Requisitos

- Node.js 20+
- npm 10+
- Proyecto Supabase activo

## 5) Configuracion local

1. Crear y completar:
   - `frontend/.env`
   - `backend/.env`
2. Instalar dependencias:

```bash
cd frontend
npm install

cd ../backend
npm install
```

3. Aplicar migraciones SQL en Supabase:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_trigger_profile.sql`

## 6) Ejecucion local

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

Referencias tipicas:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000` (segun configuracion)

## 7) Endpoints y pruebas minimas sugeridas

No es una lista exhaustiva, pero sirve para validar modulo por modulo:

1. Auth:
   - registro/login desde frontend o endpoints de `authRoutes`.
2. Documentos:
   - crear/listar/editar documento desde `documentRoutes`.
3. OCR:
   - subir archivo y verificar respuesta en `ocrRoutes`.
4. Recordatorios:
   - disparo manual del cron por endpoint seguro.

### Prueba manual de recordatorios

`POST /api/reminders/run` con header `x-reminder-secret: <REMINDER_RUN_SECRET>`

Ejemplo PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/reminders/run" -Headers @{ "x-reminder-secret" = "TU_SECRETO" }
```

## 8) Variables de entorno importantes (backend)

### OCR / IA / Notificaciones

- `OCR_PROVIDER`: `auto`, `local` o `google`.
- `OCR_LANG`: idioma de OCR local (ej. `spa+eng`).
- `GOOGLE_VISION_API_KEY`: clave para Vision API cuando se usa provider Google.
- `OPENAI_API_KEY`: fallback opcional para modulos IA.
- `EMAIL_PROVIDER`: `sendgrid` o `gmail`.
- `SENDGRID_API_KEY` y `SENDGRID_FROM_EMAIL`: envio de correo con SendGrid.
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GMAIL_FROM_EMAIL`: envio de correo con Gmail SMTP.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`: envio de SMS (opcional).

### Scheduler de recordatorios

- `REMINDER_CRON_ENABLED`: `true`/`false` para activar scheduler.
- `REMINDER_CRON`: cron expression (default `0 9 * * *`).
- `REMINDER_TIMEZONE`: zona horaria (default `Europe/Madrid`).
- `REMINDER_DAYS_BEFORE`: dias objetivo separados por comas (default `30,7,1,0`).
- `REMINDER_RUN_ON_START`: ejecuta una pasada al iniciar.
- `REMINDER_RUN_SECRET`: secreto para ejecutar endpoint manual.

Nota: si SendGrid/Twilio no estan configurados, el ciclo de recordatorios no debe romper la app; solo registra en logs el motivo.

## 9) Checklist rapido para revision tecnica

- [ ] Frontend compila y abre sin errores (`npm run dev`).
- [ ] Backend inicia y expone rutas (`npm start`).
- [ ] Conexion con Supabase valida (auth + tablas principales).
- [ ] Flujo subir documento -> OCR -> guardar metadata funciona.
- [ ] Job de recordatorios se puede ejecutar manualmente.
- [ ] Logs muestran errores utiles cuando falta una API key.

## 10) Riesgos tecnicos a revisar (siguiente iteracion)

- Cobertura de tests (actualmente no documentada en este repo).
- Estrategia de reintento/fallos en servicios externos (Vision/OpenAI/SendGrid).
- Politicas de rate limiting y validacion de archivos para OCR.
- Observabilidad: trazas y metrica del job de recordatorios.
