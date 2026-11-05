import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // As funções de /api só existem na Vercel. No dev local, a cotação de frete (só leitura)
    // usa a do site no ar; checkout e pagamento NÃO são redirecionados, para nunca cobrar de verdade.
    proxy: {
      '/api/frete': { target: 'https://breckimports.com.br', changeOrigin: true },
    },
  },
})
