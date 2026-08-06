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