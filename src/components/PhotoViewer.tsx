import { MapPinIcon, XIcon } from 'phosphor-react-native';
import { Image, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Photo } from '../db/queries';
import { formatDistance, type Units } from '../geo/format';
import { photoUri } from '../photos/photos';
import { radius, space, useTheme } from '../theme/tokens';
import { IconButton } from './IconButton';
import { T } from './T';

interface Props {
  photo: Photo | null;
  /** Distance along the route when the photo was taken, in metres. */
  distanceM: number | null;
  activityType: 'hike' | 'run';
  units: Units;
  onClose: () => void;
}

export function PhotoViewer({ photo, distanceM, activityType, units, onClose }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!photo) return null;
  const time = new Date(photo.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const d = distanceM !== null ? formatDistance(distanceM, units) : null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: c.forestDeep }]}>
        <Image source={{ uri: photoUri(photo.uri) }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel="Trail photo" />
        <IconButton icon={XIcon} label="Close photo" onPress={onClose} bg="scrim" fg="onForest" style={[styles.close, { top: insets.top + space.sm }]} />
        <View style={[styles.info, { bottom: insets.bottom + space.lg, backgroundColor: c.scrim }]}>
          <MapPinIcon size={18} weight="fill" color={c.accent} />
          <T variant="bodyStrong" color="onForest">
            {time}
            {d ? `  ·  ${d.value} ${d.unit} into the ${activityType}` : ''}
          </T>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  close: { position: 'absolute', right: space.md },
  info: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
});
