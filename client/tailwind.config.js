import forms from "@tailwindcss/forms";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        noir: {
          base: "#0F1117",
          surface: "#1A1D27",
          surface2: "#202431",
          border: "rgba(255,255,255,0.06)",
          text: "#F8FAFC",
          muted: "#8B8FA3",
          emerald: "#10B981",
          coral: "#EF4444",
          lavender: "#A78BFA",
        },
      },
      fontFamily: {
        body: ["Inter", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(24px,-18px,0) scale(1.08)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease-out",
        slideUp: "slideUp 0.45s ease-out",
        slideInLeft: "slideInLeft 0.45s ease-out",
        shimmer: "shimmer 1.6s infinite",
        drift: "drift 30s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 40px rgba(16,185,129,0.18)",
        coral: "0 0 40px rgba(239,68,68,0.16)",
      },
    },
  },
  plugins: [forms],
};
