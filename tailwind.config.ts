import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        text: "#48465b",
        background: "#f2f3f8",
        primary: "#ed1c24",
        accent: "#8fe44f",
      },
    },
  },
  plugins: [],
} satisfies Config;
