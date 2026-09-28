// The background location task must be defined before anything else, at the
// top of the entry, so the OS can run it without any screen mounted.
import './src/tracking/locationTask';
import 'expo-router/entry';
