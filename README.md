# 🚀 HYUK — Catálogo Digital con Pedidos (Next.js 14 + Supabase)

Catálogo/menu digital SaaS para pymes: cada dueño personaliza **todo** el aspecto visual
y la estructura de su tienda sin tocar código, con preview en tiempo real.

- **Stack**: Next.js 14 (App Router), Tailwind CSS 3, Supabase (Postgres + Auth + Storage),
  Framer Motion, Lucide, shad‑style utilities + tailwind‑merge.
- **Tema global**: Light / Dark **único** (no hay modo "Neón"; el Neón es solo uno de los 5
  presets de color de la tienda). Dark = **carbón neutro estilo Gemini** (R ≈ G ≈ B, sin azul).
- **Build verificado**: ✅ 29/29 páginas estáticas · 0 errores · lint 0 errors.

---

## 📦 Estado local (LEER ANTES DE TOCAR — CRÍTICO PARA EL AGENTE)

Hay trabajo **local sin confirmar** en este checkout:

- `git status` muestra ~34 archivos modificados → corresponde a la integración del
  tema Light/Dark carbon + correcciones de `globals.css`/`PhonePreview`/`middleware`/`sw.js`.
- `git stash list` → `stash@{0}: WIP-preserve-theme-changes-before-prompt-16` (preservado).
- **NO está hecho `git commit` ni `git push`** (HEAD = `042f058 refactor(theme): remove neon and finalize light dark system`).
- Todo el trabajo del Prompt 16 está sobre la rama `main` y **NO está commiteado**.

Reglas del agente para este repo:
- ❌ No hacer `git commit`, no hacer `git push`.
- ❌ No modificar lógica de Supabase, Stripe, pedidos, autenticación ni aislamiento multi‑tenant.
- ❌ No cambiar el modo claro salvo lo estrictamente necesario.
- ✅ Preservar cambios locales no relacionados y el stash.

> Tras una build inconsistente (build + start compartiendo `.next`), arrancar limpio:
> ```bash
> npm run build:clean   # borra .next y recompila → evita el 500/MIME de _next/static
> ```

---

## 🏃 Comandos rápidos

```bash
npm run dev          # http://localhost:3000
npm run build        # build de producción
npm run start        # servidor de producción (next start)
npm run lint         # next lint  (max-warnings 20)
npm run check:env    # valida variables de entorno
npm test             # tests unitarios (node --test, sin deps)
npm run test:ci      # runner CI (node --test, mismas suites)
```

---

## 🛠 Stack y dependencias (las relevantes)

| Tecnología | Nota |
|---|---|
| Next.js 14.2 / React 18.3 | App Router; Server + Client components; generación estática de /[slug] y /admin. |
| Tailwind 3.4 + tailwind‑merge | `darkMode:'class'`. En `tailwind.config.js` los colores son **funciones `token('--x')`** con soporte real de opacidad (`bg-card/50`, `border-secondary/10`) vía `color-mix(in srgb,...)`. No usar valores planos (`var(--x)` directo rompe la opacidad). |
| next‑themes | ✅ Única fuente de la clase `.dark` sobre `<html>` (`AppThemeProvider`). Persistencia en `localStorage` clave `hyuk-theme`. |
| @supabase/ssr + supabase‑js | Auth (cookie 1 año, renovada por middleware), Postgres + RLS, Storage. |
| @supabase/ssr service_role | `lib/supabase/service-role.js` — cliente server‑side solo con `SUPABASE_SERVICE_ROLE_KEY`. |
| Stripe 14 + `lib/payments.js` | **Provider‑agnostic**: detecta `STRIPE_SECRET_KEY` (Stripe) o `MP_ACCESS_TOKEN` (Mercado Pago); si falta ninguno → *graceful fallback* al checkout por WhatsApp. No existe la ruta `/api/checkout/create-preference` en `main`; el checkout real es WhatsApp (`lib/whatsapp/checkout.js`). |
| @google/generative-ai | Features de IA: `lib/ai/gemini.js`, panel `AiCustomizePanel`. Requiere `GEMINI_API_KEY`. |
| zod / pino / qrcode.react / @sentry/nextjs | validaciones, logs estructurados, QR de pedido, tracking (activar con `SENTRY_DSN`). |
| Vercel | Hosting. Build: `next build`, output `.next`. Next.js gestiona `/_next/static` — **no** declarar `outputDirectory` ni reescribir `/_next` en `vercel.json`. |

