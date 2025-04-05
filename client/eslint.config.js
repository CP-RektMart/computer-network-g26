//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    name: 'custom',
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      '@typescript-eslint/array-type': [
        'error',
        { default: 'array', readonly: 'array' },
      ],
    },
  },
]
