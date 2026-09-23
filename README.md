# HYUK — Catálogo digital SaaS con pedidos

Catálogo y menú digital multi-tenant para pymes. Cada tienda publica su catálogo
por slug/subdominio (`/[slug]`), recibe pedidos y los gestiona desde un panel de
administración. El tema Light/Dark de la aplicación es independiente de la
personalización visual de cada tienda.

## Comandos

| comando | acción |
|---|---|
| `npm run dev` | dev server en `http://localhost:3000` |
| `npm run build` | build de producción |
| `npm run build:clean` | borra `.next` y recompila (evita el 500/MIME del build compartido) |
| `npm start` | servidor de producción |
| `npm run lint` | `next lint --max-warnings 20` |
| `npm run check:env` | valida variables de entorno (`scripts/check-env.mjs`) |
| `npm test` · `npm run test:ci` | suite de tests (`node --test`, sin deps) |

## Instalación

```bash
npm install
npm run dev
```

Crear `.env.local` con las variables de abajo. `.env.local` está ignorado por git
(`.env*.local`); **nunca** se comprometen valores reales. Los scripts de BD leen
`SUPABASE_ACCESS_TOKEN` y el project-ref de `NEXT_PUBLIC_SUPABASE_URL` directamente
de `.env.local` y no imprimen secretos.

## Variables de entorno

