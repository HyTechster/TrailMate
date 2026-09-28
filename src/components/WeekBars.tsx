import { StyleSheet, View } from 'react-native';
import { radius, space, useTheme } from '../theme/tokens';
import { T } from './T';

interface Props {
  /** Metres per day, oldest first, ending today. */
  days: number[];
  endDate: Date;
  height?: number;
}

const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // by Date.getDay()

/** Seven little bars for the week. Empty days show a small stub. */
export function WeekBars({ days, endDate, height = 64 }: Props) {
  const { c } = useTheme();
  const max = Math.max(...days, 1);
  return (
    <View style={styles.row} accessible accessibilityLabel="Distance per day, last 7 days">
      {days.map((m, i) => {
        const h = m > 0 ? Math.max(8, (m / max) * height) : 4;
        const isToday = i === days.length - 1;
        const dow = (endDate.getDay() - (days.length - 1 - i) + 7) % 7;
        return (
          <View key={i} style={styles.col}>
            <View style={{ height, justifyContent: 'flex-end' }}>
              <View
                style={{
                  width: 18,
                  height: h,
                  borderRadius: radius.sm,
                  backgroundColor: m > 0 ? (isToday ? c.accent : c.moss) : c.line,
                }}
              />
            </View>
            <T variant="caption" color={isToday ? 'ink' : 'inkFaint'}>
              {LABELS[dow]}
            </T>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: space.xxs + 2 },
});
