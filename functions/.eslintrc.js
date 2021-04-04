module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: "babel-eslint",
  extends: [
    "eslint:recommended",
    "google",
  ],
  ignorePatterns: ["lib/*.js"],
  rules: {
    "quotes": ["warn", "double"],
    "new-cap": ["warn", {"newIsCap": true}],
    "no-tabs": ["error", {allowIndentationTabs: true}],
    "indent": ["warn", 2],
    "max-len": ["warn", {
      "code": 120,
      "ignoreComments": true,
    }],
  },
};
