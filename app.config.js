const { withGradleProperties } = require('expo/config-plugins');

// Extends app.json with values that must not be committed.
// Google Maps on Android needs a key: GOOGLE_MAPS_ANDROID_KEY=... npx expo prebuild
// Without one, TrailMate draws routes on its own offline topo background.

/**
 * The generated android/gradle.properties gives Gradle 2 GB heap and 512 MB
 * metaspace. Release builds run out of metaspace and fail with "Failed to run
 * Gradle Worker Daemon". Set it here so it survives `expo prebuild --clean`.
 */
const withGradleMemory = (config) =>
  withGradleProperties(config, (cfg) => {
    const key = 'org.gradle.jvmargs';
    const value = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8';
    const existing = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
    if (existing) existing.value = value;
    else cfg.modResults.push({ type: 'property', key, value });
    return cfg;
  });

module.exports = ({ config }) => {
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', androidKey ? { androidGoogleMapsApiKey: androidKey } : {}],
      withGradleMemory,
    ],
    extra: {
      ...config.extra,
      hasAndroidMapsKey: Boolean(androidKey),
    },
  };
};
