// =============================================
// HYUK - MOTOR DE PERSONALIZACIÓN
// Presets estéticos completos y defaults
// =============================================

// Presets de diseño completos de 1-clic
export const DESIGN_PRESETS = {
  'minimal-lux': {
    id: 'minimal-lux',
    name: 'Minimal Lux',
    description: 'Elegancia limpia con enfoque en fotografía',
    theme: {
      primaryColor: '#18181B',
      secondaryColor: '#71717A',
      backgroundColor: '#FAFAFA',
      cardBackgroundColor: '#F4F4F5',
      textColor: '#18181B',
      accentColor: '#D4D4D8',
      borderRadius: 'rounded-none',
      fontFamily: 'font-playfair',
      mode: 'light',
    },
    layout: {
      productGrid: 'grid-2-col',
      headerStyle: 'minimal',
      categoryStyle: 'tabs-underlined',
      productCardStyle: 'minimalist',
    },
    banner: {
      imageUrl: '',
      tagline: 'Elegancia en cada detalle',
      showAnnouncementBar: false,
      announcementText: '',
    },
  },
  'fast-casual': {
    id: 'fast-casual',
    name: 'Fast Casual',
    description: 'Energía vibrante para comida rápida',
    theme: {
      primaryColor: '#EA580C',
      secondaryColor: '#7C2D12',
      backgroundColor: '#FFF7ED',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#1C1917',
      accentColor: '#FBBF24',
      borderRadius: 'rounded-2xl',
      fontFamily: 'font-poppins',
      mode: 'light',
    },
    layout: {
      productGrid: 'grid-2-col',
      headerStyle: 'banner-large',
      categoryStyle: 'pills-scroll',
      productCardStyle: 'modern-shadow',
    },
    banner: {
      imageUrl: '',
      tagline: '¡Rápido, delicioso y a tu puerta!',
      showAnnouncementBar: true,
      announcementText: '🔥 2x1 en combos hasta el domingo',
    },
  },
  'clean-commerce': {
    id: 'clean-commerce',
    name: 'Clean Commerce',
    description: 'Comercio electrónico moderno y confiable',
    theme: {
      primaryColor: '#2563EB',
      secondaryColor: '#1E3A8A',
      backgroundColor: '#F8FAFC',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      accentColor: '#10B981',
      borderRadius: 'rounded-xl',
      fontFamily: 'font-inter',
      mode: 'light',
    },
    layout: {
      productGrid: 'grid-3-col',
      headerStyle: 'centered-logo',
      categoryStyle: 'grid-icons',
      productCardStyle: 'modern-shadow',
    },
    banner: {
      imageUrl: '',
      tagline: 'Compra fácil, recibe rápido',
      showAnnouncementBar: true,
      announcementText: '🚚 Envío gratis en pedidos +$50',
    },
  },
  'cyber-streetwear': {
    id: 'cyber-streetwear',
    name: 'Cyber / Streetwear',
    description: 'Estética urbana con neón y contraste',
    theme: {
      primaryColor: '#22D3EE',
      secondaryColor: '#A855F7',
      backgroundColor: '#09090B',
      cardBackgroundColor: '#18181B',
      textColor: '#FAFAFA',
      accentColor: '#F0ABFC',
      borderRadius: 'rounded-lg',
      fontFamily: 'font-space',
      mode: 'dark',
    },
    layout: {
      productGrid: 'horizontal-scroll',
      headerStyle: 'floating-card',
      categoryStyle: 'floating-bar',
      productCardStyle: 'glassmorphic',
    },
    banner: {
      imageUrl: '',
      tagline: 'Streetwear del futuro',
      showAnnouncementBar: true,
      announcementText: '⚡ Drops limitados cada viernes',
    },
  },
  'botanica': {
    id: 'botanica',
    name: 'Botánica',
    description: 'Natural, orgánico y fresco',
    theme: {
      primaryColor: '#16A34A',
      secondaryColor: '#14532D',
      backgroundColor: '#F0FDF4',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#14532D',
      accentColor: '#84CC16',
      borderRadius: 'rounded-3xl',
      fontFamily: 'font-montserrat',
      mode: 'light',
    },
    layout: {
      productGrid: 'cards-large',
      headerStyle: 'banner-large',
      categoryStyle: 'pills-scroll',
      productCardStyle: 'minimalist',
    },
    banner: {
      imageUrl: '',
      tagline: 'Naturaleza en tu mesa',
      showAnnouncementBar: true,
      announcementText: '🌿 Productos 100% orgánicos',
    },
  },
};

