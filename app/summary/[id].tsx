import { router, useLocalSearchParams } from 'expo-router';
import {
  CaretLeftIcon,
  LightningIcon,
  PencilSimpleIcon,
  PersonSimpleHikeIcon,
  PersonSimpleRunIcon,
  RulerIcon,
  ShareNetworkIcon,
  TimerIcon,
  TrendUpIcon,
  XIcon,
} from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forgetPreview } from '../../src/components/ActivityCard';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { ElevationChart } from '../../src/components/ElevationChart';
import { IconButton } from '../../src/components/IconButton';
import { PhotoViewer } from '../../src/components/PhotoViewer';
import { RouteMap } from '../../src/components/RouteMap';
import { StatTile } from '../../src/components/StatTile';
import { StatusBarScrim } from '../../src/components/StatusBarScrim';
import { T } from '../../src/components/T';
import { getActivity, getPhotos, getPoints, updateTitle, type Photo } from '../../src/db/queries';
import { cumulativeDistances, distanceAtTime } from '../../src/geo/distance';
import { elevationProfile } from '../../src/geo/elevation';
import { filterPoints } from '../../src/geo/filter';
import { formatDistance, formatDuration, formatElevation, formatPace, formatSpeed } from '../../src/geo/format';
import { kmSplits, paceSecPerKm, speedKmh } from '../../src/geo/pace';
import { haptic } from '../../src/haptics';
import { photoUri } from '../../src/photos/photos';
import { useSettings } from '../../src/settings';
import { shareCard } from '../../src/share/share';
import { CARD_H, CARD_W, SummaryCard } from '../../src/share/SummaryCard';
import { font, radius, space, touch, useTheme } from '../../src/theme/tokens';
import { removeActivity } from '../../src/tracking/tracker';

const MAP_H = 340;

