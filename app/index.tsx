import { router, useFocusEffect } from 'expo-router';
import {
  ArrowRightIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  MountainsIcon,
  SneakerMoveIcon,
  WarningCircleIcon,
} from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityCard } from '../src/components/ActivityCard';
import { BlazeMark } from '../src/components/BlazeMark';
import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { RouteShape } from '../src/components/RouteShape';
import { StatusBarScrim } from '../src/components/StatusBarScrim';
import { T } from '../src/components/T';
import { TopoPattern } from '../src/components/TopoPattern';
import { WeekBars } from '../src/components/WeekBars';
import { getOpenActivity, listFinishedActivities, type Activity } from '../src/db/queries';
import { formatDistance, formatDuration, formatElevation } from '../src/geo/format';
import type { ActivityType } from '../src/geo/types';
import { haptic } from '../src/haptics';
import { useLayoutSize } from '../src/hooks';
import { useSettings } from '../src/settings';
import { radius, space, useTheme } from '../src/theme/tokens';
import { finish, isTracking } from '../src/tracking/tracker';
import { useStartActivity } from '../src/tracking/useStartActivity';

/** Midnight six days ago: the start of a rolling 7-day window ending today. */
function weekWindowStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [settings] = useSettings();
  const { start, busy, modal } = useStartActivity();
  const [recent, setRecent] = useState<Activity[]>([]);
  const [week, setWeek] = useState<{ days: number[]; dist: number; time: number; gain: number }>({ days: [0, 0, 0, 0, 0, 0, 0], dist: 0, time: 0, gain: 0 });
  const [open, setOpen] = useState<{ activity: Activity; live: boolean } | null>(null);
  const [hero, onHeroLayout] = useLayoutSize();

  const refresh = useCallback(() => {
    const all = listFinishedActivities(200);
    setRecent(all.slice(0, 3));
    const now = new Date();
    const from = weekWindowStart(now).getTime();
    const days = [0, 0, 0, 0, 0, 0, 0];
    let dist = 0;
    let time = 0;
    let gain = 0;
    for (const a of all) {
      if (a.started_at < from) continue;
      const i = Math.min(6, Math.floor((a.started_at - from) / 86_400_000));
      days[i] += a.distance_m;
      dist += a.distance_m;
      time += a.moving_time_s;
      gain += a.elevation_gain_m;
    }
    setWeek({ days, dist, time, gain });

    const o = getOpenActivity();
    if (!o) setOpen(null);
    else isTracking().then((live) => setOpen({ activity: o, live }));
  }, []);

  useFocusEffect(refresh);

  const onStart = (type: ActivityType) => {
    if (open) {
      router.push('/record');
      return;
    }
    start(type);
  };

  const now = new Date();
  const activeDays = week.days.filter((d) => d > 0).length;
  const wd = formatDistance(week.dist, settings.units);
  const wg = formatElevation(week.gain, settings.units);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.header}>
          <BlazeMark size={20} />
          <View style={styles.headerActions}>
            <IconButton icon={ClockCounterClockwiseIcon} label="History" onPress={() => router.push('/history')} />
            <IconButton icon={GearSixIcon} label="Settings" onPress={() => router.push('/settings')} />
          </View>
        </View>

        <View style={styles.greeting}>
          <T variant="label" color="inkMuted">
            {greeting(now)}
          </T>
          <T variant="hero">Jom, let's move.</T>
        </View>

        {open ? <OpenBanner open={open} onChange={refresh} /> : null}

        <View style={[styles.hero, { backgroundColor: c.forest }]} onLayout={onHeroLayout}>
          <TopoPattern width={hero.width} height={hero.height} color={c.contour} seed={19} peaks={3} rings={10} />
          <T variant="heading" color="onForest">
            Pick your trail
          </T>
          <T variant="body" color="onForestMuted" style={styles.heroBody}>
            GPS keeps going with the phone in your pocket, even with no signal.
          </T>
          <View style={styles.startRow}>
            <StartTile
              label="Hike"
              hint="Hills and forest"
              icon={MountainsIcon}
              primary
              disabled={busy}
              onPress={() => onStart('hike')}
            />
            <StartTile label="Run" hint="Roads and parks" icon={SneakerMoveIcon} disabled={busy} onPress={() => onStart('run')} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <View style={styles.rowBetween}>
            <T variant="heading">Last 7 days</T>
            <T variant="caption" color="inkMuted">
              {activeDays === 1 ? '1 active day' : `${activeDays} active days`}
            </T>
          </View>
          <View style={styles.weekStats}>
            <WeekStat value={wd.value} unit={wd.unit} label="Distance" />
            <WeekStat value={formatDuration(week.time)} label="Moving" />
            <WeekStat value={wg.value} unit={wg.unit} label="Climbed" />
          </View>
          <WeekBars days={week.days} endDate={now} />
        </View>

        <View style={styles.rowBetween}>
          <T variant="heading">Recent trails</T>
          {recent.length ? (
            <Pressable onPress={() => router.push('/history')} hitSlop={12} accessibilityRole="link" style={styles.seeAll}>
              <T variant="label" color="forest">
                See all
              </T>
              <ArrowRightIcon size={14} weight="bold" color={c.forest} />
            </Pressable>
          ) : null}
        </View>

        {recent.length ? (
          <View style={styles.list}>
            {recent.map((a) => (
              <ActivityCard key={a.id} activity={a} units={settings.units} onPress={() => router.push(`/summary/${a.id}`)} />
            ))}
          </View>
        ) : (
          <EmptyTrails />
        )}
      </ScrollView>
      <StatusBarScrim />
      {modal}
    </View>
  );
}

