module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    quotes: ["error", "double"],
    camelcase: ["warn"],
    "new-cap": ["warn", {"newIsCap": true}],
    "no-tabs": ["error", {allowIndentationTabs: true}],
    "indent": ["warn", 2],
    "max-len": ["warn", {
      "code": 120,
      "ignoreComments": true,
    }],
    "no-prototype-builtins": ["warn"]
  },
};
