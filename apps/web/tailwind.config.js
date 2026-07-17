/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0d0f14",
          800: "#12151c",
          700: "#181b22",
          600: "#1f232c",
          500: "#262b36",
        },
        honey: {
          DEFAULT: "#f5c518",
          soft: "#f5c51822",
        },
        mint: "#39d98a",
        // WhatsApp (dark theme) - matched to the real app
        wa: {
          bg: "#0b141a", // conversation background
          panel: "#111b21", // app / chat-list background
          header: "#202c33", // top bars
          out: "#005c4b", // outgoing bubble
          in: "#202c33", // incoming bubble
          input: "#2a3942", // input field
          accent: "#00a884", // brand / send button
          tick: "#53bdeb", // read ticks / links
          text: "#e9edef",
          sub: "#8696a0",
          divider: "#222d34",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        bubbleIn: {
          from: { opacity: "0", transform: "translateY(6px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        typing: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        fadeIn: "fadeIn 0.3s ease-out",
        bubbleIn: "bubbleIn 0.18s ease-out",
        typing: "typing 1.2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};
