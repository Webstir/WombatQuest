// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: "@typescript-eslint/parser",
  plugins: ["import", "@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:import/recommended"],
  rules: {
    "import/no-cycle": "error",
    "import/no-internal-modules": [
      "error",
      { "allow": ["**/index.ts"] }
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  },
  ignorePatterns: ["dist", "build"],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json"
      }
    }
  }
};