| variable | ámbito | requisito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | requerida |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | requerida |
| `NEXT_PUBLIC_ROOT_DOMAIN` | pública | recomendado (`hyuk.app`) |
| `NEXT_PUBLIC_APP_URL` | pública | recomendado (sitemap/billing) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | requerida (admin, pricing, bypass RLS) |
| `STRIPE_SECRET_KEY` | server | opcional (pago online) |
| `STRIPE_WEBHOOK_SECRET` | server | opcional (verificación de webhook) |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` / `STRIPE_PRICE_PRO` | server | opcional |
| `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE` / `STRIPE_PRICE_ENTERPRISE` | server | opcional |
| `MP_ACCESS_TOKEN` | server | opcional — **no conectado** (solo Stripe) |
| `GEMINI_API_KEY` | server | opcional (funciones de IA) |
| `SENTRY_DSN` | pública | opcional (observabilidad) |
| `SUPABASE_ACCESS_TOKEN` | scripts | opcional (solo `scripts/*.mjs`) |
| `VERCEL_URL` | auto | leído en runtime |

## Arquitectura

- **Multi-tenant**: cada tienda es `profiles.id` (FK a `auth.users`). Las tablas de
  negocio (`orders`, `products`, `categories`, `coupons`, `customers`,
  `inventory_*`, `analytics_events`, …) se aislan por `store_id`.
- **RLS**: las tablas de negocio tienen RLS activado con políticas scoped a
  `store_id`/`auth.uid()`. El admin lee con el `service_role` tras verificar sesión
  y ownership (evita las políticas RLS rotas del rol autenticado).
- **Auth**: Supabase Auth, cookies de 1 año refrescadas en middleware. Rutas
  `/login`, `/signup`, `/auth/callback`, `/onboarding`.
- **Middleware** (`middleware.js`): rewrite de subdominio → `/[slug]`, redirección
  a `/admin` con sesión activa, `Cache-Control: no-store` en rutas sensibles y
  exclusión de assets (`_next/`, `api/`, `public/`) — previene el bug MIME de
  CSS/JS (500 `text/html` sobre URLs estáticas).
- **Catálogo público**: `/[slug]` (ISR 60 s), `[slug]/opengraph-image` (OG dinámica),
  `[slug]/not-found`.
- **Admin**: `/admin/*` (analytics, categories, customers, customize, orders,
  products, settings, ai-importer, flyer-maker, qr-generator, marketing), protegido
  por sesión.

## Temas (Light / Dark)

- **Tema global de la app**: Light/Dark **único**. `AppThemeProvider` (next-themes)
  escribe la clase `.dark` en `<html>` y persiste la preferencia en
  `localStorage` (`hyuk-theme`). No existe un tercer modo.
- **Personalización visual por tienda**: el catálogo (y el preview de
  `/admin/customize`) se pinta con variables CSS aplicadas a un subárbol de
  `display: contents` por `ThemeScope` (`components/theme/ThemeScope.jsx`),
  alimentado por `ThemeProvider`/`useTheme`. **No escribe en `<html>`** (se limpia
  al desmontar), así no secuestra el Light/Dark global. Incluye paletas de color
  (`COLOR_PRESETS`), presets estructurales (`DESIGN_PRESETS`), tipografía, radios,
  layout, banner y configuración de WhatsApp.
- El modo oscuro usa grises carbón neutros (R≈G≈B, sin azul); el `:root` Light no
  se modifica (`app/globals.css`).

## Funcionalidades

**Catálogo y ventas**
- Productos, categorías, variantes y SKUs (`product_skus`, `product_options`).
- Carrito (`CartContext` + `CartDrawer`).
- Checkout por WhatsApp (`lib/whatsapp/checkout.js`): mensaje profesional con
  ítems, notas, total, cupón; URL `wa.me`.

**Pedidos**
- CRUD server-side (`api/orders`, `api/orders/[id]`, `api/orders/public/[id]`).
- Integridad de precios: el total se recalcula en servidor (`lib/checkout-core.js`)
  rechazando manipulación de precios, cantidades, opciones o cupones.
- Estados `pending → preparing → ready → completed` y `cancelled` (función
  `set_order_status`, constraint `orders_status_check`).
- Tracking público `/pedido/[id]` con timeline de estados.
- Admin kanban/list, sonido de nuevo pedido, flash de título y ticket térmico
  (`lib/print/thermal-ticket.js`, `PrintTicketModal`).

**Inventario**
- Stock por SKU (`product_skus.stock`, CHECK `stock >= 0`); movimientos
  idempotentas (`inventory_movements`) y resumen (`product_stock_summary`).
  Descuenta en pago, revierte en cancelación/anulación.

**Cupones**
- Códigos con %/fijo, expiración y límite de usos; validación server-side.

**Analytics**
- Eventos (`page_view`, `view_product`, `add_to_cart`, `checkout_start`,
  `whatsapp_click`, `purchase`) → `api/analytics/track` → `analytics_events`.
- Dashboard `/admin/analytics`: funnel, ventas, ticket, clics WhatsApp, sin
  métricas inventadas.

**IA (opcional)**
- Gemini 1.5 Flash (`GEMINI_API_KEY`): descripciones de producto, escaneo de menú
  desde imagen y generación de temas. UI `admin/ai-importer` + `AiCustomizePanel`;
  API `api/ai/{generate-description,generate-theme,scan-menu}`.

**Onboarding, planes y billing**
- Onboarding guiado (negocio → primer producto → compartir; slug en vivo). Trial
  de 28 días con beneficios Pro para nuevos usuarios.
- Planes Free/Starter/Pro/Enterprise con límites (Free: 6 productos/4 categorías,
  afectan solo la creación en cuentas Free sin trial). Billing online vía Stripe
  suscripciones + Customer Portal (`api/checkout/create-preference`,
  `api/billing/portal`, `SubscribeButton`, `/pricing`). Mercado Pago no conectado.
- `/contact` → `soporte@hyuk.app` (Enterprise).

## SEO y PWA

- `metadata` global y dinámico por slug (`openGraph`, `twitter cards`, keywords).
- Sitemap dinámico (`app/sitemap.js`) con slugs de tiendas; `robots.txt` en
  `public/` (desindexa `/admin`, `/login`, `/signup`, `/onboarding`, `/demo`,
  `/api/`); OG dinámica por tienda (`app/[slug]/opengraph-image/route.js`).
- PWA: `public/sw.js` (`NetworkOnly` en HTML, `CacheFirst` en assets; bump de
  `CACHE_NAME` ante cambios) + `manifest.json` + banner de instalación. Imágenes
  `next/image` webp/avif.

**UI / UX**
- Componentes `Skeleton` (token `--muted`, dark-aware) y `EmptyState` en los
  `loading.jsx` de catálogo y admin. Fuente Inter (`next/font`).

## Seguridad

- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` en
  `next.config.mjs`.
- RLS store-scoped + `service_role` server-side tras auth + ownership.
- Allowlist de columnas públicas en `/[slug]` (evita fuga de PII a anónimos).
- Precios reautenticados server-side; el cliente nunca define montos.
- Rate limit en checkout (`lib/rate-limit.js`).

## Tests y CI

- 11 suites / 127 casos, runner nativo `node:test` sin dependencias: `checkout`,
  `checkout-core`, `checkout-security`, `coupons`, `domains`, `orders`,
  `payments`, `plans`, `rate-limit`, `sku-validation`, `tenant`. Todos PASS.
- CI (`.github/workflows/ci.yml`): `lint` + `test` + `build`, sin push. El `build`
  no necesita secretos: si el repo no define las vars públicas de Supabase, el
  workflow usa valores dummy seguros solo para CI (el build no consulta la BD en build-time).

## Herramientas de base de datos

- `scripts/run-sql.mjs`: ejecuta SQL (inline o `.sql`) vía **Management API** (rol
  `postgres`, DDL completo).
- `scripts/apply-migrations.mjs`: aplica migraciones versionadas listadas en el
  script y ejecuta verificaciones de integridad (columnas, políticas, índices).
- `supabase/`: `schema.sql`, 17 migraciones (`20240101000001` … `20240101000017`)
  y scripts `FIX_*.sql`.

## Estructura del proyecto

```
hyuk/
├─ app/
│  ├─ login/{actions.js,LoginForm.jsx,page.jsx}  signup/page.jsx  auth/callback/route.js
│  ├─ [slug]/ page.jsx CatalogView.jsx loading.jsx not-found.jsx opengraph-image/route.js
│  ├─ admin/ {analytics,categories,customers,customize,orders,products,settings,
│  │         ai-importer,flyer-maker,qr-generator,marketing}/page.jsx layout.jsx loading.jsx
│  ├─ api/ checkout/create-preference billing/portal orders/[id] orders/public/[id]
│  │       products/skus analytics/track db/status store-data upload
│  │       ai/{generate-description,generate-theme,scan-menu} webhooks/payment auth/callback
│  ├─ pricing│contact│privacy│terms│demo│onboarding / page.jsx  sitemap.js  layout.jsx  page.jsx
├─ components/
│  ├─ admin/ {AdminHeader,controls/*,ImageUploader,PhonePreview,ProductModal,
│  │          PrintTicketModal,PlanUpgradeCard}  billing/SubscribeButton.jsx
│  ├─ catalog/ {CartDrawer,CategoryNav,HeaderVariant,ProductCardVariant,ProductGrid,
│  │            ProductModal,PromoBanner,SocialFooter,FloatingCartButton}
│  ├─ theme/ {AppThemeProvider,ThemeProvider,ThemeScope,ThemeToggle}  ui/{Skeleton,EmptyState}
│  ├─ LandingPage.jsx  PWAProvider.jsx  PWAInstallBanner.jsx
├─ lib/
│  ├─ ai/gemini.js ai-guard.js analytics.js checkout-core.js coupons.js customers.js
│  ├─ inventory.js orders.js tenant.js db-status.js rate-limit.js sku-validation.mjs
│  ├─ payments.js stripe.js domains/index.js print/thermal-ticket.js theme/defaults.js
│  └─ supabase/{client,server,service-role}.js config/plans.js
├─ supabase/ schema.sql migrations/20240101000001..17 FIX_*.sql
├─ scripts/ run-sql.mjs apply-migrations.mjs check-env.mjs
├─ tests/ {checkout,checkout-core,coupons,plans,domains,sku-validation}.test.mjs
├─ public/ favicon.svg icon-192.png icon-512.png manifest.json robots.txt sw.js
├─ app/globals.css  tailwind.config.js  postcss.config.js  next.config.mjs
├─ middleware.js  .eslintrc.json  jsconfig.json  vercel.json
└─ package.json  .github/workflows/ci.yml
```

## Estado actual

**Implementado**
- Auth, multi-tenant + RLS, aislamiento por `store_id`.
- Catálogo público por slug (ISR 60 s), OG dinámica, not-found.
- Admin completo: analytics, categorías, clientes, pedidos (kanban/list, sonido,
  ticket térmico), productos + SKUs/stock, personalización visual, IA, QR, flyer,
  settings, marketing.
- Checkout por WhatsApp + Stripe (suscripciones + Customer Portal + webhook).
- Cupones, inventario por SKU, analytics de funnel, IA (descripciones, escaneo de
  menú, temas). Onboarding + trial 28 días + planes/límites + pricing + contacto.
- SEO (metadata dinámico, sitemap, robots, OG), PWA (sw, manifest), tema Light/Dark
  neutral + personalización por tienda.
- Tests (11 suites / 127 casos PASS) + CI (lint + test + build).

**En desarrollo / pendiente**
- Tests e2e en CI (hoy solo unitarios `node:test`).
- Motor de notificaciones proactivas (email/SMS/push): los avisos actuales son vía
  WhatsApp manual y sonido/flash en el admin.
- Mercado Pago (detectado en `lib/payments.js` pero no conectado).
- Multi-idioma (interfaz en español).
- Onboarding asistido / soporte premium para Enterprise (por confirmar vía
  `soporte@hyuk.app`).

## Desarrollo

- `npm run build:clean` si `next build` y `next start` comparten `.next` (causa
  500/MIME en assets).
- El dark usa carbon neutro (R≈G≈B) en `app/globals.css`; el `:root` Light no se
  toca.
- Para operar la BD: `node scripts/run-sql.mjs "SELECT …"` o
  `node scripts/apply-migrations.mjs` (requieren `SUPABASE_ACCESS_TOKEN` en
  `.env.local`). Se ejecutan como `postgres` (bypassan RLS): usar transacciones e
  idempotencia.