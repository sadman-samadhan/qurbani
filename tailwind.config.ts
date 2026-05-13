import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1B6B3A",
        accent: "#D4AF37",
        background: "#FFFDF5",
        "text-primary": "#1A1A1A",
        "text-muted": "#6B7280",
        border: "#E5E0D5",
        error: "#DC2626",
      },
      fontFamily: {
        hind: ["var(--font-hind-siliguri)", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        xl: "0.75rem",
      },
      boxShadow: {
        warm: "0 4px 6px -1px rgba(27, 107, 58, 0.1), 0 2px 4px -1px rgba(27, 107, 58, 0.06)",
      },
    },
  },
  plugins: []
};

export default config;
