import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { join } from "path"
import worker, { pluginHelper } from "vite-plugin-worker"

export default defineConfig({
  mode: "development",
  resolve: {
    alias: {
      "@": join(__dirname, "./src"),
    },
  },
  plugins: [
    vue(),
    pluginHelper(),
    worker({})
  ],
  define: { "process.env": {} },
  css: {
    preprocessorOptions: {
      //scss: { additionalData: ` @import "@/styles/variables.scss";` },
    },
  },
});
