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

  // Filtrar productos por categoría seleccionada
  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products;

  // Agrupar productos por categoría para mostrar secciones
  const groupedByCategory = !activeCategory && categories.length > 0
    ? categories.map(cat => ({
        category: cat,
        products: products.filter(p => p.category_id === cat.id),
      })).filter(group => group.products.length > 0)
    : [];

  const showGroupedLayout = !activeCategory && groupedByCategory.length > 0;

  return (
    <ThemeProvider initialSettings={settings}>
      <CartProvider>
        <div className="min-h-screen bg-background text-text">
          {/* Announcement Bar */}
          {settings.banner?.showAnnouncementBar && settings.banner?.announcementText && (
            <div
              className="text-center text-white text-sm py-2 px-4 font-medium"
              style={{ backgroundColor: settings.theme.primaryColor }}
            >
              <span className="animate-pulse-slow inline-block">
                {settings.banner.announcementText}
              </span>
            </div>
          )}

          {/* Header */}
          <HeaderVariant
            store={store}
            settings={settings}
            onCartClick={() => {}} // CartProvider manejará esto vía context
          />

          {/* Navegación de categorías */}
          {categories.length > 0 && (
            <CategoryNav
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              settings={settings}
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
                  const activeCat = categories.find(c => c.id === activeCategory);
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
                        settings={settings}
                        categories={categories}
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
                        style={{ backgroundColor: settings.theme.primaryColor }}
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
                      settings={settings}
                      categories={categories}
                    />
                  </motion.section>
                ))}
              </div>
            )}

            {/* Vista simple (sin agrupar) */}
            {!showGroupedLayout && !activeCategory && (
              <ProductGrid
                products={filteredProducts}
                settings={settings}
                categories={categories}
              />
            )}

            {/* Footer de la tienda */}
            <footer className="mt-16 pb-8 text-center">
              <div
                className="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: settings.theme.primaryColor }}
              >
                <span className="text-xl font-bold">
                  {store.store_name?.charAt(0) || store.full_name?.charAt(0) || 'S'}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-text">
                {store.store_name || store.full_name || 'Mi Tienda'}
              </p>
              <p className="text-xs text-text/40 mt-1">
                Catálogo Digital © {new Date().getFullYear()} | Hecho con SAS
              </p>
            </footer>
          </main>

          {/* Cart Drawer */}
          <CartDrawer store={store} settings={settings} />
        </div>
      </CartProvider>
    </ThemeProvider>
  );
}