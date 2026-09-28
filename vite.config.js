import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 配置：React JSX 项目
// base: GitHub Pages 项目站点部署在 https://<user>.github.io/mindplan/ 子路径下
export default defineConfig({
  base: '/mindplan/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})
