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
        primary: { DEFAULT: "#1B6B3A", light: "#2D8A4E", lighter: "#E8F5ED", dark: "#0F3D22" },
        accent:  { DEFAULT: "#D4AF37", light: "#F0D875", lighter: "#FDF8E7", dark: "#A88A22" },
        surface: { DEFAULT: "#FFFFFF", warm: "#FFFDF5", muted: "#F7F5F0" },
        background: "#FFFDF5",
        text: { primary: "#1A1A1A", secondary: "#374151", muted: "#6B7280", inverse: "#FFFFFF" },
        "text-primary": "#1A1A1A",
        "text-muted": "#6B7280",
        border: { DEFAULT: "#E5E0D5", light: "#F0EDE8", strong: "#C8C2B8" },
        error: "#DC2626",
        success: "#16A34A",
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
