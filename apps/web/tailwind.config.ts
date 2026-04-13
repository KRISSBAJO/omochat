import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#18120f",
        graphite: "#493d31",
        sweet: "#efe1bf",
        honey: "#c79a32",
        lilac: "#dccfb5",
        blush: "#e8d3c1",
        cloud: "#fcf8ef",
        glass: "#f4ede0"
      }
    }
  },
  plugins: []
};

export default config;
