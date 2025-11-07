import { HandleType, Point } from "../types";

const CURVE_TENSION = 0.2; // Adjust this value to change the "S" shape intensity

/**
 * Calculates the control points for a smooth cubic Bezier curve between two points,
 * based on the orientation of the handles.
 * @param startPoint The starting point of the wire.
 * @param endPoint The ending point of the wire.
 * @param startHandle The handle type on the starting element.
 * @param endHandle The handle type on the ending element.
 * @returns An object containing the two control points { cp1, cp2 }.
 */
export function getCubicBezierControlPoints(
	startPoint: Point,
	endPoint: Point,
	startHandle: HandleType,
	endHandle: HandleType
): { cp1: Point; cp2: Point } {
	const dist = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
	const tension = dist * CURVE_TENSION;

	const cp1 = { ...startPoint };
	const cp2 = { ...endPoint };

	// Adjust control point 1 based on the start handle
	if (startHandle.includes("right")) cp1.x += tension;
	if (startHandle.includes("left")) cp1.x -= tension;
	if (startHandle.includes("bottom")) cp1.y += tension;
	if (startHandle.includes("top")) cp1.y -= tension;

	// Adjust control point 2 based on the end handle
	if (endHandle.includes("right")) cp2.x += tension;
	if (endHandle.includes("left")) cp2.x -= tension;
	if (endHandle.includes("bottom")) cp2.y += tension;
	if (endHandle.includes("top")) cp2.y -= tension;

	return { cp1, cp2 };
}
