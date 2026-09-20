# HYUK â€” CatÃ¡logo digital SaaS con pedidos

CatÃ¡logo y menÃº digital multi-tenant para pymes. Cada tienda publica su catÃ¡logo
por slug/subdominio (`/[slug]`), recibe pedidos y los gestiona desde un panel de
administraciÃ³n. El tema Light/Dark de la aplicaciÃ³n es independiente de la
personalizaciÃ³n visual de cada tienda.

## Comandos

| comando | acciÃ³n |
|---|---|
| `npm run dev` | dev server en `http://localhost:3000` |
| `npm run build` | build de producciÃ³n |
| `npm run build:clean` | borra `.next` y recompila (evita el 500/MIME del build compartido) |
| `npm start` | servidor de producciÃ³n |
| `npm run lint` | `next lint --max-warnings 20` |
| `npm run check:env` | valida variables de entorno (`scripts/check-env.mjs`) |
| `npm test` Â· `npm run test:ci` | suite de tests (`node --test`, sin deps) |

## InstalaciÃ³n

```bash
npm install
npm run dev
```

Crear `.env.local` con las variables de abajo. `.env.local` estÃ¡ ignorado por git
(`.env*.local`); **nunca** se comprometen valores reales. Los scripts de BD leen
`SUPABASE_ACCESS_TOKEN` y el project-ref de `NEXT_PUBLIC_SUPABASE_URL` directamente
de `.env.local` y no imprimen secretos.

## Variables de entorno

