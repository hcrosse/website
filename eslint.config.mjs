import eslintPluginAstro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['dist/', '.astro/'] },
  { files: ['**/*.ts'], languageOptions: { parser: tsParser } },
  ...eslintPluginAstro.configs.recommended,
];
