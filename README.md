# 🚀 SAS - Catálogo y Menú Digital con Pedidos a WhatsApp

Plataforma SaaS de catálogo digital con personalización extrema, construida con Next.js 14, Tailwind CSS y Supabase.

## ✨ Características Principales

### 🎨 Personalización Extrema
- **Colores**: Selectores de color hex, presets profesionales (Elegante, Comida Rápida, Botánica, Neón, Minimalista)
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

## 🗄️ Estructura de Base de Datos

### Tabla `profiles` (extendida con settings JSONB)
```sql
settings: {
  theme: { primaryColor, secondaryColor, backgroundColor, ... },
  layout: { productGrid, headerStyle, categoryStyle, productCardStyle },
  banner: { imageUrl, tagline, showAnnouncementBar, announcementText },
  whatsapp_checkout: { customMessageHeader, askForAddress, ... }
}
```

### Tablas adicionales
- `categories`: Categorías de productos
- `products`: Productos con precios, badges y disponibilidad
- `product_options`: Variantes y opciones de productos

## 🚀 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Copiar .env.local y configurar:
NEXT_PUBLIC_SUPABASE_URL=tu-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key

# 3. Ejecutar el esquema SQL en Supabase
# Ejecutar supabase/schema.sql en el SQL Editor

# 4. Iniciar el servidor de desarrollo
npm run dev
```

## 📁 Estructura del Proyecto

```
├── app/
│   ├── [slug]/              # Vista pública del catálogo
│   │   ├── page.jsx         # Server component con datos
│   │   └── CatalogView.jsx  # Client component con UI
│   ├── admin/
│   │   └── customize/       # Panel de personalización
│   │       └── page.jsx     # Split-screen editor
│   ├── globals.css          # Estilos globales
│   ├── layout.jsx           # Layout raíz
│   └── page.jsx             # Landing page
├── components/
│   ├── admin/
│   │   ├── controls/        # Controles de personalización
│   │   │   ├── ColorControls.jsx
│   │   │   ├── LayoutControls.jsx
│   │   │   ├── BannerControls.jsx
│   │   │   └── WhatsAppControls.jsx
│   │   └── PhonePreview.jsx # Simulador iPhone
│   ├── catalog/
│   │   ├── HeaderVariant.jsx    # 4 estilos de header
│   │   ├── CategoryNav.jsx      # 4 estilos de categorías
│   │   ├── ProductGrid.jsx      # 5 layouts de grid
│   │   ├── ProductCardVariant.jsx # 4 estilos de tarjetas
│   │   └── CartDrawer.jsx       # Drawer de checkout
│   └── theme/
│       └── ThemeProvider.jsx    # Motor de temas dinámico
├── context/
│   └── CartContext.jsx      # Estado global del carrito
├── lib/
│   ├── supabase/            # Clientes Supabase
│   ├── theme/
│   │   └── defaults.js      # Configuración por defecto
│   └── whatsapp/
│       └── checkout.js      # Generador de mensajes WhatsApp
├── supabase/
│   └── schema.sql           # Esquema completo de BD
└── middleware.js            # Protección de rutas admin
```

## 🎯 Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/[slug]` | Catálogo público de la tienda |
| `/admin/customize` | Panel de personalización |
| `/login` | Autenticación |

## 🛠️ Tecnologías

- **Next.js 14** (App Router)
- **Tailwind CSS** (con variables CSS dinámicas)
- **Supabase** (Auth, Database, Storage)
- **Framer Motion** (Animaciones)
- **Lucide React** (Iconos)

## 📝 Notas de Producción

1. **Supabase Storage**: Reemplazar la subida de imágenes local por Supabase Storage
2. **Autenticación**: Implementar flujo completo de login/registro
3. **Guardado**: Conectar el botón "Guardar" con la actualización del settings JSONB
4. **SEO**: Añadir sitemap, robots.txt y metadatos adicionales
5. **Analytics**: Integrar seguimiento de visitas y pedidos