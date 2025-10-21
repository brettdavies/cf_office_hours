import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries - most frequently used
          "react-vendor": ["react", "react-dom"],

          // UI component libraries - medium frequency
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-avatar",
            "@radix-ui/react-toast",
            "@radix-ui/react-select",
            "@radix-ui/react-label",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-slot",
          ],

          // Router and navigation
          "router-vendor": ["react-router-dom"],

          // Data fetching and state management
          "query-vendor": [
            "@tanstack/react-query",
            "@tanstack/react-query-devtools",
          ],

          // Backend integration
          "backend-vendor": ["@supabase/supabase-js"],

          // Core utility libraries (small, frequently used)
          "utils-vendor": [
            "date-fns",
            "clsx",
            "class-variance-authority",
            "tailwind-merge",
          ],

          // Icon library (large, can be loaded separately)
          "icons-vendor": ["lucide-react"],

          // State management (application-specific)
          "state-vendor": ["zustand"],

          // Date picker component (UI-specific)
          "datepicker-vendor": ["react-day-picker"],

          // Internal shared library
          "shared-vendor": ["@cf-office-hours/shared"],

          // Form handling
          "form-vendor": [
            "react-hook-form",
            "@hookform/resolvers",
            "zod",
          ],

          // Virtual scrolling (used in specific components)
          "virtual-vendor": ["@tanstack/react-virtual"],

          // Animation utilities
          "animation-vendor": ["tailwindcss-animate"],
        },
      },
    },
  },
});