---

## 🎨 Motor de temas Light / Dark carbon (Gemini)

**Dos capas separadas** (evita FOUC/hidratación):

1. **Global** (`components/theme/AppThemeProvider.jsx` + `app/globals.css`): Light/Dark, clase `.dark` en `<html>`.
2. **Tienda** (`components/theme/ThemeProvider.jsx` → `ThemeScope.jsx`): inyecta las variables del `settings` del dueño (`--primary`, `--background`, `--card-bg`, …). **Solo en el árbol del catálogo**.

⚠️ Clave de aislamiento: la página `/admin/customize` monta `ThemeProvider` con **`applyCatalogTheme={false}`**, por lo que el panel admin sigue el **tema global** (`.dark`) y el preview del catálogo pinta con estilos inline de `settings.theme` — no compiten.

Tokens semánticos centralizados en `app/globals.css` (cambian solos bajo `.dark`):
| Token | Light `:root` | Dark `.dark` (carbon Gemini) |
|---|---|---|
| `--background` | `#FAFAFA` | `#131314` |
| `--card-bg` / `--surface` | `#FFFFFF` / `#FFFFFF` | `#1E1F20` |
| `--text-color` | `#0F172A` | `#E3E3E3` |
| `--muted` | `#F4F4F5` | `#282A2C` |
| `--secondary` | `#0F172A` | `#9AA0A6` (gris neutral; reemplazó el slate azulado `#94A3B8`) |
| `--border` | `rgba(15,23,42,.12)` | `rgba(227,227,227,.14)` |
| `--input` | `#FFFFFF` | `#282A2C` |
| `--preview-canvas` / `--preview-dot` | `#F8F9FA` / `#D1D5DB` | `#1E1F20` / `#3C3C3C` |

Guía rápida para quien escriba estilos:
- En dark usar los tokens semánticos (`bg-card`, `bg-surface`, `border-secondary/10`, `bg-muted`), **nunca** `slate-*` (produce tinte azulado).
- El preview del teléfono (`components/admin/PhonePreview.jsx`) usa `var(--preview-canvas)`/`var(--preview-dot)`; **no hardcodear** `#f8f9fa`. El canvas `#1E1F20` es un poco más claro que `--background` `#131314` para que el bezel negro del iPhone contraste.
- El catálogo dentro del teléfono (`theme.*`) NO tocar — usa `settings.theme`.

---

## 📁 Estructura (`app/` / `components/` / `lib/` / `public/`)

```
app/
 ├─ api/{orders,store-data,upload}/route.js        # Server Actions + API REST
 ├─ auth/callback/route.js                        # OAuth callback (Supabase)
 ├─ [slug]/      page.jsx + CatalogView.jsx      # catálogo público por slug
 │               loading.jsx + not-found.jsx + opengraph-image/route.js
 ├─ admin/{customize,products,categories,orders,analytics,customers,flyer-maker,marketing,qr-generator,settings}
 │          /page.jsx  +  layout.jsx  +  loading.jsx
 ├─ demo/, login/(LoginForm.jsx,actions.js,page.jsx), signup/, onboarding/
 ├─ pedido/[id]/page.jsx                          # ticket de pedido
 ├─ pricing, privacy, terms, contact
 ├─ globals.css          # ← tokens del tema global (Light/Dark) — editar con cuidado
 └─ layout.jsx           # AppThemeProvider + ThemeProvider + PWAProvider + CartProvider
components/
 ├─ theme/{AppThemeProvider,ThemeProvider,ThemeScope,ThemeToggle}.jsx   # motor de temas
 ├─ catalog/{HeaderVariant,CategoryNav,ProductGrid,ProductCardVariant,CartDrawer,
 │           FloatingCartButton,ProductModal,PromoBanner,SocialFooter}.jsx
 ├─ admin/PhonePreview.jsx                       # simulador iPhone (canvas dark-aware)
 ├─ admin/controls/{ColorControls,LayoutControls,BannerControls,WhatsAppControls,
 │                   SocialControls,AiCustomizePanel}.jsx
 ├─ LandingPage.jsx, PWAInstallBanner.jsx, PWAProvider.jsx
context/CartContext.jsx          # carrito: key única = id+opciones; cartCount/Total vía useMemo
lib/
 ├─ supabase/{client,server,service-role}.js      # browser / server / admin (service_role)
 ├─ theme/defaults.js                             # DEFAULT_SETTINGS + 5 presets + 6 fuentes + 4 bordes + layouts
 ├─ whatsapp/checkout.js                          # mensaje estructurado con emojis, totals
 ├─ payments.js                                   # Stripe/MP/WhatsApp-fallback; SUBSCRIPTION_PLANS
 ├─ stripe.js, tenant.js, db-status.js, orders.js, customers.js, inventory.js,
 │   coupons.js, analytics.js, ai/gemini.js, print/thermal-ticket.js, domains/index.js
supabase/schema.sql                              # Postgres: profiles, categorías, productos, product_options, orders
scripts/   {check-env,apply-migrations,diagnose-db,fix-db-service-role,run-sql,setup-supabase}
public/   sw.js (PWA), manifest.json, robots.txt, favicon.svg, icon-192/512.png
middleware.js     # auth: /admin/* → /login (excluye _next, api, static, auth)
vercel.json       # headers + redirects
```

