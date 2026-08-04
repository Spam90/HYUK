'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

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

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Agregar item al carrito
  const addItem = useCallback((product, quantity = 1, selectedOptions = []) => {
    setCartItems(prev => {
      // Calcular precio con opciones
      let unitPrice = product.price;
      if (selectedOptions.length > 0) {
        selectedOptions.forEach(opt => {
          if (opt.priceDelta) unitPrice += opt.priceDelta;
        });
      }

      // Crear clave única del item (producto + opciones)
      const optionsKey = selectedOptions.map(opt => opt.label).join('|');
      const itemKey = `${product.id}-${optionsKey}`;

      // Verificar si el item ya existe
      const existingIndex = prev.findIndex(item => item.key === itemKey);

      if (existingIndex >= 0) {
        // Actualizar cantidad del item existente
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
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
          quantity,
          selectedOptions,
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
    if (newQuantity <= 0) {
      setCartItems(prev => prev.filter(item => item.key !== itemKey));
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.key === itemKey
          ? { ...item, quantity: newQuantity }
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