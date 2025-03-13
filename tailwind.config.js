
import daisyui from "daisyui"

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/views/**/*.{html,js,ejs}"],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  aisyui: {
    themes: ["light", "dark", "cupcake"],
  },
}
