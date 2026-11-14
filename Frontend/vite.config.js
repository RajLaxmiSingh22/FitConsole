import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // The owner /docs page shows ../docs/CHANGELOG.md. Allow only that folder, not the whole repo
      // (which would also expose Backend/.env through the dev server).
      allow: [searchForWorkspaceRoot(process.cwd()), "../docs"],
    },
  },
});
