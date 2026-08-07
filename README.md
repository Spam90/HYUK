# 🚀 HYUK - Catálogo y Menú Digital con Pedidos a WhatsApp

Plataforma SaaS de catálogo digital con **personalización extrema**, construida con **Next.js 14**, **Tailwind CSS** y **Supabase**.

Cada dueño de negocio puede modificar absolutamente todo el aspecto visual y la estructura de su catálogo sin tocar una sola línea de código, viendo los cambios en **tiempo real**.

---

## ✨ Características Principales

### 🎨 Personalización Extrema
- **Colores**: Selectores de color hex, 5 presets profesionales (Elegante, Comida Rápida, Botánica, Neón, Minimalista)
- **Tipografías**: 6 fuentes de Google Fonts (Inter, Poppins, Montserrat, Playfair Display, Outfit, Space Grotesk)
- **Bordes**: 4 niveles de redondeo (Recto, Suave, Redondeado, Píldora)
- **Modos**: Claro, Oscuro y Neón

### 📐 Layouts Flexibles
- **Productos**: Lista, Rejilla 2/3 columnas, Tarjetas Grandes, Scroll Horizontal
- **Header**: Minimal, Banner Grande, Logo Centrado, Tarjeta Flotante
- **Categorías**: Píldoras Scroll, Tabs Subrayados, Barra Flotante, Grid de Iconos
- **Tarjetas**: Borde Minimal, Sombra Moderna, Glassmórfico, Fila Compacta

### 💬 Checkout WhatsApp
- Mensaje personalizado con emojis y formato estructurado
- Campos configurables (nombre, dirección, método de pago)
- Métodos de entrega personalizables
- Opciones de pago editables

### 📱 Vista Previa en Tiempo Real
- Simulador de iPhone integrado
- Cambios reflejados al instante
- Split-screen layout estilo Shopify/Canva

### 🔐 Autenticación
- Registro de usuarios con Supabase Auth
- Login con sesión persistente
- Protección de rutas de administración
- Perfil de tienda asociado al usuario

---

## 🗄️ Estructura de Base de Datos

### Tabla `profiles` (con settings JSONB)
La tabla `profiles` se crea automáticamente y almacena toda la configuración de personalización en formato JSONB:

```json
settings: {
  "theme": {
    "primaryColor": "#10B981",
    "secondaryColor": "#0F172A",
    "backgroundColor": "#FAFAFA",
    "cardBackgroundColor": "#FFFFFF",
    "textColor": "#0F172A",
    "accentColor": "#F59E0B",
    "borderRadius": "rounded-2xl",
    "fontFamily": "font-sans",
    "mode": "light"
  },
  "layout": {
    "productGrid": "grid-2-col",
    "headerStyle": "banner-large",
    "categoryStyle": "pills-scroll",
    "productCardStyle": "modern-shadow"
  },
  "banner": {
    "imageUrl": "",
    "tagline": "¡Los mejores productos a un clic!",
    "showAnnouncementBar": true,
    "announcementText": "🚚 Envíos gratis en pedidos mayores a $1,000"
  },
  "whatsapp_checkout": {
    "customMessageHeader": "🛒 *¡NUEVO PEDIDO DE CLIENTE!*",
    "askForAddress": true,
    "askForPaymentMethod": true,
    "paymentOptions": ["Efectivo", "Transferencia / Zelle", "Tarjeta al recibir"],
    "requireClientName": true,
    "deliveryMethods": ["A domicilio", "Retiro en local"]
  }
}
```

### Tablas adicionales
| Tabla | Descripción |
|-------|-------------|
| `categories` | Categorías de productos con iconos e imágenes |
| `products` | Productos con precios, badges, disponibilidad y opciones |
| `product_options` | Variantes y opciones de productos (tamaños, extras, etc.) |

Todas las tablas incluyen:
- Triggers para actualizar `updated_at`
- Índices para rendimiento
- Políticas RLS (Row Level Security)
- Políticas para lectura pública y gestión del propietario

---

## 🚀 Instalación

