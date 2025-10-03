module.exports = {
  extends: ['../../packages/config/eslint/base.js'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 18+
  },
};