### Modelo de datos clave (`supabase/schema.sql`)
- `profiles` (tienda/owner, slug, settings JSONB, social_links). RLS: escritura solo Owner.
- `categories` / `products` / `product_options` (variantes). Triggers `updated_at`; índices por `slug` / `store_id` / `category_id`.
- `orders`: POST vía `app/api/orders/route.js`; estado por RPC `set_order_status` (Prompt 14) con *double-submit guard* y loading UI.
- Multi‑tenant aislado por `store_id`; catálogo público resuelve la tienda por `slug`/`domain` (`lib/tenant.js`, `lib/domains/`).

### Presets y configuración (`lib/theme/defaults.js`)
- **5 presets de color**: Elegante, Comida Rápida, Botánica, Minimalista — y **Neón** (como *preset de color*, no como modo).
- 6 fuentes Google, 4 radios de borde, 5 layouts de producto, 4 headers, 4 categorías, 4 cards.

---
## 🔐 Auth & multi‑tenant (NO TOCAR)
`middleware.js` (Next.js Edge) fuerza auth en `/admin/*` → 307 a `/login?redirect=...` si no hay sesión.
`@supabase/ssr` mantiene sesión con cookie de 1 año renovada por middleware.
Multi‑tenant: `/[slug]` resuelve tienda por slug; wildcard `*.hyuk.app` → Vercel (`vercel.json`).
**No modificar** la lógica de pedidos/Supabase/Stripe/auth/aislamiento.

## 🌐 Rutas clave
`/` · `/demo` · `/login` `/signup` `/onboarding` · `/[slug]` (catálogo público) ·
`/pedido/[id]` (ticket) · `/pricing` `/contact` `/privacy` `/terms` ·
`/admin` · `/admin/customize` (editor split-screen) ·
`/admin/{products,categories,orders,analytics,customers,flyer-maker,marketing,qr-generator,settings}` ·
`/api/{orders,store-data,upload}` · `/auth/callback`.

---

## 🔧 Debugging conocido (resuelto / verificación)

### `/_next/static/...` devolvía 404/500 con `text/html` → errores MIME
- **Causa real**: `.next/server/vendor-chunks/next.js` faltante (build + start compartiendo `.next` corrupto). El handler de *not found* lanzaba `Cannot find module …` → Next respondía **500 + `Content-Type: text/html`** a una petición `.css`/`.js`.
- **Fix aplicado**: rebuild limpio (`rm -rf .next && npm run build`). `middleware.js` matchers ampliados a `_next/` entero + `api/`. `vercel.json` no declara `outputDirectory`. `public/sw.js` (`hyuk-v5`): `NetworkOnly` para auth/`_next`/api; `CacheFirst` para assets estáticos.
- **Verificado en runtime** (`next start`): CSS real → `200 text/css`; JS → `200 application/javascript`; asset inexistente → `404` (nunca 500+HTML); `/`, `/login`, `/admin` → `200`/`307` según sesión, 0 errores en log.

