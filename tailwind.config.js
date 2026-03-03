/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Clash Display", "ui-sans-serif", "system-ui"],
        body: ["DM Sans", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 20px 60px -40px rgba(15, 23, 42, 0.45)",
        glow: "0 20px 60px -30px rgba(15, 23, 42, 0.55)"
      },
      keyframes: {
        "order-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "15%": { transform: "translateX(-4px)" },
          "30%": { transform: "translateX(4px)" },
          "45%": { transform: "translateX(-3px)" },
          "60%": { transform: "translateX(3px)" }
        }
      },
      animation: {
        "order-shake": "order-shake 1.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