| variable | Ã¡mbito | requisito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pÃºblica | requerida |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pÃºblica | requerida |
| `NEXT_PUBLIC_ROOT_DOMAIN` | pÃºblica | recomendado (`hyuk.app`) |
| `NEXT_PUBLIC_APP_URL` | pÃºblica | recomendado (sitemap/billing) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | requerida (admin, pricing, bypass RLS) |
| `STRIPE_SECRET_KEY` | server | opcional (pago online) |
| `STRIPE_WEBHOOK_SECRET` | server | opcional (verificaciÃ³n de webhook) |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` / `STRIPE_PRICE_PRO` | server | opcional |
| `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE` / `STRIPE_PRICE_ENTERPRISE` | server | opcional |
| `MP_ACCESS_TOKEN` | server | opcional â€” **no conectado** (solo Stripe) |
| `GEMINI_API_KEY` | server | opcional (funciones de IA) |
| `SENTRY_DSN` | pÃºblica | opcional (observabilidad) |
| `SUPABASE_ACCESS_TOKEN` | scripts | opcional (solo `scripts/*.mjs`) |
| `VERCEL_URL` | auto | leÃ­do en runtime |

## Arquitectura

- **Multi-tenant**: cada tienda es `profiles.id` (FK a `auth.users`). Las tablas de
  negocio (`orders`, `products`, `categories`, `coupons`, `customers`,
  `inventory_*`, `analytics_events`, â€¦) se aislan por `store_id`.
- **RLS**: las tablas de negocio tienen RLS activado con polÃ­ticas scoped a
  `store_id`/`auth.uid()`. El admin lee con el `service_role` tras verificar sesiÃ³n
  y ownership (evita las polÃ­ticas RLS rotas del rol autenticado).
- **Auth**: Supabase Auth, cookies de 1 aÃ±o refrescadas en middleware. Rutas
  `/login`, `/signup`, `/auth/callback`, `/onboarding`.
- **Middleware** (`middleware.js`): rewrite de subdominio â†’ `/[slug]`, redirecciÃ³n
  a `/admin` con sesiÃ³n activa, `Cache-Control: no-store` en rutas sensibles y
  exclusiÃ³n de assets (`_next/`, `api/`, `public/`) â€” previene el bug MIME de
  CSS/JS (500 `text/html` sobre URLs estÃ¡ticas).
- **CatÃ¡logo pÃºblico**: `/[slug]` (ISR 60 s), `[slug]/opengraph-image` (OG dinÃ¡mica),
  `[slug]/not-found`.
- **Admin**: `/admin/*` (analytics, categories, customers, customize, orders,
  products, settings, ai-importer, flyer-maker, qr-generator, marketing), protegido
  por sesiÃ³n.

## Temas (Light / Dark)

- **Tema global de la app**: Light/Dark **Ãºnico**. `AppThemeProvider` (next-themes)
  escribe la clase `.dark` en `<html>` y persiste la preferencia en
  `localStorage` (`hyuk-theme`). No existe un tercer modo.
- **PersonalizaciÃ³n visual por tienda**: el catÃ¡logo (y el preview de
  `/admin/customize`) se pinta con variables CSS aplicadas a un subÃ¡rbol de
  `display: contents` por `ThemeScope` (`components/theme/ThemeScope.jsx`),
  alimentado por `ThemeProvider`/`useTheme`. **No escribe en `<html>`** (se limpia
  al desmontar), asÃ­ no secuestra el Light/Dark global. Incluye paletas de color
  (`COLOR_PRESETS`), presets estructurales (`DESIGN_PRESETS`), tipografÃ­a, radios,
  layout, banner y configuraciÃ³n de WhatsApp.
- El modo oscuro usa grises carbÃ³n neutros (Râ‰ˆGâ‰ˆB, sin azul); el `:root` Light no
  se modifica (`app/globals.css`).

## Funcionalidades

**CatÃ¡logo y ventas**
- Productos, categorÃ­as, variantes y SKUs (`product_skus`, `product_options`).
- Carrito (`CartContext` + `CartDrawer`).
- Checkout por WhatsApp (`lib/whatsapp/checkout.js`): mensaje profesional con
  Ã­tems, notas, total, cupÃ³n; URL `wa.me`.

**Pedidos**
- CRUD server-side (`api/orders`, `api/orders/[id]`, `api/orders/public/[id]`).
- Integridad de precios: el total se recalcula en servidor (`lib/checkout-core.js`)
  rechazando manipulaciÃ³n de precios, cantidades, opciones o cupones.
- Estados `pending â†’ preparing â†’ ready â†’ completed` y `cancelled` (funciÃ³n
  `set_order_status`, constraint `orders_status_check`).
- Tracking pÃºblico `/pedido/[id]` con timeline de estados.
- Admin kanban/list, sonido de nuevo pedido, flash de tÃ­tulo y ticket tÃ©rmico
  (`lib/print/thermal-ticket.js`, `PrintTicketModal`).

**Inventario**
- Stock por SKU (`product_skus.stock`, CHECK `stock >= 0`); movimientos
  idempotentas (`inventory_movements`) y resumen (`product_stock_summary`).
  Descuenta en pago, revierte en cancelaciÃ³n/anulaciÃ³n.

**Cupones**
- CÃ³digos con %/fijo, expiraciÃ³n y lÃ­mite de usos; validaciÃ³n server-side.

**Analytics**
- Eventos (`page_view`, `view_product`, `add_to_cart`, `checkout_start`,
  `whatsapp_click`, `purchase`) â†’ `api/analytics/track` â†’ `analytics_events`.
- Dashboard `/admin/analytics`: funnel, ventas, ticket, clics WhatsApp, sin
  mÃ©tricas inventadas.

**IA (opcional)**
- Gemini 1.5 Flash (`GEMINI_API_KEY`): descripciones de producto, escaneo de menÃº
  desde imagen y generaciÃ³n de temas. UI `admin/ai-importer` + `AiCustomizePanel`;
  API `api/ai/{generate-description,generate-theme,scan-menu}`.

**Onboarding, planes y billing**
- Onboarding guiado (negocio â†’ primer producto â†’ compartir; slug en vivo). Trial
  de 28 dÃ­as con beneficios Pro para nuevos usuarios.
- Planes Free/Starter/Pro/Enterprise con lÃ­mites (Free: 6 productos/4 categorÃ­as,
  afectan solo la creaciÃ³n en cuentas Free sin trial). Billing online vÃ­a Stripe
  suscripciones + Customer Portal (`api/checkout/create-preference`,
  `api/billing/portal`, `SubscribeButton`, `/pricing`). Mercado Pago no conectado.
- `/contact` â†’ `soporte@hyuk.app` (Enterprise).

## SEO y PWA

- `metadata` global y dinÃ¡mico por slug (`openGraph`, `twitter cards`, keywords).
- Sitemap dinÃ¡mico (`app/sitemap.js`) con slugs de tiendas; `robots.txt` en
  `public/` (desindexa `/admin`, `/login`, `/signup`, `/onboarding`, `/demo`,
  `/api/`); OG dinÃ¡mica por tienda (`app/[slug]/opengraph-image/route.js`).
- PWA: `public/sw.js` (`NetworkOnly` en HTML, `CacheFirst` en assets; bump de
  `CACHE_NAME` ante cambios) + `manifest.json` + banner de instalaciÃ³n. ImÃ¡genes
  `next/image` webp/avif.

**UI / UX**
- Componentes `Skeleton` (token `--muted`, dark-aware) y `EmptyState` en los
  `loading.jsx` de catÃ¡logo y admin. Fuente Inter (`next/font`).

## Seguridad

- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` en
  `next.config.mjs`.
- RLS store-scoped + `service_role` server-side tras auth + ownership.
- Allowlist de columnas pÃºblicas en `/[slug]` (evita fuga de PII a anÃ³nimos).
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

- `scripts/run-sql.mjs`: ejecuta SQL (inline o `.sql`) vÃ­a **Management API** (rol
  `postgres`, DDL completo).
- `scripts/apply-migrations.mjs`: aplica migraciones versionadas listadas en el
  script y ejecuta verificaciones de integridad (columnas, polÃ­ticas, Ã­ndices).
- `supabase/`: `schema.sql`, 17 migraciones (`20240101000001` â€¦ `20240101000017`)
  y scripts `FIX_*.sql`.

## Estructura del proyecto

```
hyuk/
â”œâ”€ app/
â”‚  â”œâ”€ login/{actions.js,LoginForm.jsx,page.jsx}  signup/page.jsx  auth/callback/route.js
â”‚  â”œâ”€ [slug]/ page.jsx CatalogView.jsx loading.jsx not-found.jsx opengraph-image/route.js
â”‚  â”œâ”€ admin/ {analytics,categories,customers,customize,orders,products,settings,
â”‚  â”‚         ai-importer,flyer-maker,qr-generator,marketing}/page.jsx layout.jsx loading.jsx
â”‚  â”œâ”€ api/ checkout/create-preference billing/portal orders/[id] orders/public/[id]
â”‚  â”‚       products/skus analytics/track db/status store-data upload
â”‚  â”‚       ai/{generate-description,generate-theme,scan-menu} webhooks/payment auth/callback
â”‚  â”œâ”€ pricingâ”‚contactâ”‚privacyâ”‚termsâ”‚demoâ”‚onboarding / page.jsx  sitemap.js  layout.jsx  page.jsx
â”œâ”€ components/
â”‚  â”œâ”€ admin/ {AdminHeader,controls/*,ImageUploader,PhonePreview,ProductModal,
â”‚  â”‚          PrintTicketModal,PlanUpgradeCard}  billing/SubscribeButton.jsx
â”‚  â”œâ”€ catalog/ {CartDrawer,CategoryNav,HeaderVariant,ProductCardVariant,ProductGrid,
â”‚  â”‚            ProductModal,PromoBanner,SocialFooter,FloatingCartButton}
â”‚  â”œâ”€ theme/ {AppThemeProvider,ThemeProvider,ThemeScope,ThemeToggle}  ui/{Skeleton,EmptyState}
â”‚  â”œâ”€ LandingPage.jsx  PWAProvider.jsx  PWAInstallBanner.jsx
â”œâ”€ lib/
â”‚  â”œâ”€ ai/gemini.js ai-guard.js analytics.js checkout-core.js coupons.js customers.js
â”‚  â”œâ”€ inventory.js orders.js tenant.js db-status.js rate-limit.js sku-validation.mjs
â”‚  â”œâ”€ payments.js stripe.js domains/index.js print/thermal-ticket.js theme/defaults.js
â”‚  â””â”€ supabase/{client,server,service-role}.js config/plans.js
â”œâ”€ supabase/ schema.sql migrations/20240101000001..17 FIX_*.sql
â”œâ”€ scripts/ run-sql.mjs apply-migrations.mjs check-env.mjs
â”œâ”€ tests/ {checkout,checkout-core,coupons,plans,domains,sku-validation}.test.mjs
â”œâ”€ public/ favicon.svg icon-192.png icon-512.png manifest.json robots.txt sw.js
â”œâ”€ app/globals.css  tailwind.config.js  postcss.config.js  next.config.mjs
â”œâ”€ middleware.js  .eslintrc.json  jsconfig.json  vercel.json
â””â”€ package.json  .github/workflows/ci.yml
```

## Estado actual

**Implementado**
- Auth, multi-tenant + RLS, aislamiento por `store_id`.
- CatÃ¡logo pÃºblico por slug (ISR 60 s), OG dinÃ¡mica, not-found.
- Admin completo: analytics, categorÃ­as, clientes, pedidos (kanban/list, sonido,
  ticket tÃ©rmico), productos + SKUs/stock, personalizaciÃ³n visual, IA, QR, flyer,
  settings, marketing.
- Checkout por WhatsApp + Stripe (suscripciones + Customer Portal + webhook).
- Cupones, inventario por SKU, analytics de funnel, IA (descripciones, escaneo de
  menÃº, temas). Onboarding + trial 28 dÃ­as + planes/lÃ­mites + pricing + contacto.
- SEO (metadata dinÃ¡mico, sitemap, robots, OG), PWA (sw, manifest), tema Light/Dark
  neutral + personalizaciÃ³n por tienda.
- Tests (11 suites / 127 casos PASS) + CI (lint + test + build).

**En desarrollo / pendiente**
- Tests e2e en CI (hoy solo unitarios `node:test`).
- Motor de notificaciones proactivas (email/SMS/push): los avisos actuales son vÃ­a
  WhatsApp manual y sonido/flash en el admin.
- Mercado Pago (detectado en `lib/payments.js` pero no conectado).
- Multi-idioma (interfaz en espaÃ±ol).
- Onboarding asistido / soporte premium para Enterprise (por confirmar vÃ­a
  `soporte@hyuk.app`).

## Desarrollo

- `npm run build:clean` si `next build` y `next start` comparten `.next` (causa
  500/MIME en assets).
- El dark usa carbon neutro (Râ‰ˆGâ‰ˆB) en `app/globals.css`; el `:root` Light no se
  toca.
- Para operar la BD: `node scripts/run-sql.mjs "SELECT â€¦"` o
  `node scripts/apply-migrations.mjs` (requieren `SUPABASE_ACCESS_TOKEN` en
  `.env.local`). Se ejecutan como `postgres` (bypassan RLS): usar transacciones e
  idempotencia.