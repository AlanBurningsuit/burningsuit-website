// Tailwind v4 via PostCSS. Used instead of @tailwindcss/vite because the Vite
// plugin is incompatible with Astro 6's default rolldown-vite
// (withastro/astro#16542). Same engine and same CSS-first config.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
