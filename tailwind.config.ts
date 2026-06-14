// tailwind.config.ts
import type { Config } from "tailwindcss";

export default <Config>{
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "hsl(220, 90%, 56%)",
        secondary: "hsl(340, 75%, 55%)",
        accent: "hsl(45, 90%, 55%)",
      },
    },
  },
  plugins: [],
};
