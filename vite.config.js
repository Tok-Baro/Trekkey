import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@tiptap/") || id.includes("/node_modules/prosemirror-")) {
            return "editor";
          }
          if (id.includes("/node_modules/qrcode/")) {
            return "qrcode";
          }
          if (
            id.includes("/node_modules/react/")
            || id.includes("/node_modules/react-dom/")
            || id.includes("/node_modules/react-router")
          ) {
            return "react-vendor";
          }
          if (id.includes("/src/data/competitionData.js")) {
            return "demo-data";
          }
          return undefined;
        }
      }
    }
  }
});
