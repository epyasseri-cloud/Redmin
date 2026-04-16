# Technical File Explanation - DocRemind

## Scope
This document explains the technical purpose and runtime behavior of the main source files in the project.

## Backend - API Entry Points

### backend/api/[...all].js
- Purpose: Serverless wrapper for Vercel deployment that exports the Express app.
- Main export: default export of the Express app from backend/src/index.js.
- Runtime behavior: receives requests routed by Vercel rewrites and delegates handling to Express.
- Deployment note: required for Vercel serverless runtime.

## Backend - Core Application

### backend/src/index.js
- Purpose: bootstrap and configure Express app.
- Responsibilities:
  - Security headers with helmet.
  - CORS validation based on FRONTEND_URL and Vercel flags.
  - JSON parsing and request logging.
  - Route registration for session, documents, OCR, and reminders.
  - Global error handling.
- Deployment note: exports app for Vercel; only calls app.listen in local direct-run mode.

## Backend - Controllers

### backend/src/controllers/authController.js
- Purpose: return authenticated profile data.
- Behavior: queries profiles table by req.user.id and returns profile or 404/500.

### backend/src/controllers/documentController.js
- Purpose: document business logic and extraction flow.
- Exports:
  - extractDocumentDate
  - createDocument
  - listMyDocuments
  - updateDocument
  - deleteDocument
  - sendTestReminderEmail
- Behavior:
  - validates tipo_doc and ISO date format.
  - tries regex extraction first, then OpenAI fallback.
  - enforces ownership in update/delete operations.
  - triggers test email for authenticated user.

### backend/src/controllers/ocrController.js
- Purpose: process uploaded image and return OCR text.
- Behavior:
  - validates file presence.
  - delegates OCR to visionService.
  - maps provider/config errors to user-safe HTTP responses.

## Backend - Routes

### backend/src/routes/authRoutes.js
- Purpose: session/auth route mapping.
- Endpoint: GET /api/session/me (protected).

### backend/src/routes/documentRoutes.js
- Purpose: document route mapping.
- Endpoints:
  - POST /api/documents/extract
  - POST /api/documents/test-email
  - GET /api/documents
  - POST /api/documents
  - PATCH /api/documents/:id
  - DELETE /api/documents/:id

### backend/src/routes/ocrRoutes.js
- Purpose: OCR route mapping.
- Endpoint: POST /api/ocr (auth + upload middleware + OCR controller).

### backend/src/routes/reminderRoutes.js
- Purpose: reminder execution/testing routes.
- Endpoints:
  - POST /api/reminders/run (secret-protected)
  - POST /api/reminders/test-email (auth-protected)

## Backend - Middlewares

### backend/src/middlewares/authMiddleware.js
- Purpose: validate Bearer token using Supabase.
- Behavior: injects req.user on success, returns 401 on failure.

### backend/src/middlewares/rateLimiter.js
- Purpose: route-specific throttling.
- Exports: generalLimiter, authLimiter, ocrLimiter.

### backend/src/middlewares/uploadMiddleware.js
- Purpose: image upload validation.
- Behavior: allows jpg/png/webp up to 5MB, uses in-memory multer storage.

### backend/src/middlewares/validateId.js
- Purpose: validate UUID path parameters before DB access.

## Backend - Services

### backend/src/services/notificationService.js
- Purpose: send notifications through SendGrid/Gmail/Twilio.
- Behavior: provider-aware dispatch with graceful fallback when config is missing.

### backend/src/services/openaiService.js
- Purpose: AI fallback for expiry date extraction.
- Behavior: requests gpt-4o-mini and enforces strict YYYY-MM-DD output.

### backend/src/services/visionService.js
- Purpose: OCR provider abstraction.
- Behavior:
  - supports Google Vision and local Tesseract.
  - in Vercel, prefers Google Vision to avoid serverless timeout.
  - supports race/fallback logic in auto mode.

## Backend - Utilities

### backend/src/utils/regexExtractor.js
- Purpose: fast regex-based date extraction from OCR text.
- Behavior: supports multiple date formats and bilingual keywords.

### backend/src/utils/supabaseClient.js
- Purpose: create backend Supabase admin client singleton.
- Behavior: uses service role credentials and stateless auth settings.

## Backend - Cron

### backend/src/cron/reminderJob.js
- Purpose: scan expiring documents and send reminders.
- Behavior:
  - parses configured reminder days.
  - deduplicates sends by day.
  - updates last_reminder_sent.
  - returns cycle stats.

## Backend - Deployment Config

### backend/vercel.json
- Purpose: Vercel function, rewrites, and header configuration.
- Behavior:
  - sets maxDuration for catch-all function.
  - rewrites /api/:path* to the serverless entrypoint.
  - injects CORS headers at edge level.

## Frontend - Bootstrap and Shell

### frontend/src/main.jsx
- Purpose: mount React app and global styles.

### frontend/src/App.jsx
- Purpose: app shell, route tree, and route guards.
- Behavior: protected routes for dashboard/new-document, guest routes for login/register.

## Frontend - Auth State

### frontend/src/hooks/useAuth.jsx
- Purpose: central auth/session/profile state manager.
- Behavior:
  - loads current session from Supabase.
  - syncs on auth state changes.
  - resolves profile from backend API.

## Frontend - Services

### frontend/src/services/api.js
- Purpose: centralized backend HTTP client.
- Behavior: bearer auth, normalized error handling, endpoint wrappers.

### frontend/src/services/auth.js
- Purpose: wrappers around Supabase auth operations.

### frontend/src/services/supabase.js
- Purpose: frontend Supabase client singleton.

## Frontend - Pages

### frontend/src/pages/Home.jsx
- Purpose: landing page.

### frontend/src/pages/Login.jsx
- Purpose: login screen container.

### frontend/src/pages/Register.jsx
- Purpose: register screen container.

### frontend/src/pages/Dashboard.jsx
- Purpose: authenticated document overview and reminder actions.

### frontend/src/pages/NewDocument.jsx
- Purpose: authenticated workflow to upload and save a document.

## Frontend - Components

### frontend/src/components/auth/LoginForm.jsx
- Purpose: credential and OAuth login form.

### frontend/src/components/auth/RegisterForm.jsx
- Purpose: user registration form.

### frontend/src/components/common/Header.jsx
- Purpose: top navigation and session controls.

### frontend/src/components/documents/EditDateModal.jsx
- Purpose: edit document expiry date.

### frontend/src/components/documents/UploadDocument.jsx
- Purpose: image upload and OCR trigger component.

## Frontend - Tooling Config

### frontend/vite.config.js
- Purpose: Vite + React build config.

### frontend/eslint.config.js
- Purpose: lint rules for frontend source.

## Database Migrations

### supabase/migrations/001_initial_schema.sql
- Purpose: create base schema (profiles, documents) and RLS policies.

### supabase/migrations/002_trigger_profile.sql
- Purpose: auto-create/update profile row after auth.users insert via trigger.

## Notes
- Binary files, image assets, package-lock files, and .env files are intentionally not fully documented line-by-line in this document.
- Source code files now include technical header comments to make maintenance and onboarding easier.
