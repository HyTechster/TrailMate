import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { CaretLeftIcon, CheckIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { StatusBarScrim } from '../src/components/StatusBarScrim';
import { T } from '../src/components/T';
import { haptic } from '../src/haptics';
import { useSettings, type GpsMode } from '../src/settings';
import { radius, space, touch, useTheme } from '../src/theme/tokens';
import { getLocationAccess, requestBackground, type LocationAccess } from '../src/tracking/permissions';

const GPS_OPTIONS: { key: GpsMode; title: string; body: string }[] = [
  { key: 'auto', title: 'Auto', body: 'High for hikes, best for runs. Recommended.' },
  { key: 'precise', title: 'Precise', body: 'Best accuracy for everything. Uses more battery.' },
  { key: 'saver', title: 'Battery saver', body: 'Fewer fixes. Good for long, slow days out.' },
];

const ACCESS_TEXT: Record<LocationAccess, string> = {
  background: 'Allowed all the time. Tracking works with the screen locked.',
  foreground: 'Only while using the app. Keep the screen on while recording.',
  denied: 'Off. TrailMate cannot record routes.',
};

export default function Settings() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [s, set] = useSettings();
  const [access, setAccess] = useState<LocationAccess | null>(null);

  useFocusEffect(
    useCallback(() => {
      getLocationAccess().then(setAccess).catch(() => undefined);
    }, []),
  );

  const fixAccess = async () => {
    if (access === 'foreground' && (await requestBackground())) {
      setAccess('background');
      return;
    }
    Linking.openSettings();
  };

  // Dev builds only: long-press the version line.
  const seed = () => {
    const run = async (live: boolean) => {
      const demo = await import('../src/dev/seedDemo');
      try {
        if (live) {
          const at = await demo.seedLiveRecording();
          if (!at) throw new Error('Finish the current activity first.');
          router.replace('/record');
        } else {
          const n = await demo.seedDemo();
          haptic.success();
          Alert.alert('Demo data added', `${n} activities are ready for screenshots.`);
        }
      } catch (e) {
        Alert.alert('Seeding failed', e instanceof Error ? e.message : String(e));
      }
    };
    Alert.alert('Demo data', 'For screenshots only.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Live hike', onPress: () => run(true) },
      { text: 'Demo trails', onPress: () => run(false) },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.topRow}>
          <IconButton icon={CaretLeftIcon} label="Back" onPress={() => router.back()} />
          <T variant="title">Settings</T>
          <View style={{ width: 48 }} />
        </View>

        <Section title="Units">
          <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]} accessibilityRole="radiogroup">
            {(['metric', 'imperial'] as const).map((u) => {
              const on = s.units === u;
              return (
                <Pressable
                  key={u}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => set({ units: u })}
                  style={[styles.segmentItem, on && { backgroundColor: c.surface }]}
                >
                  <T variant="bodyStrong" color={on ? 'ink' : 'inkMuted'}>
                    {u === 'metric' ? 'Kilometres' : 'Miles'}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="GPS accuracy">
          <View style={styles.options} accessibilityRole="radiogroup">
            {GPS_OPTIONS.map((o) => {
              const on = s.gpsMode === o.key;
              return (
                <Pressable
                  key={o.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => set({ gpsMode: o.key })}
                  style={[styles.option, { backgroundColor: c.surface, borderColor: on ? c.forest : 'transparent' }]}
                >
                  <View style={styles.flex}>
                    <T variant="bodyStrong">{o.title}</T>
                    <T variant="caption" color="inkMuted">
                      {o.body}
                    </T>
                  </View>
                  <View style={[styles.radio, { borderColor: on ? c.forest : c.line, backgroundColor: on ? c.forest : 'transparent' }]}>
                    {on ? <CheckIcon size={14} weight="bold" color={c.onForest} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Feedback">
          <View style={[styles.option, { backgroundColor: c.surface, borderColor: 'transparent' }]}>
            <View style={styles.flex}>
              <T variant="bodyStrong">Buzz every {s.units === 'imperial' ? 'mile' : 'km'}</T>
              <T variant="caption" color="inkMuted">
                A short tap so you know without looking.
              </T>
            </View>
            <Switch
              value={s.kmHaptics}
              onValueChange={(v) => {
                set({ kmHaptics: v });
                if (v) haptic.km();
              }}
              trackColor={{ true: c.forest, false: c.line }}
              thumbColor={c.surface}
              accessibilityLabel="Buzz every kilometre"
            />
          </View>
        </Section>

        <Section title="Location access">
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <T variant="body" color={access === 'background' ? 'ink' : 'inkMuted'}>
              {access ? ACCESS_TEXT[access] : 'Checking...'}
            </T>
            {access && access !== 'background' ? <Button label="Fix in settings" variant="forest" onPress={fixAccess} /> : null}
          </View>
        </Section>

        <View style={styles.about}>
          <Pressable onLongPress={__DEV__ ? seed : undefined} delayLongPress={800} accessibilityRole="text">
            <T variant="caption" color="inkFaint" style={styles.center}>
              TrailMate {Constants.expoConfig?.version ?? ''}
            </T>
          </Pressable>
          <T variant="caption" color="inkFaint" style={styles.center}>
            Everything stays on this phone. No accounts, no cloud, no tracking.
          </T>
        </View>
      </ScrollView>
      <StatusBarScrim />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <T variant="label" color="inkMuted" style={styles.sectionTitle}>
        {title}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  content: { paddingHorizontal: space.lg, gap: space.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: space.sm },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 1 },
  segment: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  segmentItem: { flex: 1, minHeight: touch.min, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  options: { gap: space.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    minHeight: 64,
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.md, padding: space.md, gap: space.md },
  about: { gap: space.xs, marginTop: space.md },
});
