import type { Config } from "tailwindcss"
import animatePlugin from "tailwindcss-animate"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#FF8637",
          foreground: "#FFFFFF",
          50: "#FFF7F3",
          100: "#FFEDE5",
          200: "#FFD6C2",
          300: "#FFB894",
          400: "#FF9A66",
          500: "#FF8637",
          600: "#E6732A",
          700: "#CC601D",
          800: "#B34D10",
          900: "#993A03",
        },
        secondary: {
          DEFAULT: "#F9F9F9",
          foreground: "#374151",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#EFEFEF",
          foreground: "#6B7280",
        },
        accent: {
          DEFAULT: "#FCF4F1",
          foreground: "#111827",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
        // Custom color variables
        "color-1": "#F9F9F9",
        "color-2": "#FFFFFF",
        "color-3": "#FF8637",
        "color-4": "#F9F9F9",
        "color-5": "#FCF4F1",
        "color-6": "#F9F9F9",
        "color-7": "#EFEFEF",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animatePlugin],
} satisfies Config

export default config
