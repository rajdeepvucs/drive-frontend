import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
   
  plugins: [react()],
  // Set the base path for deployment.
  // Must be a string, starting and ending with '/' for subdirectory deployment.
 
})