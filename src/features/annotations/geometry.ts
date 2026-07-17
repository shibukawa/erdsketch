import type { CanvasAnnotation, CanvasPoint } from "./types";

const squaredDistance = (left: CanvasPoint, right: CanvasPoint) => {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
};

function perpendicularSquaredDistance(point: CanvasPoint, start: CanvasPoint, end: CanvasPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return squaredDistance(point, start);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return squaredDistance(point, { x: start.x + ratio * dx, y: start.y + ratio * dy });
}

function deduplicate(points: CanvasPoint[], tolerance: number) {
  if (points.length < 2) return [...points];
  const threshold = tolerance * tolerance;
  const result = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    if (squaredDistance(points[index], result[result.length - 1]) > threshold) result.push(points[index]);
  }
  const last = points[points.length - 1];
  if (squaredDistance(last, result[result.length - 1]) > 0) result.push(last);
  return result;
}

function ramerDouglasPeucker(points: CanvasPoint[], tolerance: number): CanvasPoint[] {
  if (points.length <= 2) return [...points];
  const threshold = tolerance * tolerance;
  let furthestIndex = -1;
  let furthestDistance = threshold;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularSquaredDistance(points[index], points[0], points[points.length - 1]);
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }
  if (furthestIndex < 0) return [points[0], points[points.length - 1]];
  const left = ramerDouglasPeucker(points.slice(0, furthestIndex + 1), tolerance);
  const right = ramerDouglasPeucker(points.slice(furthestIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}

export function simplifyPointSequence(points: CanvasPoint[], tolerance: number, minimumPoints = 2) {
  if (points.length <= minimumPoints || tolerance <= 0) return [...points];
  const deduplicated = deduplicate(points, tolerance);
  const simplified = ramerDouglasPeucker(deduplicated, tolerance);
  return simplified.length >= minimumPoints ? simplified : deduplicated.length >= minimumPoints ? deduplicated : [...points];
}

export function annotationStrokes(annotation: CanvasAnnotation) {
  if (annotation.strokes?.length) return annotation.strokes.map((stroke) => stroke.points);
  return annotation.points?.length ? [annotation.points] : [];
}

export function primaryAnnotationPoints(annotation: CanvasAnnotation) {
  const strokes = annotationStrokes(annotation);
  return strokes.length === 1 ? strokes[0] : undefined;
}

export function screenToleranceToWorld(screenToWorld: (clientX: number, clientY: number) => CanvasPoint, pixels = 2) {
  const origin = screenToWorld(0, 0);
  const offset = screenToWorld(pixels, 0);
  return Math.max(Number.EPSILON, Math.hypot(offset.x - origin.x, offset.y - origin.y));
}
