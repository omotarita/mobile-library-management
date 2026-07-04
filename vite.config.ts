import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path matches the GitHub Pages project URL:
// https://<user>.github.io/mobile-library-management/
export default defineConfig({
  base: '/mobile-library-management/',
  plugins: [react()],
})
