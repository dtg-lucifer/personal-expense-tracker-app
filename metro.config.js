// metro.config.js
// Standard Expo Metro config — Tamagui works without any plugin on native.
// Path aliases (@/*, @/lib/*) are resolved automatically from tsconfig.json
// by expo-cli's built-in TypeScript resolver.

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
