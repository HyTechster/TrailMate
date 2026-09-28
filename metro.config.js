const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Gradle writes thousands of build files into android/ and into every native
// library's node_modules/<pkg>/android/build. Metro doesn't need any of them,
// and watching them during a release build ran it out of memory.
config.resolver.blockList = [
  ...config.resolver.blockList,
  /[\\/]android[\\/](?:app[\\/])?(?:build|\.cxx|\.gradle|\.kotlin)(?:[\\/].*)?$/,
];

module.exports = config;
