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
