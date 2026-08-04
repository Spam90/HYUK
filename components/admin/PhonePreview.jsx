'use client';

import { motion } from 'framer-motion';
import { Smartphone, RotateCcw } from 'lucide-react';
import HeaderVariant from '@/components/catalog/HeaderVariant';
import CategoryNav from '@/components/catalog/CategoryNav';
import ProductGrid from '@/components/catalog/ProductGrid';

// Datos de ejemplo para el preview
const DEMO_CATEGORIES = [
  { id: 'cat-1', name: 'Entradas', icon: 'utensils', sort_order: 1 },
  { id: 'cat-2', name: 'Platos Principales', icon: 'chefhat', sort_order: 2 },
  { id: 'cat-3', name: 'Postres', icon: 'cake', sort_order: 3 },
  { id: 'cat-4', name: 'Bebidas', icon: 'coffee', sort_order: 4 },
];

const DEMO_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Hamburguesa Clásica',
    description: 'Carne 100% res, queso cheddar, lechuga, tomate y salsa especial',
    price: 350,
    image_url: null,
    category_id: 'cat-2',
    is_available: true,
    is_featured: true,
    badge: 'Popular',
    options: [
      {
        name: 'Tamaño',
        choices: [
          { label: 'Simple', priceDelta: 0 },
          { label: 'Doble', priceDelta: 100 },
          { label: 'Triple', priceDelta: 200 },
        ],
        is_required: true,
      },
      {
        name: 'Extras',
        choices: [
          { label: 'Queso extra', priceDelta: 50 },
          { label: 'Tocino', priceDelta: 75 },
          { label: 'Huevo', priceDelta: 40 },
        ],
        is_required: false,
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Pizza Margherita',
    description: 'Salsa de tomate, mozzarella fresca y albahaca',
    price: 450,
    image_url: null,
    category_id: 'cat-2',
    is_available: true,
    is_featured: false,
    badge: null,
    options: [],
  },
  {
    id: 'prod-3',
    name: 'Ensalada César',
    description: 'Lechuga romana, pollo a la parrilla, crutones y aderezo césar',
    price: 280,
    image_url: null,
    category_id: 'cat-1',
    is_available: true,
    is_featured: false,
    badge: null,
    options: [],
  },
  {
    id: 'prod-4',
    name: 'Cheesecake de Fresa',
    description: 'Base de galleta, crema de queso y fresas frescas',
    price: 220,
    image_url: null,
    category_id: 'cat-3',
    is_available: true,
    is_featured: false,
    badge: 'Nuevo',
    options: [],
  },
  {
    id: 'prod-5',
    name: 'Limonada Natural',
    description: 'Limonada fresca con hierbabuena',
    price: 90,
    image_url: null,
    category_id: 'cat-4',
    is_available: true,
    is_featured: false,
    badge: null,
    options: [],
  },
  {
    id: 'prod-6',
    name: 'Café Latte',
    description: 'Espresso con leche vaporizada',
    price: 120,
    image_url: null,
    category_id: 'cat-4',
    is_available: false,
    is_featured: false,
    badge: null,
    options: [],
  },
];

const DEMO_STORE = {
  store_name: 'Mi Restaurante',
  full_name: 'Mi Restaurante',
  logo_url: '',
};

export default function PhonePreview({ settings }) {
  return (
    <div className="flex flex-col items-center">
      {/* Marco del iPhone */}
      <div className="relative">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20" />

        {/* Marco del teléfono */}
        <div className="w-[320px] h-[640px] bg-black rounded-[3rem] p-2.5 shadow-2xl">
          {/* Pantalla */}
          <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden relative">
            {/* Barra de estado */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pt-2 text-[10px] font-semibold text-text/70">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Contenido del catálogo */}
            <div className="h-full overflow-y-auto no-scrollbar pt-8">
              {/* Announcement Bar */}
              {settings.banner?.showAnnouncementBar && settings.banner?.announcementText && (
                <div
                  className="text-center text-white text-[10px] py-1.5 px-3 font-medium"
                  style={{ backgroundColor: settings.theme.primaryColor }}
                >
                  {settings.banner.announcementText}
                </div>
              )}

              {/* Header */}
              <HeaderVariant
                store={DEMO_STORE}
                settings={settings}
                onCartClick={() => {}}
              />

              {/* Categorías */}
              <CategoryNav
                categories={DEMO_CATEGORIES}
                activeCategory={null}
                onSelectCategory={() => {}}
                settings={settings}
              />

              {/* Productos */}
              <div className="px-3 py-4">
                <ProductGrid
                  products={DEMO_PRODUCTS}
                  settings={settings}
                  categories={DEMO_CATEGORIES}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botón home */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full" />
      </div>

      {/* Etiqueta */}
      <div className="mt-4 flex items-center gap-2 text-xs text-text/40">
        <Smartphone className="w-3.5 h-3.5" />
        Vista previa en tiempo real
      </div>
    </div>
  );
}