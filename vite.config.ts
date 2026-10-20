import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const rootDir = import.meta.dirname ?? path.resolve();

export default defineConfig(() => {
  const target = process.env.APP_TARGET;

  let input: Record<string, string> = {
    main: path.resolve(rootDir, 'index.html'),
    licenseManager: path.resolve(rootDir, 'license-manager/index.html'),
  };
  let outDir = 'dist';

  if (target === 'tadjir') {
    // Only customer POS application files
    input = {
      main: path.resolve(rootDir, 'index.html'),
    };
    outDir = 'dist-tadjir';
  } else if (target === 'license-manager') {
    // Only developer License Manager files
    input = {
      licenseManager: path.resolve(rootDir, 'license-manager/index.html'),
    };
    outDir = 'dist-license-manager';
  }

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input,
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