export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [settings] = useSettings();
  const u = settings.units;

  const [activity, setActivity] = useState(() => getActivity(id));
  const data = useMemo(() => {
    if (!activity) return null;
    const kept = filterPoints(getPoints(activity.id), activity.type);
    return {
      kept,
      cum: cumulativeDistances(kept),
      profile: elevationProfile(kept),
      splits: kmSplits(kept),
      photos: getPhotos(activity.id),
    };
  }, [activity]);

  const [title, setTitle] = useState(activity?.title ?? '');
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [sharing, setSharing] = useState(false);
  const [pastMap, setPastMap] = useState(false);

  if (!activity || !data) {
    return (
      <View style={[styles.missing, { backgroundColor: c.bg }]}>
        <T variant="heading">This activity is gone.</T>
        <Button label="Back home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const a = activity;
  const dist = formatDistance(a.distance_m, u);
  const pace = formatPace(paceSecPerKm(a.distance_m, a.moving_time_s), u);
  const speed = formatSpeed(speedKmh(a.distance_m, a.moving_time_s), u);
  const gain = formatElevation(a.elevation_gain_m, u);
  const loss = formatElevation(a.elevation_loss_m, u);
  const when = new Date(a.started_at);
  const dateLine = `${when.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}, ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

  const saveTitle = () => {
    const t = title.trim() || a.title || '';
    setTitle(t);
    updateTitle(a.id, t);
    setActivity(getActivity(a.id));
  };

  const onDelete = () => {
    Alert.alert(`Delete this ${a.type}?`, 'The route, stats and photos will be removed from this phone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeActivity(a.id);
          forgetPreview(a.id);
          router.replace('/');
        },
      },
    ]);
  };

  const fastest = data.splits.filter((s) => s.distanceM >= 999).reduce<number | null>((m, s) => (m === null || s.timeS < m ? s.timeS : m), null);
  const bestPerKm = data.splits.reduce((m, s) => Math.min(m, s.timeS / (s.distanceM / 1000)), Infinity);
  const TypeIcon = a.type === 'hike' ? PersonSimpleHikeIcon : PersonSimpleRunIcon;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > MAP_H - 24 - insets.top;
          if (past !== pastMap) setPastMap(past);
        }}
      >
        <View style={styles.mapWrap}>
          <RouteMap points={data.kept} photos={data.photos} onPhotoPress={setViewing} style={StyleSheet.absoluteFill} topInset={insets.top + 64} bottomInset={24} />
          <View style={[styles.mapBar, { top: insets.top + space.xs }]}>
            <IconButton icon={CaretLeftIcon} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            <IconButton icon={ShareNetworkIcon} label="Share" onPress={() => setSharing(true)} bg="accent" fg="onAccent" />
          </View>
        </View>

        <View style={[styles.body, { backgroundColor: c.bg }]}>
          <View style={styles.titleBlock}>
            <Chip label={a.type === 'hike' ? 'Hike' : 'Run'} icon={TypeIcon} bg="surfaceAlt" fg="forest" />
            <View style={styles.titleRow}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                onBlur={saveTitle}
                onSubmitEditing={saveTitle}
                returnKeyType="done"
                multiline
                submitBehavior="blurAndSubmit"
                scrollEnabled={false}
                accessibilityLabel="Activity title"
                maxLength={80}
                style={[styles.titleInput, { color: c.ink }]}
                selectionColor={c.accent}
              />
              <PencilSimpleIcon size={18} weight="bold" color={c.inkFaint} />
            </View>
            <T variant="caption" color="inkMuted">
              {dateLine}
            </T>
          </View>

          <View style={styles.grid}>
            <StatTile label="Distance" value={dist.value} unit={dist.unit} icon={RulerIcon} style={styles.cell} />
            <StatTile label="Moving time" value={formatDuration(a.moving_time_s)} icon={TimerIcon} style={styles.cell} />
            <StatTile label="Avg pace" value={pace.value} unit={pace.unit} icon={LightningIcon} style={styles.cell} />
            <StatTile label="Elevation gain" value={gain.value} unit={gain.unit} icon={TrendUpIcon} style={styles.cell} />
          </View>

          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <View style={styles.rowBetween}>
              <T variant="heading">Elevation</T>
              <T variant="caption" color="inkMuted">
                +{gain.value} / -{loss.value} {gain.unit}
              </T>
            </View>
            <ElevationChart profile={data.profile} units={u} />
          </View>

          {data.photos.length ? (
            <View style={styles.section}>
              <T variant="heading">Photos on the trail</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {data.photos.map((p) => {
                  const d = formatDistance(distanceAtTime(data.kept, p.ts), u);
                  return (
                    <Pressable key={p.id} onPress={() => setViewing(p)} accessibilityRole="imagebutton" accessibilityLabel={`Photo at ${d.value} ${d.unit}`}>
                      <Image source={{ uri: photoUri(p.uri) }} style={[styles.thumb, { backgroundColor: c.surfaceAlt }]} />
                      <T variant="caption" color="inkMuted" style={styles.thumbLabel}>
                        {d.value} {d.unit}
                      </T>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {data.splits.length > 1 ? (
            <View style={[styles.card, { backgroundColor: c.surface }]}>
              <View style={styles.rowBetween}>
                <T variant="heading">Splits</T>
                <T variant="caption" color="inkMuted">
                  {a.type === 'hike' ? `Avg ${speed.value} ${speed.unit}` : `Avg ${pace.value} ${pace.unit}`}
                </T>
              </View>
              {data.splits.map((s) => {
                const perKm = s.timeS / (s.distanceM / 1000);
                const p = formatPace(perKm, 'metric');
                const isBest = fastest !== null && s.timeS === fastest;
                return (
                  <View key={s.km} style={styles.split}>
                    <T variant="statSmall" color="inkMuted" style={styles.splitKm}>
                      {s.distanceM < 999 ? `${(s.distanceM / 1000).toFixed(1)}` : s.km}
                    </T>
                    <View style={styles.splitBarWrap}>
                      <View
                        style={{
                          height: 10,
                          borderRadius: radius.pill,
                          width: `${Math.max(8, Math.min(100, (bestPerKm / perKm) * 100))}%`,
                          backgroundColor: isBest ? c.accent : c.moss,
                        }}
                      />
                    </View>
                    <T variant="statSmall" style={styles.splitPace}>
                      {p.value}
                    </T>
                  </View>
                );
              })}
              <T variant="caption" color="inkFaint">
                Pace per km. Longer bar means faster. Orange is your best km.
              </T>
            </View>
          ) : null}

          <Button label="Share summary" icon={ShareNetworkIcon} size="lg" onPress={() => setSharing(true)} />
          <Button label={`Delete ${a.type}`} variant="danger" onPress={onDelete} />
        </View>
      </ScrollView>
      {pastMap ? <StatusBarScrim /> : null}

      <PhotoViewer
        photo={viewing}
        distanceM={viewing ? distanceAtTime(data.kept, viewing.ts) : null}
        activityType={a.type}
        units={u}
        onClose={() => setViewing(null)}
      />

      <SharePreview
        visible={sharing}
        onClose={() => setSharing(false)}
        card={(ref) => (
          <SummaryCard
            ref={ref}
            activity={{ ...a, title: title || a.title }}
            points={data.kept}
            coverUri={data.photos[0] ? photoUri(data.photos[0].uri) : null}
            units={u}
          />
        )}
        title={title || a.title || 'TrailMate'}
      />
    </View>
  );
}

function SharePreview({
  visible,
  onClose,
  card,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  card: (ref: React.RefObject<View | null>) => React.ReactNode;
  title: string;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const scale = Math.min((width - space.xl * 2) / CARD_W, (height - insets.top - insets.bottom - 220) / CARD_H, 1.2);

  const onShare = async () => {
    setBusy(true);
    try {
      await shareCard(ref, title);
      haptic.success();
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.preview, { backgroundColor: c.forestDeep, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.previewBar}>
          <T variant="heading" color="onForest">
            Your trail card
          </T>
          <IconButton icon={XIcon} label="Close" onPress={onClose} bg="forest" fg="onForest" />
        </View>
        <View style={{ width: CARD_W * scale, height: CARD_H * scale, alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden' }}>
          <View
            style={{
              width: CARD_W,
              height: CARD_H,
              transform: [
                { translateX: (CARD_W * scale - CARD_W) / 2 },
                { translateY: (CARD_H * scale - CARD_H) / 2 },
                { scale },
              ],
            }}
          >
            {card(ref)}
          </View>
        </View>
        <View style={styles.previewActions}>
          <T variant="caption" color="onForestMuted" style={styles.center}>
            1080 x 1350, sized for Instagram and WhatsApp
          </T>
          <Button label={busy ? 'Preparing' : 'Share image'} icon={ShareNetworkIcon} size="lg" onPress={onShare} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { textAlign: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  mapWrap: { height: MAP_H },
  mapBar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  body: {
    marginTop: -24,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    gap: space.lg,
  },
  titleBlock: { gap: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  titleInput: {
    flex: 1,
    fontFamily: font.display,
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 32,
    paddingVertical: 4,
    minHeight: touch.min,
    textAlignVertical: 'top',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { flexBasis: '47%', flexGrow: 1 },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { gap: space.sm },
  strip: { gap: space.sm },
  thumb: { width: 108, height: 136, borderRadius: radius.md },
  thumbLabel: { marginTop: 4 },
  split: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  splitKm: { width: 28 },
  splitBarWrap: { flex: 1 },
  splitPace: { width: 48, textAlign: 'right' },
  preview: { flex: 1, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  previewBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewActions: { gap: space.sm },
});
