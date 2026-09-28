import { useNetworkState } from 'expo-network';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, type LayoutChangeEvent } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

export function useOffline(): boolean {
  const net = useNetworkState();
  return net.isConnected === false || net.isInternetReachable === false;
}

export function useLayoutSize(): [{ width: number; height: number }, (e: LayoutChangeEvent) => void] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (Math.abs(s.width - width) < 0.5 && Math.abs(s.height - height) < 0.5 ? s : { width, height }));
  };
  return [size, onLayout];
}

/** Re-renders every `ms` while `active`. */
export function useTicker(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}
