import { router, useLocalSearchParams } from 'expo-router';
import {
  CameraIcon,
  CaretDownIcon,
  CellSignalFullIcon,
  CellSignalLowIcon,
  CellSignalNoneIcon,
  MountainsIcon,
  PauseIcon,
  PlayIcon,
  SneakerMoveIcon,
  StopIcon,
  TimerIcon,
  TrendUpIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../src/components/Chip';
import { HoldButton } from '../src/components/HoldButton';
import { IconButton } from '../src/components/IconButton';
import { PhotoViewer } from '../src/components/PhotoViewer';
import { RouteMap } from '../src/components/RouteMap';
import { StatTile } from '../src/components/StatTile';
import { T } from '../src/components/T';
import { getActivity, getOpenActivity, getPhotos, getPointsAfter, type Activity, type Photo } from '../src/db/queries';
import { distanceAtTime, totalDistance } from '../src/geo/distance';
import { trackGainLoss } from '../src/geo/elevation';
import { filterPoints } from '../src/geo/filter';
import { formatDistance, formatDuration, formatElevation, formatPace, formatSpeed } from '../src/geo/format';
import { livePace, paceSecPerKm, speedKmh } from '../src/geo/pace';
import { movingTimeS } from '../src/geo/stats';
import type { TrackPoint } from '../src/geo/types';
import { haptic } from '../src/haptics';
import { useLayoutSize, useReduceMotion, useTicker } from '../src/hooks';
import { takePhoto } from '../src/photos/photos';
import { useSettings } from '../src/settings';
import { radius, space, touch, useTheme } from '../src/theme/tokens';
import { onPoints } from '../src/tracking/events';
import { discard, ensureRunning, finish, pause, recoverAndResume, resume, type TrackingMode } from '../src/tracking/tracker';

const POLL_MS = 1500;
const SHEET_H = 360;

export default function Record() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ recover?: string }>();
  const [settings] = useSettings();
  const reduceMotion = useReduceMotion();

  const [activity, setActivity] = useState<Activity | null>(() => getOpenActivity());
  const [raw, setRaw] = useState<TrackPoint[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mode, setMode] = useState<TrackingMode | null>(null);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const lastTs = useRef(0);
  const lastUnit = useRef<number | null>(null);
  const [sheet, onSheetLayout] = useLayoutSize();

  const id = activity?.id;
  const recording = activity?.status === 'recording';

  // Start or recover tracking once, when the screen opens.
  useEffect(() => {
    const a = getOpenActivity();
    if (!a) {
      router.replace('/');
      return;
    }
    const run = params.recover === '1' ? recoverAndResume(a.id) : ensureRunning(a);
    run
      .then((m) => {
        if (m) setMode(m);
        setActivity(getActivity(a.id));
      })
      .catch((e: unknown) => Alert.alert('GPS problem', e instanceof Error ? e.message : 'Could not start GPS.'));
    setPhotos(getPhotos(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The location task writes to SQLite. We read from it: on each event, and on a timer as backup.
  const pull = useCallback(() => {
    if (!id) return;
    const fresh = getPointsAfter(id, lastTs.current);
    if (fresh.length) {
      lastTs.current = fresh[fresh.length - 1].ts;
      setRaw((prev) => prev.concat(fresh));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    pull();
    const t = setInterval(pull, POLL_MS);
    const off = onPoints(pull);
    return () => {
      clearInterval(t);
      off();
    };
  }, [id, pull]);

  const now = useTicker(recording, 1000);
  const type = activity?.type ?? 'hike';

  const stats = useMemo(() => {
    const kept = filterPoints(raw, type);
    return {
      kept,
      distance: totalDistance(kept),
      gain: trackGainLoss(kept).gain,
      live: livePace(kept),
    };
  }, [raw, type]);

  const moving = activity ? movingTimeS(activity.moving_time_s, recording ? activity.segment_started_at : null, now) : 0;

  // A success tap for each full km (or mile).
  useEffect(() => {
    const unitM = settings.units === 'imperial' ? 1609.344 : 1000;
    const whole = Math.floor(stats.distance / unitM);
    if (lastUnit.current === null) {
      lastUnit.current = whole;
      return;
    }
    if (whole > lastUnit.current) {
      lastUnit.current = whole;
      if (settings.kmHaptics) haptic.km();
      showToast(`${whole} ${settings.units === 'imperial' ? 'mi' : 'km'} done. Nice.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.distance]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  };

  const onPauseResume = async () => {
    if (!activity) return;
    haptic.control();
    try {
      if (recording) {
        await pause(activity.id);
      } else {
        setMode(await resume(activity.id));
      }
      setActivity(getActivity(activity.id));
    } catch (e) {
      Alert.alert('GPS problem', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const onFinish = async () => {
    if (!activity) return;
    await finish(activity.id);
    router.replace(`/summary/${activity.id}`);
  };

  const onDiscard = () => {
    if (!activity) return;
    Alert.alert(`Discard this ${type}?`, 'The route and photos will be deleted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await discard(activity.id);
          router.replace('/');
        },
      },
    ]);
  };

  const onPhoto = async () => {
    if (!activity) return;
    const res = await takePhoto(activity.id);
    if (res.ok) {
      haptic.light();
      setPhotos(getPhotos(activity.id));
      const d = formatDistance(distanceAtTime(stats.kept, res.photo.ts), settings.units);
      showToast(`Photo pinned at ${d.value} ${d.unit}`);
    } else if (res.reason === 'permission') {
      Alert.alert('Camera is off', 'Allow camera access to pin photos to your route.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => Linking.openSettings() },
      ]);
    }
  };

  if (!activity) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const u = settings.units;
  const dist = formatDistance(stats.distance, u);
  const gain = formatElevation(stats.gain, u);
  const livePaceF = formatPace(stats.live, u);
  const avgPace = formatPace(paceSecPerKm(stats.distance, moving), u);
  const speed = formatSpeed(speedKmh(stats.distance, moving), u);
  const lastRaw = raw[raw.length - 1];

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <RouteMap
        points={stats.kept}
        photos={photos}
        live
        onPhotoPress={setViewing}
        style={StyleSheet.absoluteFill}
        bottomInset={sheet.height || SHEET_H}
        topInset={insets.top + 56}
      />

      <View style={[styles.topBar, { top: insets.top + space.xs }]}>
        <IconButton icon={CaretDownIcon} label="Back to home, keep recording" onPress={() => router.navigate('/')} />
        <GpsChip accuracy={lastRaw?.accuracy ?? null} hasFix={raw.length > 0} />
      </View>

      <View
        onLayout={onSheetLayout}
        style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.md, shadowColor: c.shadow }]}
      >
        {mode === 'screen-on' ? (
          <Pressable onPress={() => Linking.openSettings()} style={[styles.warn, { backgroundColor: c.warningBg }]} accessibilityRole="button">
            <WarningIcon size={18} weight="fill" color={c.warningInk} />
            <T variant="label" style={[styles.flex, { color: c.warningInk }]}>
              Keep the screen on. Background location is off. Tap to fix.
            </T>
          </Pressable>
        ) : null}

        <View style={styles.statusRow}>
          <StatusPill recording={recording} type={type} reduceMotion={reduceMotion} />
          {toast ? (
            <T variant="label" color="forest" numberOfLines={1} style={styles.toast}>
              {toast}
            </T>
          ) : !recording ? (
            <Pressable onPress={onDiscard} hitSlop={12} accessibilityRole="button" style={styles.discard}>
              <T variant="label" color="danger">
                Discard
              </T>
            </Pressable>
          ) : null}
        </View>

        {type === 'run' ? (
          <>
            <StatTile size="hero" label="Pace now" value={livePaceF.value} unit={livePaceF.unit} icon={SneakerMoveIcon} />
            <View style={styles.statRow}>
              <StatTile size="live" label="Distance" value={dist.value} unit={dist.unit} style={styles.flex} />
              <StatTile size="live" label="Time" value={formatDuration(moving)} icon={TimerIcon} style={styles.flex} />
            </View>
            <T variant="statSmall" color="inkMuted">
              Avg {avgPace.value} {avgPace.unit}
            </T>
          </>
        ) : (
          <>
            <StatTile size="hero" label="Distance" value={dist.value} unit={dist.unit} icon={MountainsIcon} />
            <View style={styles.statRow}>
              <StatTile size="live" label="Time" value={formatDuration(moving)} icon={TimerIcon} style={styles.flex} />
              <StatTile size="live" label="Climb" value={gain.value} unit={gain.unit} icon={TrendUpIcon} style={styles.flex} />
            </View>
            <T variant="statSmall" color="inkMuted">
              {speed.value} {speed.unit}   {avgPace.value} {avgPace.unit}
            </T>
          </>
        )}

        <View style={styles.controls}>
          <IconButton icon={CameraIcon} label="Take a photo" onPress={onPhoto} size={72} bg="surfaceAlt" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Pause' : 'Resume'}
            onPress={onPauseResume}
            style={({ pressed }) => [
              styles.main,
              { backgroundColor: recording ? c.accent : c.forest, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            {recording ? (
              <PauseIcon size={40} weight="fill" color={c.onAccent} />
            ) : (
              <PlayIcon size={40} weight="fill" color={c.onForest} />
            )}
          </Pressable>
          <HoldButton icon={StopIcon} label={`Finish ${type}`} onComplete={onFinish} size={72} />
        </View>
        <T variant="caption" color="inkFaint" style={styles.hint}>
          Hold the stop button to finish
        </T>
      </View>

      <PhotoViewer
        photo={viewing}
        distanceM={viewing ? distanceAtTime(stats.kept, viewing.ts) : null}
        activityType={type}
        units={u}
        onClose={() => setViewing(null)}
      />
    </View>
  );
}

function GpsChip({ accuracy, hasFix }: { accuracy: number | null; hasFix: boolean }) {
  if (!hasFix) return <Chip label="Finding GPS" icon={CellSignalNoneIcon} bg="surface" fg="inkMuted" />;
  if (accuracy !== null && accuracy > 25) return <Chip label="Weak GPS" icon={CellSignalLowIcon} bg="warningBg" fg="warningInk" />;
  return <Chip label="GPS locked" icon={CellSignalFullIcon} bg="surface" fg="moss" />;
}

function StatusPill({ recording, type, reduceMotion }: { recording: boolean; type: 'hike' | 'run'; reduceMotion: boolean }) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!recording || reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [recording, reduceMotion, pulse]);

  const label = `${type === 'hike' ? 'Hike' : 'Run'} ${recording ? 'recording' : 'paused'}`;
  return (
    <View style={[styles.pill, { backgroundColor: recording ? c.accentSoft : c.surfaceAlt }]} accessibilityLabel={label}>
      <View style={styles.dotWrap}>
        {recording ? (
          <Animated.View
            style={[
              styles.dot,
              styles.dotHalo,
              { backgroundColor: c.accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }) },
              { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] },
            ]}
          />
        ) : null}
        <View style={[styles.dot, { backgroundColor: recording ? c.accent : c.inkFaint }]} />
      </View>
      <T variant="label">{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.sm,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    minHeight: 40,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  toast: { flexShrink: 1 },
  discard: { minHeight: touch.min, justifyContent: 'center' },
  statRow: { flexDirection: 'row', gap: space.md },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    paddingHorizontal: space.xs,
  },
  main: {
    width: touch.record,
    height: touch.record,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { textAlign: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotHalo: { position: 'absolute' },
});
