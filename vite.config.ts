import { defineConfig } from "vite"

const apiTarget = process.env.AGENTBOOK_API_TARGET || "http://127.0.0.1:3000"
const wsTarget = process.env.AGENTBOOK_WS_TARGET || "ws://127.0.0.1:3001"

export default defineConfig({
  root: "web",
  server: {
    host: "127.0.0.1",
    port: 5173,
    fs: {
      allow: [".."],
    },
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/ws": {
        target: wsTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "../dist/web",
    emptyOutDir: true,
  },
})
