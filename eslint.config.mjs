import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly'
}

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/*.d.ts', '**/*.test-d.ts']
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: nodeGlobals,
      sourceType: 'module'
    }
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.ts'],
    ignores: ['packages/auth/src/**'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            '.lintstagedrc.mjs',
            'eslint.config.mjs',
            'prettier.config.js',
            'scripts/*.mjs',
            'vitest.workspace.ts',
            'examples/storage-basic/index.ts'
          ]
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error'
    }
  }
)