### Requisitos previos
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Vercel](https://vercel.com) (para deploy)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Spam90/HYUK.git
cd HYUK

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crear archivo .env.local en la raíz:
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# 4. Ejecutar el esquema SQL en Supabase
# Abrir el SQL Editor en https://supabase.com/dashboard
# Pegar el contenido de supabase/schema.sql y ejecutar

# 5. Iniciar el servidor de desarrollo
npm run dev
```

### Deploy en Vercel

```bash
# 1. Configurar el proyecto en Vercel
# Framework Preset: Next.js
# Build Command: npm run build
# Output Directory: .next

# 2. Agregar variables de entorno en Vercel
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# 3. Conectar el repositorio y hacer deploy
```

---

## 📁 Estructura del Proyecto

```
├── app/
│   ├── [slug]/                    # Vista pública del catálogo
│   │   ├── page.jsx               # Server component (datos de Supabase)
│   │   └── CatalogView.jsx        # Client component (UI interactiva)
│   ├── admin/
│   │   ├── page.jsx               # Dashboard del administrador
│   │   └── customize/
│   │       └── page.jsx           # Panel de personalización split-screen
│   ├── demo/
│   │   └── page.jsx               # Demo funcional con datos de ejemplo
│   ├── login/
│   │   └── page.jsx               # Página de inicio de sesión
│   ├── signup/
│   │   └── page.jsx               # Página de registro
│   ├── globals.css                # Estilos globales y variables CSS
│   ├── layout.jsx                 # Layout raíz con metadatos
│   └── page.jsx                   # Landing page
├── components/
│   ├── admin/
│   │   ├── PhonePreview.jsx       # Simulador de iPhone
│   │   └── controls/
│   │       ├── ColorControls.jsx  # Colores, tipografías, bordes, modos
│   │       ├── LayoutControls.jsx # Layouts y retículas
│   │       ├── BannerControls.jsx # Banners y headers
│   │       └── WhatsAppControls.jsx # Configuración de checkout
│   ├── catalog/
│   │   ├── HeaderVariant.jsx      # 4 estilos de header
│   │   ├── CategoryNav.jsx        # 4 estilos de navegación
│   │   ├── ProductGrid.jsx        # 5 layouts de grid
│   │   ├── ProductCardVariant.jsx # 4 estilos de tarjetas + variantes
│   │   └── CartDrawer.jsx         # Drawer de checkout WhatsApp
│   └── theme/
│       └── ThemeProvider.jsx      # Motor de temas dinámico (CSS vars)
├── context/
│   └── CartContext.jsx            # Estado global del carrito
├── lib/
│   ├── supabase/
│   │   ├── client.js              # Cliente Supabase (browser)
│   │   └── server.js              # Cliente Supabase (server)
│   ├── theme/
│   │   └── defaults.js            # Configuración por defecto y presets
│   └── whatsapp/
│       └── checkout.js            # Generador de mensajes WhatsApp
├── public/
│   ├── favicon.svg                # Favicon de la aplicación
│   └── robots.txt                 # Configuración SEO
├── scripts/
│   └── setup-supabase.js          # Script para crear tablas en Supabase
├── supabase/
│   └── schema.sql                 # Esquema completo de BD
├── middleware.js                  # Protección de rutas admin
└── vercel.json                    # Configuración de deploy Vercel
```

---

## 🎯 Rutas Principales

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing page | Público |
| `/[slug]` | Catálogo público de la tienda | Público |
| `/demo` | Demo funcional | Público |
| `/login` | Iniciar sesión | Público |
| `/signup` | Crear cuenta | Público |
| `/admin` | Dashboard del administrador | Protegido |
| `/admin/customize` | Panel de personalización | Protegido |

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| **Next.js 14** | App Router, Server Components, SEO |
| **Tailwind CSS** | Estilos con variables CSS dinámicas |
| **Supabase** | Autenticación, Base de datos Postgres, RLS |
| **Framer Motion** | Animaciones y transiciones suaves |
| **Lucide React** | Iconos modernos |
| **Vercel** | Deploy y hosting |

---

## 📝 Notas de Producción

1. **Supabase Storage**: Reemplazar la subida de imágenes local (FileReader) por Supabase Storage para banners y productos
2. **Guardado persistente**: Conectar el botón "Guardar" del panel de personalización con la actualización del settings JSONB
3. **CRUD completo**: Implementar gestión de productos y categorías en el dashboard admin
4. **SEO**: Añadir sitemap.xml y metadatos por tienda
5. **Analytics**: Integrar seguimiento de visitas y pedidos

---

## 📄 Licencia

Este proyecto es propietario. Todos los derechos reservados.

---

## 📊 Estado Actual del Proyecto

### ✅ Módulos completados
- **Autenticación completa**: Registro, login, logout con Supabase Auth
- **Panel de personalización**: Editor visual split-screen con vista previa en tiempo real
- **Gestión de productos**: CRUD completo (crear, editar, eliminar, buscar)
- **Gestión de categorías**: CRUD completo con generación automática de slugs
- **Catálogo público**: Vista por slug con temas dinámicos
- **Carrito de compras**: Context API con persistencia en sesión
- **Checkout WhatsApp**: Generador de mensajes formateados con emojis
- **Motor de temas**: Variables CSS dinámicas, 6 fuentes Google, 4 modos de borde
- **Middleware**: Protección de rutas `/admin/*` con redirección a login
- **Base de datos**: Schema completo con RLS, triggers e índices

### 📁 Archivos creados o modificados en este paso
- `app/admin/products/page.jsx` - CRUD de productos con lazy loading de Supabase
- `app/admin/categories/page.jsx` - CRUD de categorías con lazy loading de Supabase
- `app/admin/page.jsx` - Dashboard con navegación actualizada (Categorías, Productos)
- `app/admin/customize/page.jsx` - Panel de personalización con manejo de errores mejorado
- `app/login/page.jsx` - Redirección inteligente con parámetro `?redirect=`
- `app/signup/page.jsx` - Redirección inteligente después de registro
- `app/auth/callback/route.js` - Ruta de callback para confirmación de email
- `supabase/schema.sql` - Políticas RLS para profiles, fix error 406
- `public/favicon.ico` - Favicon para corregir error 404

### 🚀 Siguientes pasos recomendados / Faltantes
- **Subida de imágenes**: Implementar Supabase Storage para banners y productos
- **Gestión de opciones de producto**: CRUD de variantes/tamaños/extras
- **Dashboard de pedidos**: Ver pedidos recibidos por WhatsApp
- **Analytics**: Métricas de visitas y conversiones
- **SEO avanzado**: Sitemap.xml y metadatos por tienda
- **Notificaciones**: Email/SMS cuando llega un pedido
- **Multi-idioma**: Soporte i18n para múltiples idiomas
- **Métodos de pago**: Integración con pasarelas de pago online

### ⚠️ Errores o advertencias pendientes
- **Rate limit Supabase**: El endpoint `/signup` puede retornar 429 si se intentan muchos registros seguidos (limitación de Supabase, no es bug)
- **Framer Motion warning**: `NotFoundError: Failed to execute 'removeChild'` - Warning menor al desmontar componentes, no crítico
- **Imágenes**: Actualmente se usan URLs externas, falta implementar almacenamiento propio
- **Configuración de Supabase Auth**: Para que la confirmación de email funcione correctamente, configurar en Supabase Dashboard:
  - Site URL: `https://hyuk.vercel.app`
  - Redirect URLs: `https://hyuk.vercel.app/auth/callback`

---

## 🚀 Guía de Despliegue en Producción

### 1. Configuración de Supabase

#### Paso 1: Crear proyecto en Supabase
1. Ir a [https://supabase.com](https://supabase.com)
2. Crear una cuenta o iniciar sesión
3. Click en "New Project"
4. Elegir organización, nombre del proyecto y contraseña de la base de datos
5. Esperar 2-3 minutos mientras se crea el proyecto

#### Paso 2: Obtener credenciales de Supabase
1. En el dashboard de Supabase, ir a **Settings** (icono de engranaje) → **API**
2. Copiar los siguientes valores:
   - **Project URL** (ej: `https://xyz123.supabase.co`)
   - **anon/public key** (comienza con `eyJ...`)

#### Paso 3: Ejecutar el schema SQL
1. En Supabase, ir a **SQL Editor** (icono de base de datos en el menú lateral)
2. Click en **New query**
3. Abrir el archivo `supabase/schema.sql` del proyecto
4. Copiar **todo el contenido** del archivo
5. Pegarlo en el editor de SQL de Supabase
6. Click en **Run** (o presionar `Ctrl+Enter`)
7. Verificar que no haya errores (deberías ver "Success. No rows returned")

#### Paso 4: Configurar autenticación
1. Ir a **Authentication** → **URL Configuration**
2. Configurar:
   - **Site URL**: `https://hyuk.vercel.app` (o tu dominio personalizado)
   - **Redirect URLs**: Agregar las siguientes URLs (una por línea):
     ```
     https://hyuk.vercel.app/auth/callback
     https://hyuk.vercel.app/admin/customize
     http://localhost:3000/auth/callback
     http://localhost:3000/admin/customize
     ```

### 2. Configuración de Vercel

#### Paso 1: Preparar el repositorio
1. Subir el código a GitHub (ya debería estar sincronizado)
2. Ir a [https://vercel.com](https://vercel.com)
3. Iniciar sesión con tu cuenta de GitHub

#### Paso 2: Importar proyecto
1. Click en **Add New...** → **Project**
2. Seleccionar el repositorio `HYUK` de la lista
3. Vercel detectará automáticamente que es un proyecto Next.js

#### Paso 3: Configurar variables de entorno
1. En la sección **Environment Variables**, agregar:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: (pegar la URL de Supabase del paso 2.2)
   - **Environment**: Marcar ✅ Production, ✅ Preview, ✅ Development
   
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: (pegar la anon key de Supabase del paso 2.2)
   - **Environment**: Marcar ✅ Production, ✅ Preview, ✅ Development

#### Paso 4: Deploy
1. Click en **Deploy**
2. Esperar 2-3 minutos mientras Vercel compila y despliega
3. Una vez finalizado, verás un mensaje "Congratulations!" y la URL de tu proyecto

#### Paso 5: Verificar despliegue
1. Abrir la URL proporcionada por Vercel (ej: `https://hyuk.vercel.app`)
2. Verificar que la landing page cargue correctamente
3. Probar el flujo de registro en `/signup`
4. Verificar que el email de confirmación llegue y redirija correctamente

### 3. Configuración de Dominio Personalizado (Opcional)

Si tienes un dominio propio (ej: `mitienda.com`):

1. En Vercel, ir a **Settings** → **Domains**
2. Agregar tu dominio
3. Vercel te dará instrucciones para configurar los DNS en tu proveedor de dominio
4. Actualizar las URLs en Supabase Auth con tu nuevo dominio

### 4. Verificación Post-Despliegue

- [ ] Landing page carga correctamente
- [ ] Registro de usuario funciona
- [ ] Email de confirmación llega y redirige correctamente
- [ ] Login funciona
- [ ] Panel de personalización carga
- [ ] CRUD de categorías funciona
- [ ] CRUD de productos funciona
- [ ] Catálogo público se muestra correctamente
- [ ] Carrito de compras funciona
- [ ] Generación de pedido por WhatsApp funciona

---

## 📊 Estado Actual del Proyecto

### ✅ Módulos completados
- **Landing Page comercial**: Hero, features, presets, pricing, CTA, footer
- **Autenticación completa**: Registro, login, logout, confirmación de email
- **Panel de personalización**: Editor visual split-screen con vista previa en tiempo real
- **Gestión de productos**: CRUD completo con búsqueda y filtros
- **Gestión de categorías**: CRUD completo con generación de slugs
- **Catálogo público**: Vista por slug con temas dinámicos
- **Carrito de compras**: Context API con persistencia en sesión
- **Checkout WhatsApp**: Generador de mensajes formateados con emojis
- **Motor de temas**: Variables CSS dinámicas, 6 fuentes Google, 4 modos de borde
- **SEO dinámico**: Metadatos por tienda, Open Graph, Twitter Cards
- **Middleware**: Protección de rutas `/admin/*` con redirección a login
- **Base de datos**: Schema completo con RLS, triggers e índices
- **Lazy loading**: Cliente Supabase carga solo en cliente para evitar errores de build
- **Responsive**: Todas las páginas son mobile-first

### 📁 Archivos creados o modificados en este paso
- `app/page.jsx` - Landing page comercial completa con animaciones
- `app/[slug]/page.jsx` - SEO dinámico mejorado con Open Graph y Twitter Cards
- `app/layout.jsx` - Metadatos globales actualizados
- `.env.example` - Variables de entorno documentadas
- `README.md` - Guía de despliegue completa agregada

### 🚀 Siguientes pasos recomendados / Faltantes
- **Subida de imágenes**: Implementar Supabase Storage para banners y productos
- **Gestión de opciones de producto**: CRUD de variantes/tamaños/extras
- **Dashboard de pedidos**: Ver pedidos recibidos por WhatsApp
- **Analytics**: Métricas de visitas y conversiones
- **Notificaciones**: Email/SMS cuando llega un pedido
- **Multi-idioma**: Soporte i18n para múltiples idiomas
- **Métodos de pago**: Integración con pasarelas de pago online
- **Skeleton loaders**: Estados de carga visuales mientras se obtienen datos
- **Estados vacíos mejorados**: Mensajes más amigables para categorías sin productos

### ⚠️ Errores o advertencias pendientes
- **Rate limit Supabase**: El endpoint `/signup` puede retornar 429 si se intentan muchos registros seguidos (limitación de Supabase, no es bug)
- **Framer Motion warning**: `NotFoundError: Failed to execute 'removeChild'` - Warning menor al desmontar componentes, no crítico
- **Imágenes**: Actualmente se usan URLs externas, falta implementar almacenamiento propio
- **Configuración de Supabase Auth**: Requiere configuración manual en el dashboard de Supabase (ver sección de despliegue)