// Configuración por defecto de la tienda
export const DEFAULT_SETTINGS = {
  theme: {
    primaryColor: '#10B981',
    secondaryColor: '#0F172A',
    backgroundColor: '#FAFAFA',
    cardBackgroundColor: '#FFFFFF',
    textColor: '#0F172A',
    accentColor: '#F59E0B',
    borderRadius: 'rounded-2xl',
    fontFamily: 'font-sans',
    mode: 'light',
  },
  layout: {
    productGrid: 'grid-2-col',
    headerStyle: 'banner-large',
    categoryStyle: 'pills-scroll',
    productCardStyle: 'modern-shadow',
  },
  banner: {
    imageUrl: '',
    tagline: '¡Los mejores productos a un clic!',
    showAnnouncementBar: true,
    announcementText: '🚚 Envíos gratis en pedidos mayores a $1,000',
  },
  whatsapp_checkout: {
    customMessageHeader: '🛒 *¡NUEVO PEDIDO DE CLIENTE!*',
    askForAddress: true,
    askForPaymentMethod: true,
    paymentOptions: ['Efectivo', 'Transferencia / Zelle', 'Tarjeta al recibir'],
    requireClientName: true,
    deliveryMethods: ['A domicilio', 'Retiro en local'],
  },
  marketing: {
    showAnnouncementBar: true,
    announcementText: '🎉 ¡Usa el cupón HYUK10 para obtener 10% de descuento en tu primer pedido!',
    showPopup: false,
    popupTitle: '🎁 ¡Bienvenido a nuestra tienda!',
    popupText: 'Obtén un 10% de descuento en tu primer pedido usando el cupón HYUK10.',
    popupButtonLabel: '¡Comenzar!',
  },
};

// Presets de paletas profesionales
export const COLOR_PRESETS = [
  {
    name: 'Elegante',
    description: 'Tonos neutros y sofisticados',
    colors: {
      primaryColor: '#1E293B',
      secondaryColor: '#0F172A',
      backgroundColor: '#F8FAFC',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#1E293B',
      accentColor: '#D4AF37',
    },
  },
  {
    name: 'Comida Rápida',
    description: 'Energía y apetito',
    colors: {
      primaryColor: '#EF4444',
      secondaryColor: '#7F1D1D',
      backgroundColor: '#FEF2F2',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      accentColor: '#F59E0B',
    },
  },
  {
    name: 'Botánica / Verde',
    description: 'Fresco y natural',
    colors: {
      primaryColor: '#059669',
      secondaryColor: '#064E3B',
      backgroundColor: '#F0FDF4',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      accentColor: '#84CC16',
    },
  },
  {
    name: 'Neón / Nocturno',
    description: 'Vibrante y moderno',
    colors: {
      primaryColor: '#8B5CF6',
      secondaryColor: '#1E1B4B',
      backgroundColor: '#0F172A',
      cardBackgroundColor: '#1E293B',
      textColor: '#F8FAFC',
      accentColor: '#22D3EE',
    },
  },
  {
    name: 'Minimalista Gray',
    description: 'Limpio y profesional',
    colors: {
      primaryColor: '#64748B',
      secondaryColor: '#334155',
      backgroundColor: '#F1F5F9',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#334155',
      accentColor: '#94A3B8',
    },
  },
];

// Opciones de tipografías Google Fonts
export const FONT_OPTIONS = [
  { value: 'font-sans', label: 'Inter', googleFont: 'Inter' },
  { value: 'font-poppins', label: 'Poppins', googleFont: 'Poppins' },
  { value: 'font-montserrat', label: 'Montserrat', googleFont: 'Montserrat' },
  { value: 'font-playfair', label: 'Playfair Display', googleFont: 'Playfair+Display' },
  { value: 'font-outfit', label: 'Outfit', googleFont: 'Outfit' },
  { value: 'font-space-grotesk', label: 'Space Grotesk', googleFont: 'Space+Grotesk' },
];

// Opciones de redondeo de bordes
export const BORDER_RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'Recto', class: 'rounded-none' },
  { value: 'rounded-lg', label: 'Suave', class: 'rounded-lg' },
  { value: 'rounded-2xl', label: 'Redondeado', class: 'rounded-2xl' },
  { value: 'rounded-full', label: 'Píldora', class: 'rounded-full' },
];

// Opciones de layout de productos
export const PRODUCT_GRID_OPTIONS = [
  { value: 'list', label: 'Lista', icon: 'list' },
  { value: 'grid-2-col', label: 'Rejilla 2 Col', icon: 'grid-2' },
  { value: 'grid-3-col', label: 'Rejilla 3 Col', icon: 'grid-3' },
  { value: 'cards-large', label: 'Tarjetas Grandes', icon: 'cards' },
  { value: 'horizontal-scroll', label: 'Horizontal', icon: 'scroll' },
];

// Opciones de estilo de header
export const HEADER_STYLE_OPTIONS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'banner-large', label: 'Banner Grande' },
  { value: 'centered-logo', label: 'Logo Centrado' },
  { value: 'floating-card', label: 'Tarjeta Flotante' },
];

