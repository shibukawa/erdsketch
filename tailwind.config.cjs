/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        seed: "0 18px 50px rgba(21, 30, 43, 0.12)"
      }
    }
  },
  daisyui: {
    themes: [
      {
        erdsketch: {
          primary: "#2563eb",
          secondary: "#7c3aed",
          accent: "#0f766e",
          neutral: "#111827",
          "base-100": "#f8fafc",
          info: "#0284c7",
          success: "#059669",
          warning: "#d97706",
          error: "#dc2626"
        }
      }
    ]
  },
  plugins: [require("daisyui")]
};
