import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../src/db/client';
import { getOpenActivity } from '../src/db/queries';
import { recoverPendingPhoto } from '../src/photos/photos';
import { useTheme } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { c, scheme } = useTheme();
  const [loaded, error] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    getDb();
    // If Android killed us while the camera was open, keep that photo.
    const open = getOpenActivity();
    if (open) recoverPendingPhoto(open.id);
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => undefined);
  }, [c.bg]);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="record" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
