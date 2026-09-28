import Constants from 'expo-constants';
import { WifiSlashIcon } from 'phosphor-react-native';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Photo } from '../db/queries';
import { splitSegments } from '../geo/distance';
import { projectRoute, thin, toPath } from '../geo/project';
import type { TrackPoint } from '../geo/types';
import { useLayoutSize, useOffline } from '../hooks';
import { photoUri } from '../photos/photos';
import { radius, useTheme } from '../theme/tokens';
import { Chip } from './Chip';
import { TopoPattern } from './TopoPattern';

interface Props {
  points: readonly TrackPoint[];
  photos?: readonly Photo[];
  /** Follow the latest point (record screen). Otherwise fit the whole route. */
  live?: boolean;
  onPhotoPress?: (photo: Photo) => void;
  style?: StyleProp<ViewStyle>;
  /** Extra space at the bottom, e.g. under a bottom sheet. */
  bottomInset?: number;
  topInset?: number;
}

/**
 * Google Maps on Android needs an API key. Without one (a fresh clone), we
 * draw the route on a topo background instead, same as when tiles are missing
 * offline, so the screen is never broken.
 */
const HAS_MAP_TILES = Platform.OS !== 'android' || Boolean(Constants.expoConfig?.extra?.hasAndroidMapsKey);

export const RouteMap = memo(function RouteMap(props: Props) {
  const offline = useOffline();
  const { c } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: c.mapBlank }, props.style]}>
      {HAS_MAP_TILES ? <NativeMap {...props} /> : <TrailCanvas {...props} />}
      {offline ? (
        <Chip
          label="Offline"
          icon={WifiSlashIcon}
          bg="forestDeep"
          fg="onForest"
          style={[styles.offline, { top: (props.topInset ?? 0) + 12 }]}
        />
      ) : null}
    </View>
  );
});

function PhotoPin({ photo, size = 40 }: { photo: Photo; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={[styles.pin, { width: size, height: size, borderColor: c.surface, backgroundColor: c.accent }]}>
      <Image source={{ uri: photoUri(photo.uri) }} style={{ width: size - 6, height: size - 6, borderRadius: size }} />
    </View>
  );
}

function NativeMap({ points, photos = [], live, onPhotoPress, bottomInset = 0, topInset = 0 }: Props) {
  const { c, scheme } = useTheme();
  const ref = useRef<MapView>(null);
  const [tracks, setTracks] = useState(true);
  const segments = useMemo(
    () => splitSegments(points).map((s) => thin(s, 1500).map((p) => ({ latitude: p.lat, longitude: p.lng }))),
    [points],
  );
  const last = points[points.length - 1];
  const edgePadding = { top: 60 + topInset, right: 50, bottom: 50 + bottomInset, left: 50 };

  useEffect(() => {
    if (!ref.current || points.length === 0) return;
    if (live && last) {
      ref.current.animateCamera({ center: { latitude: last.lat, longitude: last.lng } }, { duration: 600 });
    } else {
      ref.current.fitToCoordinates(
        points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding, animated: false },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live ? last?.ts : points.length]);

  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 1500);
    return () => clearTimeout(t);
  }, [photos.length]);

  const initial = last
    ? { latitude: last.lat, longitude: last.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : // Kuala Lumpur, until the first fix arrives.
      { latitude: 3.139, longitude: 101.6869, latitudeDelta: 0.2, longitudeDelta: 0.2 };

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={initial}
      showsUserLocation={live}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      userInterfaceStyle={scheme}
      mapPadding={{ top: topInset, right: 0, bottom: bottomInset, left: 0 }}
      onMapReady={() => {
        if (!live && points.length) {
          ref.current?.fitToCoordinates(
            points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
            { edgePadding, animated: false },
          );
        }
      }}
    >
      {segments.map((coords, i) => (
        <Polyline key={`casing${i}`} coordinates={coords} strokeColor={c.routeCasing} strokeWidth={8} lineCap="round" lineJoin="round" />
      ))}
      {segments.map((coords, i) => (
        <Polyline key={`route${i}`} coordinates={coords} strokeColor={c.route} strokeWidth={5} lineCap="round" lineJoin="round" />
      ))}
      {photos
        .filter((p) => p.lat !== null && p.lng !== null)
        .map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat!, longitude: p.lng! }}
            onPress={() => onPhotoPress?.(p)}
            tracksViewChanges={tracks}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <PhotoPin photo={p} />
          </Marker>
        ))}
    </MapView>
  );
}

/** Route and photo pins on a topo background. Works with zero tiles. */
function TrailCanvas({ points, photos = [], live, onPhotoPress, bottomInset = 0, topInset = 0 }: Props) {
  const { c } = useTheme();
  const [size, onLayout] = useLayoutSize();
  const box = { width: size.width, height: Math.max(0, size.height - bottomInset - topInset) };
  const pad = 36;

  const { paths, project, last } = useMemo(() => {
    const proj = projectRoute(points, box.width, box.height, pad);
    const segs = proj.segments.map((s) => thin(s, 600));
    const lastSeg = segs[segs.length - 1];
    return { paths: segs.map(toPath), project: proj.project, last: lastSeg?.[lastSeg.length - 1] };
  }, [points, box.width, box.height]);

  const pinned = photos.filter((p) => p.lat !== null && p.lng !== null);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <TopoPattern width={size.width} height={size.height} color={c.line} opacity={0.7} seed={points.length ? Math.round(points[0].lat * 1e4) : 11} peaks={3} rings={10} />
      <View style={{ position: 'absolute', top: topInset, left: 0 }}>
        {box.width > 0 && paths.length ? (
          <Svg width={box.width} height={box.height}>
            {paths.map((d, i) => (
              <Path key={`c${i}`} d={d} stroke={c.routeCasing} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {paths.map((d, i) => (
              <Path key={i} d={d} stroke={c.route} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {last ? (
              <>
                {live ? <Circle cx={last.x} cy={last.y} r={16} fill={c.accent} opacity={0.22} /> : null}
                <Circle cx={last.x} cy={last.y} r={8} fill={live ? c.accent : c.forest} stroke={c.routeCasing} strokeWidth={3} />
              </>
            ) : null}
          </Svg>
        ) : null}
        {box.width > 0
          ? pinned.map((p) => {
              const xy = project({ lat: p.lat!, lng: p.lng! });
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Open photo"
                  onPress={() => onPhotoPress?.(p)}
                  hitSlop={8}
                  style={{ position: 'absolute', left: xy.x - 20, top: xy.y - 20 }}
                >
                  <PhotoPin photo={p} />
                </Pressable>
              );
            })
          : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  offline: { position: 'absolute', right: 12 },
  pin: {
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
