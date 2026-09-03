import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0B0E14",
        panel: "#12161F",
        "panel-raised": "#181D29",
        subtle: "#232937",
        "text-primary": "#E6E9EF",
        "text-secondary": "#8A93A6",
        accent: "#3DDBD9",
        success: "#3FB950",
        warning: "#D29922",
        danger: "#F85149",
        mask: {
          water: "#4C8DFF",
          vegetation: "#3FB950",
          "built-up": "#F0883E",
          cropland: "#9ECE6A",
          "bare-soil": "#C9A876",
          unknown: "#5B6272",
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        full: '8px', // deliberately no pills
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      }
    },
  },
  plugins: [],
};
export default config;
