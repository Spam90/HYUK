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

// Mapeo de fuentes a familias CSS
export const FONT_FAMILY_MAP = {
  'font-sans': "'Inter', sans-serif",
  'font-poppins': "'Poppins', sans-serif",
  'font-montserrat': "'Montserrat', sans-serif",
  'font-playfair': "'Playfair Display', serif",
  'font-outfit': "'Outfit', sans-serif",
  'font-space-grotesk': "'Space Grotesk', sans-serif",
};