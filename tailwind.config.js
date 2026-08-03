/**
 * Tailwind v4 is CSS-first: design tokens live in `@theme` inside
 * styles/globals.css, not here. This file remains only so tooling that expects
 * a config path keeps working, and to declare content sources explicitly.
 * Do NOT add theme tokens here — v4 will not read them without a @config
 * directive, and they will silently fail to generate utilities.
 */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ]
};
