/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050505",
          900: "#0B0B0B",
          850: "#0F0F0F",
          800: "#121212",
          700: "#1A1A1A",
        },
        gold: {
          600: "#F2B705",
          500: "#F7C62F",
          400: "#FFD86B",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Montserrat", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        wide2: "0.18em",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(247,198,47,.25), 0 18px 48px rgba(0,0,0,.55)",
        gold: "0 0 0 1px rgba(242,183,5,.45), 0 10px 35px rgba(242,183,5,.12)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(1200px 600px at 60% 20%, rgba(242,183,5,.18), transparent 60%), radial-gradient(1000px 500px at 25% 35%, rgba(255,255,255,.06), transparent 55%)",
      },
    },
  },
  plugins: [],
}

