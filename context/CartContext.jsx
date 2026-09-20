'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';

const MAX_CART_QUANTITY = 99;

const CartContext = createContext({
  cartItems: [],
  isCartOpen: false,
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  openCart: () => {},
  closeCart: () => {},
  cartCount: 0,
  cartTotal: 0,
});

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children, storageKey = 'hyuk-cart' }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCartItems(parsed.filter((item) => (
            item && item.id && Number.isInteger(Number(item.quantity))
              && Number(item.quantity) >= 1 && Number(item.quantity) <= MAX_CART_QUANTITY
          )));
        }
      }
    } catch {
      // El carrito es una comodidad local; un storage inválido no rompe la compra.
    } finally {
      hydratedRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cartItems));
    } catch {
      // La compra sigue funcionando aunque el navegador bloquee localStorage.
    }
  }, [cartItems, storageKey]);

  // Agregar item al carrito
  const addItem = useCallback((product, quantity = 1, selectedOptions = [], notes = '', selectedSku = null) => {
    const stockLimit = selectedSku ? Number(selectedSku.stock) : MAX_CART_QUANTITY;
    if (selectedSku && (!Number.isInteger(stockLimit) || stockLimit < 1)) return;
    const requestedQuantity = Math.max(1, Math.min(MAX_CART_QUANTITY, stockLimit, Math.floor(Number(quantity) || 1)));
    setCartItems(prev => {
      // Calcular precio con opciones
      let unitPrice = selectedSku?.price_override != null
        ? Number(selectedSku.price_override) || 0
        : Number(product.price) || 0;
      if (selectedOptions.length > 0) {
        selectedOptions.forEach(opt => {
          unitPrice += Number(opt.priceDelta) || 0;
        });
      }

      // Crear clave única del item (producto + opciones)
      const optionsKey = selectedOptions.map(opt => `${opt.groupLabel || ''}:${opt.label || ''}`).join('|');
      const skuKey = selectedSku?.id || selectedSku?.sku || '';
      const itemKey = `${product.id}-${skuKey}-${optionsKey}`;

      // Verificar si el item ya existe
      const existingIndex = prev.findIndex(item => item.key === itemKey);

      if (existingIndex >= 0) {
        // Actualizar cantidad del item existente
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: Math.min(stockLimit, MAX_CART_QUANTITY, updated[existingIndex].quantity + requestedQuantity),
          notes: notes || updated[existingIndex].notes,
        };
        return updated;
      }

      // Agregar nuevo item
      return [
          ...prev,
          {
            key: itemKey,
            id: product.id,
            name: product.name,
            price: unitPrice,
            imageUrl: product.image_url,
            quantity: requestedQuantity,
            selectedOptions,
            skuId: selectedSku?.id || null,
            sku: selectedSku?.sku || null,
            stock: selectedSku ? stockLimit : null,
            notes: notes || '',
            product,
          },
        ];
    });
    setIsCartOpen(true);
  }, []);

  // Remover item del carrito
  const removeItem = useCallback((itemKey) => {
    setCartItems(prev => prev.filter(item => item.key !== itemKey));
  }, []);

  // Actualizar cantidad
  const updateQuantity = useCallback((itemKey, newQuantity) => {
    const quantity = Math.floor(Number(newQuantity));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.key !== itemKey));
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.key === itemKey
          ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.stock || MAX_CART_QUANTITY, quantity) }
          : item
      )
    );
  }, []);

  // Limpiar carrito
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Abrir/cerrar carrito
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  // Memoizar valores derivados
  const cartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}