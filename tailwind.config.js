/**
 * HYUK - Configuración de Tailwind
 *
 * NOTA IMPORTANTE sobre los tokens semánticos:
 * Los colores de la app son variables CSS (`var(--token)`) definidas en
 * app/globals.css y reescritas bajo `.dark`. Declararlos como string plano
 * (`'var(--card-bg)'`) hace que Tailwind DESCARTE cualquier modificador de
 * opacidad (`bg-card/60`, `border-secondary/10`, `text-text/60`): la clase se
 * emite vacía y el elemento queda sin fondo/borde. Se declaran como función
 * para que la opacidad funcione de verdad.
 *
 * @param {string} name - Nombre de la variable CSS (p. ej. '--card-bg').
 */
const token = (name) => ({ opacityValue }) => {
  // Caso base (sin modificador): Tailwind entrega el sistema legacy
  // `var(--tw-bg-opacity, 1)`. En HYUK no se usan las utilidades `bg-opacity-*`,
  // así que la clase base siempre es opaca.
  if (opacityValue === undefined || opacityValue === null) return `var(${name})`;
  if (typeof opacityValue === 'string' && opacityValue.startsWith('var(')) return `var(${name})`;

  const n = Number(opacityValue);
  if (!Number.isFinite(n)) return `var(${name})`;
  // Tailwind entrega '/10' como '10' y '/[0.07]' como '0.07'.
  const alpha = n > 1 ? n / 100 : n;
  return `color-mix(in srgb, var(${name}) ${alpha * 100}%, transparent)`;
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Light/Dark ÚNICAMENTE. next-themes aplica `.dark` en <html> y todas las
  // variantes `dark:` de la app reaccionan. No existe un tercer modo.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: token('--primary'),
        secondary: token('--secondary'),
        background: token('--background'),
        card: token('--card-bg'),
        text: token('--text-color'),
        accent: token('--accent'),
        // Tokens semánticos de superficie: cambian solos bajo `.dark`
        // (definidos en app/globals.css). Evitan colores fijos por página.
        border: token('--border'),
        surface: token('--surface'),
        input: token('--input'),
        muted: token('--muted'),
        'muted-foreground': token('--muted-foreground'),
      },
      fontFamily: {
        sans: ['var(--font-family)', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        playfair: ['"Playfair Display"', 'serif'],
        outfit: ['Outfit', 'sans-serif'],
        'space-grotesk': ['"Space Grotesk"', 'sans-serif'],
      },
      borderRadius: {
        'theme-sm': 'var(--radius-sm)',
        'theme-md': 'var(--radius-md)',
        'theme-lg': 'var(--radius-lg)',
        'theme-xl': 'var(--radius-xl)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};