'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, X, ChevronRight } from 'lucide-react';
import ThemeProvider from '@/components/theme/ThemeProvider';
import { CartProvider, useCart } from '@/context/CartContext';
import HeaderVariant from '@/components/catalog/HeaderVariant';
import CategoryNav from '@/components/catalog/CategoryNav';
import ProductGrid from '@/components/catalog/ProductGrid';
import CartDrawer from '@/components/catalog/CartDrawer';
import PromoBanner from '@/components/catalog/PromoBanner';

// Componente interno para acceder al carrito
function CatalogContent({ store, categories, products, settings }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { cartItems, openCart, totalItems } = useCart();

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
    },
    marketing: {
      showAnnouncementBar: true,
      announcementText: '🎉 ¡Usa el cupón HYUK10 para obtener 10% de descuento en tu primer pedido!',
      showPopup: false,
      popupTitle: '🎁 ¡Bienvenido a nuestra tienda!',
      popupText: 'Obtén un 10% de descuento en tu primer pedido usando el cupón HYUK10.',
      popupButtonLabel: '¡Comenzar!',
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

  // Búsqueda en tiempo real (filtrado local)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    return demoProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    );
  }, [searchQuery, demoProducts]);

  return (
    <ThemeProvider initialSettings={demoSettings}>
      <CartProvider>
        <div className="min-h-screen bg-background text-text">
          {/* Announcement Bar + Popup Promocional */}
          <PromoBanner settings={demoSettings} storeId={demoStore.id} />

          {/* Header */}
          <HeaderVariant
            store={demoStore}
            settings={demoSettings}
            onCartClick={() => {}} // CartProvider manejará esto vía context
          />

          {/* Search Bar - Fixed */}
          <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-secondary/10">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-secondary/10 bg-card text-sm text-text placeholder:text-text/30 focus:outline-none focus:border-primary/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary/20 transition-colors"
                  >
                    <X className="w-3 h-3 text-text/60" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navegación de categorías */}
          {demoCategories.length > 0 && !searchQuery && (
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

            {/* Resultados de búsqueda */}
            {searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-5 h-5 text-text/40" />
                  <h2 className="text-lg font-bold text-text">
                    Resultados para "{searchQuery}"
                  </h2>
                  <span className="text-sm text-text/40">
                    ({searchResults?.length || 0} productos)
                  </span>
                </div>

                {searchResults && searchResults.length > 0 ? (
                  <ProductGrid
                    products={searchResults}
                    settings={demoSettings}
                    categories={demoCategories}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-text/40 text-lg">No se encontraron productos</p>
                    <p className="text-text/30 text-sm mt-2">Intenta con otra búsqueda</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Vista agrupada por categorías */}
            {showGroupedLayout && !searchQuery && (
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

          {/* Floating Cart Bar */}
          <AnimatePresence>
            {totalItems > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40"
              >
                <button
                  onClick={openCart}
                  className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-4 flex items-center justify-between hover:shadow-3xl transition-shadow"
                  style={{ 
                    boxShadow: `0 8px 32px ${demoSettings.theme.primaryColor}30`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white relative"
                      style={{ backgroundColor: demoSettings.theme.primaryColor }}
                    >
                      <ShoppingBag className="w-6 h-6" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                        {totalItems}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-text/60">
                        {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                      </p>
                      <p className="text-lg font-bold text-text">
                        Ver Pedido
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text/40" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cart Drawer */}
          <CartDrawer store={demoStore} settings={demoSettings} />
        </div>
      </CartProvider>
    </ThemeProvider>
  );
}

// Exportar el componente wrapper
export default function CatalogViewWrapper(props) {
  return (
    <ThemeProvider initialSettings={props.settings}>
      <CartProvider>
        <CatalogContent {...props} />
      </CartProvider>
    </ThemeProvider>
  );
}
