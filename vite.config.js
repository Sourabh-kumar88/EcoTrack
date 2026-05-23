import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        signin: resolve(__dirname, 'signin.html'),
        signup: resolve(__dirname, 'signup.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        log_activity: resolve(__dirname, 'log_activity.html'),
        profile: resolve(__dirname, 'profile.html'),
      },
      output: {
        dir: 'dist',
      }
    }
  }
});
