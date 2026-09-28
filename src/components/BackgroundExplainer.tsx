import { LockSimpleIcon } from 'phosphor-react-native';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, useTheme } from '../theme/tokens';
import { Button } from './Button';
import { T } from './T';
import { TopoPattern } from './TopoPattern';

interface Props {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

/** Explains why before we ask for "Allow all the time". */
export function BackgroundExplainer({ visible, onAllow, onSkip }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: c.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
          <View style={[styles.art, { backgroundColor: c.forest }]}>
            <TopoPattern width={400} height={120} color={c.contour} seed={42} peaks={3} rings={8} />
            <View style={[styles.lock, { backgroundColor: c.accent }]}>
              <LockSimpleIcon size={28} weight="bold" color={c.onAccent} />
            </View>
          </View>
          <T variant="title">Keep tracking with your phone locked</T>
          <T variant="body" color="inkMuted">
            Pick <T variant="bodyStrong">Allow all the time</T> on the next screen. Your route stays on this phone. Nothing
            is uploaded.
          </T>
          <Button label="Continue" onPress={onAllow} size="lg" />
          <Button label="Not now, keep screen on" onPress={onSkip} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
  },
  art: {
    height: 120,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: { width: 60, height: 60, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
