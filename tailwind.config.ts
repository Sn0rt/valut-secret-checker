import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#FF3333',
          'red-dark': '#E62E2E',
          'red-light': '#FF6666',
          'red-50': '#FFF5F5',
          'red-100': '#FFEBEB',
          'red-200': '#FFD1D1',
          black: '#000000',
          white: '#FFFFFF',
        },
        // Override default colors with DBS theme
        primary: '#FF3333',
        'primary-dark': '#E62E2E',
        'primary-light': '#FF6666',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config