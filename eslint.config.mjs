import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

// Next 16 menghapus `next lint`; linting sekarang lewat ESLint CLI + flat config.
export default defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    // Tooling agent, bukan bagian dari aplikasi
    '.agents/**',
    'claude-skills/**',
  ]),
  ...nextCoreWebVitals,
  ...nextTypeScript,
]);
