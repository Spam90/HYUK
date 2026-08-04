'use client';

import { useState } from 'react';
import ThemeProvider from '@/components/theme/ThemeProvider';
import { CartProvider } from '@/context/CartContext';
import HeaderVariant from '@/components/catalog/HeaderVariant';
import CategoryNav from '@/components/catalog/CategoryNav';
import ProductGrid from '@/components/catalog/ProductGrid';
import CartDrawer from '@/components/catalog/CartDrawer';
import { DEFAULT_SETTINGS } from '@/lib/theme/defaults';

// Datos de demo
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
  store_name: 'Mi Restaurante Demo',
  full_name: 'Mi Restaurante Demo',
  logo_url: '',
  whatsapp_number: '18091234567',
};

export default function DemoPage() {
  const [activeCategory, setActiveCategory] = useState(null);

  const filteredProducts = activeCategory
    ? DEMO_PRODUCTS.filter(p => p.category_id === activeCategory)
    : DEMO_PRODUCTS;

  return (
    <ThemeProvider initialSettings={DEFAULT_SETTINGS}>
      <CartProvider>
        <div className="min-h-screen bg-background text-text">
          {/* Announcement Bar */}
          <div
            className="text-center text-white text-sm py-2 px-4 font-medium"
            style={{ backgroundColor: DEFAULT_SETTINGS.theme.primaryColor }}
          >
            🚚 Envíos gratis en pedidos mayores a $1,000
          </div>

          <HeaderVariant store={DEMO_STORE} settings={DEFAULT_SETTINGS} />

          <CategoryNav
            categories={DEMO_CATEGORIES}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            settings={DEFAULT_SETTINGS}
          />

          <main className="max-w-3xl mx-auto px-4 py-6">
            <ProductGrid
              products={filteredProducts}
              settings={DEFAULT_SETTINGS}
              categories={DEMO_CATEGORIES}
            />

            <footer className="mt-16 pb-8 text-center">
              <div
                className="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: DEFAULT_SETTINGS.theme.primaryColor }}
              >
                <span className="text-xl font-bold">M</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-text">Mi Restaurante Demo</p>
              <p className="text-xs text-text/40 mt-1">
                Catálogo Digital © {new Date().getFullYear()} | Hecho con SAS
              </p>
            </footer>
          </main>

          <CartDrawer store={DEMO_STORE} settings={DEFAULT_SETTINGS} />
        </div>
      </CartProvider>
    </ThemeProvider>
  );
}