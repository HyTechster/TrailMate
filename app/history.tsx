import { router, useFocusEffect } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityCard } from '../src/components/ActivityCard';
import { IconButton } from '../src/components/IconButton';
import { StatusBarScrim } from '../src/components/StatusBarScrim';
import { T } from '../src/components/T';
import { TopoPattern } from '../src/components/TopoPattern';
import { listFinishedActivities, type Activity } from '../src/db/queries';
import { formatDistance, formatElevation } from '../src/geo/format';
import { useLayoutSize } from '../src/hooks';
import { useSettings } from '../src/settings';
import { radius, space, useTheme } from '../src/theme/tokens';

type Filter = 'all' | 'hike' | 'run';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hike', label: 'Hikes' },
  { key: 'run', label: 'Runs' },
];

export default function History() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [settings] = useSettings();
  const [all, setAll] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [banner, onBannerLayout] = useLayoutSize();

  useFocusEffect(useCallback(() => setAll(listFinishedActivities()), []));

  const shown = useMemo(() => (filter === 'all' ? all : all.filter((a) => a.type === filter)), [all, filter]);

  const sections = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of shown) {
      const key = new Date(a.started_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return [...map.entries()].map(([title, data]) => ({ title, data }));
  }, [shown]);

  const totals = shown.reduce((t, a) => ({ d: t.d + a.distance_m, g: t.g + a.elevation_gain_m }), { d: 0, g: 0 });
  const td = formatDistance(totals.d, settings.units);
  const tg = formatElevation(totals.g, settings.units);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xxl }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topRow}>
              <IconButton icon={CaretLeftIcon} label="Back" onPress={() => router.back()} />
              <T variant="title">History</T>
              <View style={{ width: 48 }} />
            </View>

            <View style={[styles.totals, { backgroundColor: c.forest }]} onLayout={onBannerLayout}>
              <TopoPattern width={banner.width} height={banner.height} color={c.contour} seed={5} peaks={2} rings={8} />
              <Total value={String(shown.length)} label={shown.length === 1 ? 'trip' : 'trips'} />
              <Total value={td.value} unit={td.unit} label="covered" />
              <Total value={tg.value} unit={tg.unit} label="climbed" />
            </View>

            <View style={styles.filters} accessibilityRole="tablist">
              {FILTERS.map((f) => {
                const on = f.key === filter;
                return (
                  <Pressable
                    key={f.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    onPress={() => setFilter(f.key)}
                    style={[styles.filter, { backgroundColor: on ? c.ink : c.surface }]}
                  >
                    <T variant="label" style={{ color: on ? c.bg : c.ink }}>
                      {f.label}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <T variant="label" color="inkMuted" style={styles.sectionTitle}>
            {section.title}
          </T>
        )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ActivityCard activity={item} units={settings.units} onPress={() => router.push(`/summary/${item.id}`)} />
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: c.surface }]}>
            <T variant="heading">Nothing here yet</T>
            <T variant="body" color="inkMuted" style={styles.center}>
              {filter === 'all' ? 'Finished hikes and runs show up here.' : `No ${filter === 'hike' ? 'hikes' : 'runs'} yet. Time to lace up.`}
            </T>
          </View>
        }
      />
      <StatusBarScrim />
    </View>
  );
}

function Total({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.total}>
      <View style={styles.valueRow}>
        <T variant="stat" color="onForest">
          {value}
        </T>
        {unit ? (
          <T variant="label" color="accent">
            {unit}
          </T>
        ) : null}
      </View>
      <T variant="caption" color="onForestMuted">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { textAlign: 'center' },
  content: { paddingHorizontal: space.lg },
  header: { gap: space.lg, marginBottom: space.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: space.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  total: { gap: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  filters: { flexDirection: 'row', gap: space.xs },
  filter: { paddingHorizontal: space.lg, minHeight: 40, justifyContent: 'center', borderRadius: 999 },
  sectionTitle: { marginTop: space.lg, marginBottom: space.xs, textTransform: 'uppercase', letterSpacing: 1 },
  item: { marginBottom: space.sm },
  empty: { borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.xs, marginTop: space.md },
});