function StartTile({
  label,
  hint,
  icon: IconCmp,
  primary,
  disabled,
  onPress,
}: {
  label: string;
  hint: string;
  icon: typeof MountainsIcon;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Start ${label.toLowerCase()}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.startTile,
        { backgroundColor: primary ? c.accent : c.onForest, transform: [{ scale: pressed ? 0.97 : 1 }, { rotate: primary ? '-1.5deg' : '1.5deg' }] },
      ]}
    >
      <IconCmp size={34} weight="duotone" color={primary ? c.onAccent : c.forest} />
      <View>
        <T variant="title" style={{ color: primary ? c.onAccent : c.forestDeep }}>
          {label}
        </T>
        <T variant="caption" style={{ color: primary ? c.onAccent : c.forest, opacity: 0.8 }}>
          {hint}
        </T>
      </View>
    </Pressable>
  );
}

function WeekStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.weekStat}>
      <View style={styles.valueRow}>
        <T variant="stat">{value}</T>
        {unit ? (
          <T variant="label" color="inkMuted">
            {unit}
          </T>
        ) : null}
      </View>
      <T variant="caption" color="inkMuted">
        {label}
      </T>
    </View>
  );
}

function OpenBanner({ open, onChange }: { open: { activity: Activity; live: boolean }; onChange: () => void }) {
  const { c } = useTheme();
  const a = open.activity;
  const time = new Date(a.started_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (open.live || a.status === 'paused') {
    return (
      <Pressable
        onPress={() => router.push('/record')}
        accessibilityRole="button"
        style={[styles.banner, { backgroundColor: c.accentSoft }]}
      >
        <View style={[styles.liveDot, { backgroundColor: c.accent }]} />
        <T variant="bodyStrong" style={styles.flex}>
          {a.status === 'paused' ? `Your ${a.type} is paused` : `Recording your ${a.type}`}
        </T>
        <ArrowRightIcon size={18} weight="bold" color={c.ink} />
      </Pressable>
    );
  }

  // The app was closed mid-activity. Offer to pick it back up.
  return (
    <View style={[styles.banner, styles.bannerCol, { backgroundColor: c.warningBg }]}>
      <View style={styles.bannerRow}>
        <WarningCircleIcon size={22} weight="fill" color={c.warningInk} />
        <T variant="bodyStrong" style={[styles.flex, { color: c.warningInk }]}>
          Your {a.type} from {time} didn't finish
        </T>
      </View>
      <View style={styles.bannerRow}>
        <Button
          label="Resume"
          variant="forest"
          style={styles.flex}
          onPress={() => {
            haptic.control();
            router.push({ pathname: '/record', params: { recover: '1' } });
          }}
        />
        <Button
          label="Finish"
          variant="ghost"
          style={styles.flex}
          onPress={async () => {
            haptic.control();
            await finish(a.id, { recovered: true });
            onChange();
            router.push(`/summary/${a.id}`);
          }}
        />
      </View>
    </View>
  );
}

function EmptyTrails() {
  const { c } = useTheme();
  const [size, onLayout] = useLayoutSize();
  // A dotted, not-yet-walked trail.
  const demo = [
    { lat: 0, lng: 0 },
    { lat: 0.2, lng: 0.35 },
    { lat: 0.1, lng: 0.7 },
    { lat: 0.45, lng: 1 },
  ].map((p, i) => ({ ...p, ts: i, altitude: null, accuracy: null, speed: null, segment: 0 }));
  return (
    <View style={[styles.empty, { backgroundColor: c.surfaceAlt }]} onLayout={onLayout}>
      <TopoPattern width={size.width} height={size.height} color={c.line} opacity={0.55} seed={3} peaks={2} rings={7} />
      <View style={styles.emptyRoute}>
        <RouteShape points={demo} width={200} height={70} color={c.moss} strokeWidth={3} />
      </View>
      <T variant="heading">Your first trail starts here</T>
      <T variant="body" color="inkMuted" style={styles.center}>
        Tap Hike or Run above. Your routes, photos and stats land here.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  scroll: { paddingHorizontal: space.lg, gap: space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: space.xs },
  greeting: { gap: 2, marginTop: space.xs },
  hero: { borderRadius: radius.lg, padding: space.lg, overflow: 'hidden', gap: space.xs },
  heroBody: { maxWidth: 280 },
  startRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  startTile: {
    flex: 1,
    minHeight: 140,
    borderRadius: radius.lg,
    padding: space.md,
    justifyContent: 'space-between',
  },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48 },
  weekStats: { flexDirection: 'row', justifyContent: 'space-between' },
  weekStat: { gap: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  list: { gap: space.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    minHeight: 56,
  },
  bannerCol: { flexDirection: 'column', alignItems: 'stretch' },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.xs, overflow: 'hidden' },
  emptyRoute: { marginBottom: space.xs },
});