### PWA `public/sw.js`
- `NetworkOnly` para `/`, `/login`, `/signup`, `/admin/*`, `/api/*`, `_next/webpack-hmr`, `_next/data`, `_next/static` (nunca cachear HTML autenticado).
- `CacheFirst` + *stale‑while‑revalidate* para CSS/JS/fuentes/imágenes.
- `CACHE_NAME`: `hyuk-v5` (hacer *bump* si se rompe la caché de un build previo).

### Otros
- **Rate limit Supabase**: `/signup` puede 429 con registros masivos (limite de Supabase, no es bug).
- **Framer Motion**: ocasional `NotFoundError: Failed to execute 'removeChild'` al desmontar (warning menor, no crítico).
- Si en `/admin/customize` el canvas se ve blanco en dark → comprobar que `PhonePreview.jsx` usa `var(--preview-canvas)`/`var(--preview-dot)` y que `globals.css` define los tokens bajo `:root` y `.dark`.

---

## 📦 Deploy en Vercel

Env vars (Production/Preview/Development):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, y opcionales `STRIPE_SECRET_KEY`, `MP_ACCESS_TOKEN`, `SENTRY_DSN`.

Flujo:
1. Correr `supabase/schema.sql` en el SQL Editor (triggers, RLS, seed).
2. Supabase Auth → URL Configuration: Site URL + redirects `/auth/callback`, `/admin/customize` (locales y prod).
3. En Vercel: Framework preset `Next.js`, Build `next build`, Output `.next`.
4. Post‑deploy: login persistente (1 año) → `/admin`; registrar un pedido de prueba por WhatsApp en `/[slug]`; `npm run check:env`.

---

## ✅ Estado verificado (checklist)
- [x] 29/29 páginas build estáticas · 0 errores · lint 0 errors (warnings preexistentes, no introducidos aquí).
- [x] Tema global Light/Dark carbon Gemini (R≈G≈B, sin azul) — `:root` Light intacto.
- [x] `/admin/customize` preview: canvas `#1E1F20` + dots `#3C3C3C` en dark (antes `#f8f9fa` blanco).
- [x] `/_next/static` CSS/JS servidos con MIME correcto (`200 text/css` / `200 application/javascript`); assets inexistentes → 404 real.
- [x] Middleware auth: 307 → `/login`; matchers excluyen `_next/`, `api/`, assets de `public/`.
- [x] Catálogo dentro del teléfono usa `settings.theme` — **no modificado**.
- [x] Skeleton loaders dark-aware (`Skeleton.jsx`) en los boundaries `loading.jsx` (ya no usan `zinc-800`/`gray-200` hardcodeados).
- [x] `EmptyState.jsx` reutilizable (dark-aware) usado en `ProductGrid` (catálogo) y `/admin/analytics` (sin datos todavía).
- [x] Tests (`npm test` / `npm run test:ci`, runner nativo `node:test`, sin deps): **6 suites → 77/77 PASS** (`checkout`, `checkout-core`, `coupons`, `plans`, `domains`, `sku-validation`).
- [x] Integridad de datos en `/admin/analytics`: eliminados los badges de tendencia **falsos** (`+12%`, `+8%`, `+5%`) que inventaban crecimiento; se muestran solo métricas reales.
- [x] Lint: 15 → **14 warnings** (0 errores) tras estabilizar `demoProducts` con `useMemo` en `CatalogView` (evita recálculo por render).
- [x] CI local (`.github/workflows/ci.yml`): `lint` + `test` + `build` (sin push; requiere secrets de Supabase para el build).
- [ ] Tests e2e (por añadir en CI) · [ ] Notificaciones email/SMS de pedidos · [ ] Multi‑idioma · [ ] Límites por plan.

---

> 📝 Cambios de este README: se reescribe el documento (sin commitear, sin push) para reflejar el estado **real** del repo: 29 páginas (no 13), tema Light/Dark único sin modo "Neón", token engine real, árbol de carpetas actualizado, y debugging del bug MIME documentado. Preserva el stash y los 34 archivos locales sin modificados.
