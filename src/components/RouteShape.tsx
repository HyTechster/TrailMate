import { memo, useMemo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { projectRoute, thin, toPath } from '../geo/project';
import type { TrackPoint } from '../geo/types';

interface Props {
  points: readonly TrackPoint[];
  width: number;
  height: number;
  color: string;
  casing?: string;
  strokeWidth?: number;
  padding?: number;
  /** Draw start and finish dots. */
  ends?: boolean;
  endColor?: string;
}

/** The route drawn as a plain SVG shape. No tiles, so it works offline. */
export const RouteShape = memo(function RouteShape({
  points,
  width,
  height,
  color,
  casing,
  strokeWidth = 3,
  padding = 8,
  ends = true,
  endColor,
}: Props) {
  const { paths, start, end } = useMemo(() => {
    const proj = projectRoute(points, width, height, padding + strokeWidth);
    const segs = proj.segments.map((s) => thin(s, 400));
    const first = segs[0]?.[0];
    const lastSeg = segs[segs.length - 1];
    return { paths: segs.map(toPath), start: first, end: lastSeg?.[lastSeg.length - 1] };
  }, [points, width, height, padding, strokeWidth]);

  if (!paths.length) return null;
  return (
    <Svg width={width} height={height}>
      {casing
        ? paths.map((d, i) => (
            <Path key={`c${i}`} d={d} stroke={casing} strokeWidth={strokeWidth + 4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))
        : null}
      {paths.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {ends && start ? <Circle cx={start.x} cy={start.y} r={strokeWidth + 1.5} fill={casing ?? color} stroke={color} strokeWidth={2} /> : null}
      {ends && end ? <Circle cx={end.x} cy={end.y} r={strokeWidth + 2} fill={endColor ?? color} stroke={casing ?? color} strokeWidth={2} /> : null}
    </Svg>
  );
});
