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
    <div className="relative">
      {/* Animated Indicator */}
      <motion.div
        className="absolute top-2 h-10 rounded-full shadow-lg"
        style={{
          backgroundColor: settings.theme.primaryColor,
          boxShadow: `0 4px 12px ${settings.theme.primaryColor}40`,
        }}
        animate={indicatorStyle}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      />

      {/* Categories Container */}
      <div
        ref={navRef}
        className="relative flex gap-2 overflow-x-auto no-scrollbar py-2 px-1"
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
            transition-colors duration-200
          `}
          style={{
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
                transition-colors duration-200
              `}
              style={{
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
  );
}