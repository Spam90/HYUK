'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ThemeProvider from '@/components/theme/ThemeProvider';
import { CartProvider } from '@/context/CartContext';
import HeaderVariant from '@/components/catalog/HeaderVariant';
import CategoryNav from '@/components/catalog/CategoryNav';
import ProductGrid from '@/components/catalog/ProductGrid';
import CartDrawer from '@/components/catalog/CartDrawer';

export default function CatalogView({ store, categories, products, settings }) {
  const [activeCategory, setActiveCategory] = useState(null);

  // Demo data if no props provided
  const demoStore = store || {
    business_name: 'Mi Tienda Demo',
    store_name: 'Mi Tienda Demo',
    tagline: 'Los mejores productos',
    phone_whatsapp: '1234567890'
  };

  const demoCategories = categories || [
    { id: '1', name: 'Todos', icon: '📦', is_active: true },
    { id: '2', name: 'Comida', icon: '🍕', is_active: true },
    { id: '3', name: 'Bebidas', icon: '🥤', is_active: true },
  ];

  const demoProducts = products || [
    {
      id: '1',
      name: 'Producto Demo 1',
      description: 'Descripción del producto demo',
      price: 99.00,
      original_price: 120.00,
      image_url: '',
      is_available: true,
      category_id: '2',
      badge: 'Popular',
      options: []
    },
    {
      id: '2',
      name: 'Producto Demo 2',
      description: 'Otro producto de ejemplo',
      price: 150.00,
      original_price: null,
      image_url: '',
      is_available: true,
      category_id: '3',
      badge: 'Nuevo',
      options: []
    },
    {
      id: '3',
      name: 'Producto Demo 3',
      description: 'Tercer producto demo',
      price: 75.50,
      original_price: 100.00,
      image_url: '',
      is_available: true,
      category_id: '2',
      badge: null,
      options: []
    },
  ];

  const demoSettings = settings || {
    theme: {
      primaryColor: '#10B981',
      secondaryColor: '#0F172A',
      backgroundColor: '#FAFAFA',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      accentColor: '#F59E0B',
      borderRadius: 'rounded-2xl',
      fontFamily: 'font-sans',
      mode: 'light'
    },
    layout: {
      productGrid: 'grid-2-col',
      headerStyle: 'banner-large',
      categoryStyle: 'pills-scroll',
      productCardStyle: 'modern-shadow'
    },
    banner: {
      imageUrl: '',
      tagline: '¡Los mejores productos a un clic!',
      showAnnouncementBar: true,
      announcementText: '🚚 Envíos gratis en pedidos mayores a $1,000'
    },
    whatsapp_checkout: {
      customMessageHeader: '🛒 *¡NUEVO PEDIDO DE CLIENTE!*',
      askForAddress: true,
      askForPaymentMethod: true,
      paymentOptions: ['Efectivo', 'Transferencia / Zelle', 'Tarjeta al recibir'],
      requireClientName: true,
      deliveryMethods: ['A domicilio', 'Retiro en local']
    }
  };

  // Filtrar productos por categoría seleccionada
  const filteredProducts = activeCategory
    ? demoProducts.filter(p => p.category_id === activeCategory)
    : demoProducts;

  // Agrupar productos por categoría para mostrar secciones
  const groupedByCategory = !activeCategory && demoCategories.length > 0
    ? demoCategories.map(cat => ({
        category: cat,
        products: demoProducts.filter(p => p.category_id === cat.id),
      })).filter(group => group.products.length > 0)
    : [];

  const showGroupedLayout = !activeCategory && groupedByCategory.length > 0;

  return (
    <ThemeProvider initialSettings={demoSettings}>
      <CartProvider>
        <div className="min-h-screen bg-background text-text">
          {/* Announcement Bar */}
          {demoSettings.banner?.showAnnouncementBar && demoSettings.banner?.announcementText && (
            <div
              className="text-center text-white text-sm py-2 px-4 font-medium"
              style={{ backgroundColor: demoSettings.theme.primaryColor }}
            >
              <span className="animate-pulse-slow inline-block">
                {demoSettings.banner.announcementText}
              </span>
            </div>
          )}

          {/* Header */}
          <HeaderVariant
            store={demoStore}
            settings={demoSettings}
            onCartClick={() => {}} // CartProvider manejará esto vía context
          />

          {/* Navegación de categorías */}
          {demoCategories.length > 0 && (
            <CategoryNav
              categories={demoCategories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              settings={demoSettings}
            />
          )}

          {/* Contenido principal */}
          <main className="max-w-3xl mx-auto px-4 py-6">
            {/* Si estamos filtrando por categoría activa */}
            {activeCategory && (
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {(() => {
                  const activeCat = demoCategories.find(c => c.id === activeCategory);
                  return (
                    <>
                      {activeCat?.image_url && (
                        <div className="relative h-36 rounded-theme-xl overflow-hidden mb-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeCat.image_url}
                            alt={activeCat.name}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                            <h2 className="text-white font-bold text-xl">{activeCat.name}</h2>
                          </div>
                        </div>
                      )}
                      <ProductGrid
                        products={filteredProducts}
                        settings={demoSettings}
                        categories={demoCategories}
                      />
                    </>
                  );
                })()}
              </motion.div>
            )}

            {/* Vista agrupada por categorías */}
            {showGroupedLayout && (
              <div className="space-y-10">
                {groupedByCategory.map((group, groupIndex) => (
                  <motion.section
                    key={group.category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
                  >
                    {/* Título de categoría */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-1 h-6 rounded-full"
                        style={{ backgroundColor: demoSettings.theme.primaryColor }}
                      />
                      <h2 className="text-xl font-bold text-text">
                        {group.category.name}
                      </h2>
                      <span className="text-sm text-text/40 font-medium">
                        {group.products.length} {group.products.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>

                    {group.category.description && (
                      <p className="text-sm text-text/50 mb-4 -mt-2">
                        {group.category.description}
                      </p>
                    )}

                    <ProductGrid
                      products={group.products}
                      settings={demoSettings}
                      categories={demoCategories}
                    />
                  </motion.section>
                ))}
              </div>
            )}

            {/* Vista simple (sin agrupar) */}
            {!showGroupedLayout && !activeCategory && (
              <ProductGrid
                products={filteredProducts}
                settings={demoSettings}
                categories={demoCategories}
              />
            )}

            {/* Footer de la tienda */}
            <footer className="mt-16 pb-8 text-center">
              <div
                className="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: demoSettings.theme.primaryColor }}
              >
                <span className="text-xl font-bold">
                  {demoStore.store_name?.charAt(0) || demoStore.full_name?.charAt(0) || 'S'}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-text">
                {demoStore.store_name || demoStore.full_name || 'Mi Tienda'}
              </p>
              <p className="text-xs text-text/40 mt-1">
                Catálogo Digital © {new Date().getFullYear()} | Hecho con SAS
              </p>
            </footer>
          </main>

          {/* Cart Drawer */}
          <CartDrawer store={demoStore} settings={demoSettings} />
        </div>
      </CartProvider>
    </ThemeProvider>
  );
}