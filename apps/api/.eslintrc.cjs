module.exports = {
  extends: ['../../packages/config/eslint/base.js'],
  env: {
    node: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // Allow any for Hono context
  },
};

