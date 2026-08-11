'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

export default function CategoryNav({ 
  categories, 
  activeCategory, 
  onSelectCategory,
  settings 
}) {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const navRef = useRef(null);
  const buttonRefs = useRef({});

  useEffect(() => {
    if (activeCategory && buttonRefs.current[activeCategory]) {
      const button = buttonRefs.current[activeCategory];
      if (button && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        
        setIndicatorStyle({
          left: buttonRect.left - navRect.left + navRef.current.scrollLeft,
          width: buttonRect.width,
        });
      }
    }
  }, [activeCategory]);

  if (!categories || categories.length === 0) return null;

  return (
    <div className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-secondary/10">
      <div className="relative">
        {/* Animated Indicator - Tiendanube Style */}
        <motion.div
          layoutId="categoryIndicator"
          className="absolute top-3 h-9 rounded-full shadow-md"
          style={{
            backgroundColor: settings.theme.primaryColor,
            boxShadow: `0 2px 8px ${settings.theme.primaryColor}30`,
          }}
          animate={indicatorStyle}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        />

        {/* Categories Container - Tiendanube Style */}
        <div
          ref={navRef}
          className="flex gap-2 overflow-x-auto no-scrollbar py-3 px-4"
        >
          {/* All Categories Button */}
        <button
          ref={(el) => {
            if (el) buttonRefs.current['all'] = el;
          }}
          onClick={() => onSelectCategory('all')}
          className={`
            relative z-10 flex items-center gap-2 px-4 py-2 rounded-full
            text-sm font-medium whitespace-nowrap
            transition-all duration-200
          `}
          style={{
            backgroundColor: activeCategory === 'all' ? settings.theme.primaryColor : 'transparent',
            color: activeCategory === 'all' ? 'white' : settings.theme.textColor,
          }}
        >
          <span className="relative z-10">Todos</span>
        </button>

        {/* Category Buttons */}
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              ref={(el) => {
                if (el) buttonRefs.current[category.id] = el;
              }}
              onClick={() => onSelectCategory(category.id)}
              className={`
                relative z-10 flex items-center gap-2 px-4 py-2 rounded-full
                text-sm font-medium whitespace-nowrap
                transition-all duration-200
              `}
              style={{
                backgroundColor: isActive ? settings.theme.primaryColor : 'transparent',
                color: isActive ? 'white' : settings.theme.textColor,
              }}
            >
              <span className="relative z-10 text-base">
                {category.icon || '📦'}
              </span>
              <span className="relative z-10">{category.name}</span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