// Opciones de estilo de categorías
export const CATEGORY_STYLE_OPTIONS = [
  { value: 'pills-scroll', label: 'Píldoras Scroll' },
  { value: 'tabs-underlined', label: 'Tabs Subrayados' },
  { value: 'floating-bar', label: 'Barra Flotante' },
  { value: 'grid-icons', label: 'Grid Iconos' },
];

// Opciones de estilo de tarjetas de producto
export const PRODUCT_CARD_STYLE_OPTIONS = [
  { value: 'minimal-border', label: 'Borde Minimal' },
  { value: 'modern-shadow', label: 'Sombra Moderna' },
  { value: 'glassmorphic', label: 'Glassmórfico' },
  { value: 'compact-row', label: 'Fila Compacta' },
];

// Mapeo de fuentes a URLs de Google Fonts
export const GOOGLE_FONTS_URL = {
  'font-sans': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'font-poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  'font-montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
  'font-playfair': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap',
  'font-outfit': 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap',
  'font-space-grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
};

// Mapeo de border radius a valores CSS
export const BORDER_RADIUS_MAP = {
  'rounded-none': '0px',
  'rounded-lg': '0.5rem',
  'rounded-2xl': '1rem',
  'rounded-full': '9999px',
};

// Mapa de layouts de tarjetas de producto
export const PRODUCT_CARD_STYLES = {
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Limpio, sin bordes, enfoque en fotografía',
    classes: 'bg-transparent',
  },
  'modern-shadow': {
    id: 'modern-shadow',
    name: 'Modern Shadow',
    description: 'Bordes suaves y sombra difuminada',
    classes: 'shadow-lg shadow-black/5',
  },
  'compact-row': {
    id: 'compact-row',
    name: 'Compact Row',
    description: 'Fila horizontal ideal para menús',
    classes: 'flex-row items-center gap-3',
  },
  glassmorphic: {
    id: 'glassmorphic',
    name: 'Glassmorphic',
    description: 'Efecto cristal con blur y brillos',
    classes: 'backdrop-blur-md bg-white/10 border border-white/20',
  },
};

// Mapa de grids de productos
export const PRODUCT_GRID_STYLES = {
  list: {
    id: 'list',
    name: 'Lista',
    description: 'Productos en lista vertical',
    classes: 'flex flex-col gap-3',
  },
  'grid-2-col': {
    id: 'grid-2-col',
    name: 'Rejilla 2 Columnas',
    description: 'Grid compacto de 2 columnas',
    classes: 'grid grid-cols-2 gap-3',
  },
  'grid-3-col': {
    id: 'grid-3-col',
    name: 'Rejilla 3 Columnas',
    description: 'Grid denso de 3 columnas',
    classes: 'grid grid-cols-3 gap-2',
  },
  'cards-large': {
    id: 'cards-large',
    name: 'Tarjetas Grandes',
    description: 'Tarjetas de ancho completo',
    classes: 'grid grid-cols-1 gap-4',
  },
  'horizontal-scroll': {
    id: 'horizontal-scroll',
    name: 'Scroll Horizontal',
    description: 'Carrusel horizontal',
    classes: 'flex overflow-x-auto gap-3 no-scrollbar',
  },
};

// Mapa de estilos de header
export const HEADER_STYLES = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Header limpio y simple',
  },
  'banner-large': {
    id: 'banner-large',
    name: 'Banner Grande',
    description: 'Imagen de banner a lo ancho',
  },
  'centered-logo': {
    id: 'centered-logo',
    name: 'Logo Centrado',
    description: 'Logo centrado con tagline',
  },
  'floating-card': {
    id: 'floating-card',
    name: 'Tarjeta Flotante',
    description: 'Logo en tarjeta flotante',
  },
};

// Mapa de estilos de categorías
export const CATEGORY_STYLES = {
  'pills-scroll': {
    id: 'pills-scroll',
    name: 'Píldoras Scroll',
    description: 'Píldoras con scroll horizontal',
  },
  'tabs-underlined': {
    id: 'tabs-underlined',
    name: 'Tabs Subrayados',
    description: 'Tabs con línea inferior',
  },
  'floating-bar': {
    id: 'floating-bar',
    name: 'Barra Flotante',
    description: 'Barra flotante con blur',
  },
  'grid-icons': {
    id: 'grid-icons',
    name: 'Grid de Iconos',
    description: 'Grid de iconos con etiquetas',
  },
};

// Mapeo de fuentes a familias CSS
export const FONT_FAMILY_MAP = {
  'font-sans': "'Inter', sans-serif",
  'font-poppins': "'Poppins', sans-serif",
  'font-montserrat': "'Montserrat', sans-serif",
  'font-playfair': "'Playfair Display', serif",
  'font-outfit': "'Outfit', sans-serif",
  'font-space-grotesk': "'Space Grotesk', sans-serif",
};
