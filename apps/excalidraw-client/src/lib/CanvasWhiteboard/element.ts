import type {
	ArrowElement,
	Element,
	Point,
	HandleType,
	RectangleElement,
	CircleElement,
	DiamondElement,
	PencilElement,
	TextElement,
} from "./types";
import { HANDLE_SIZE, LINE_HIT_THRESHOLD } from "./constants";
import {
	normalizeRect,
	rotatePoint,
	distanceToLineSegment,
	getQuadraticCurveBounds,
	getPointOnQuadraticCurve,
} from "./geometry";

let sharedDummyContext: CanvasRenderingContext2D | null = null;
const getSharedDummyContext = () => {
	if (!sharedDummyContext) {
		const canvas = document.createElement("canvas");
		sharedDummyContext = canvas.getContext("2d");
	}
	if (!sharedDummyContext) {
		// This should be practically impossible in browsers that support canvas.
		throw new Error("Could not create 2d context for text measurement");
	}
	return sharedDummyContext;
};

const measureText = (
	text: string,
	fontSize: number,
	fontFamily?: string
): { width: number; height: number } => {
	const dummyContext = getSharedDummyContext();
	dummyContext.font = `${fontSize}px ${fontFamily || "'virgil', sans-serif"}`;
	const lines = text.split("\n");
	const widths = lines.map((line) => dummyContext.measureText(line).width);
	// Use Math.max(0, ...) to handle empty text gracefully
	return { width: Math.max(0, ...widths), height: lines.length * fontSize };
};

// const COPY_HANDLE_OFFSET = -30; // Negative for above the element
const ROTATION_HANDLE_OFFSET = -55; // Even further above

export const getHandles = (
	el: Element
): { type: HandleType; x: number; y: number }[] => {
	switch (el.type) {
		case "rectangle":
			const rectEl = el as RectangleElement;
			const { x, y, width, height } = normalizeRect(rectEl);
			return [
				{ type: "top-left", x: x, y: y },
				{ type: "top-right", x: x + width, y: y },
				{ type: "bottom-left", x: x, y: y + height },
				{
					type: "bottom-right",
					x: x + width,
					y: y + height,
				},
				{ type: "rotation", x: x + width / 2, y: y + ROTATION_HANDLE_OFFSET },
			];
		case "diamond":
			const diamondEl = el as DiamondElement;
			const { x: dx, y: dy, width: dw, height: dh } = normalizeRect(diamondEl);
			return [
				// The handles should be at the vertices of the diamond
				{ type: "top-left", x: dx, y: dy + dh / 2 }, // Left-mid
				{ type: "top-right", x: dx + dw / 2, y: dy }, // Top-mid
				{ type: "bottom-left", x: dx + dw, y: dy + dh / 2 }, // Right-mid
				{ type: "bottom-right", x: dx + dw / 2, y: dy + dh }, // Bottom-mid
				{ type: "rotation", x: dx + dw / 2, y: dy + ROTATION_HANDLE_OFFSET },
			];
		case "line":
		case "arrow": {
			const lineEl = el as ArrowElement;
			const lineHandles: { type: HandleType; x: number; y: number }[] = [
				{ type: "start", x: lineEl.x, y: lineEl.y },
				{ type: "end", x: lineEl.x2, y: lineEl.y2 },
			];
			let handleCenterX: number, handleCenterY: number;

			if (lineEl.cp1x && lineEl.cp1y) {
				// It's a curved line. Position handles above the curve's bounding box.
				const bounds = getQuadraticCurveBounds(
					{ x: lineEl.x, y: lineEl.y },
					{ x: lineEl.cp1x, y: lineEl.cp1y },
					{ x: lineEl.x2, y: lineEl.y2 }
				);
				handleCenterX = bounds.x + bounds.width / 2;
				handleCenterY = bounds.y; // Top of the bounding box
			} else {
				// It's a straight line. Position handles on the midpoint.
				handleCenterX = (lineEl.x + lineEl.x2) / 2;
				handleCenterY = (lineEl.y + lineEl.y2) / 2;
			}

			lineHandles.push({
				type: "rotation",
				x: handleCenterX,
				y: handleCenterY + ROTATION_HANDLE_OFFSET,
			});
			if (lineEl.curveHandleX && lineEl.curveHandleY) {
				lineHandles.push({
					type: "curve",
					x: lineEl.curveHandleX,
					y: lineEl.curveHandleY,
				});
			} else {
				lineHandles.push({
					type: "curve",
					x: (lineEl.x + lineEl.x2) / 2,
					y: (lineEl.y + lineEl.y2) / 2,
				});
			}
			return lineHandles;
		}
		case "text": {
			const textEl = el as TextElement;
			// `width` and `height` on text elements are not always up to date.
			// We must measure the text to get accurate dimensions for handle placement.
			const { width, height } = measureText(
				textEl.text,
				textEl.fontSize,
				textEl.fontFamily || "'virgil', sans-serif"
			);
			return [
				{ type: "bottom-right", x: textEl.x + width, y: textEl.y + height },
				{
					type: "rotation",
					x: textEl.x + width / 2,
					y: textEl.y + ROTATION_HANDLE_OFFSET,
				},
			];
		}
		case "circle":
			const circleEl = el as CircleElement;
			return [
				{ type: "circle-top", x: circleEl.x, y: circleEl.y - circleEl.radius },
				{
					type: "circle-bottom",
					x: circleEl.x,
					y: circleEl.y + circleEl.radius,
				},
				{ type: "circle-left", x: circleEl.x - circleEl.radius, y: circleEl.y },
				{
					type: "circle-right",
					x: circleEl.x + circleEl.radius,
					y: circleEl.y,
				},
				{
					type: "rotation",
					x: circleEl.x,
					y: circleEl.y - circleEl.radius + ROTATION_HANDLE_OFFSET,
				},
			];
		case "pencil":
			const pencilEl = el as PencilElement;
			const { minX, minY, maxX } = getPencilElementBounds(pencilEl);
			return [
				{
					type: "rotation",
					x: (minX + maxX) / 2,
					y: minY + ROTATION_HANDLE_OFFSET,
				},
			];
		default:
			return [];
	}
};

const getPencilElementBounds = (
	element: PencilElement
): { minX: number; minY: number; maxX: number; maxY: number } => {
	if (element.points.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	}
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	element.points.forEach((p) => {
		minX = Math.min(minX, p.x);
		minY = Math.min(minY, p.y);
		maxX = Math.max(maxX, p.x);
		maxY = Math.max(maxY, p.y);
	});
	return { minX, minY, maxX, maxY };
};

/**
 * Recursively rounds all numeric properties of an object to a given precision.
 * This is useful for cleaning up element data before serialization.
 * @param obj The object or array to process.
 * @param precision The number of decimal places to round to.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const roundObject = (obj: any, precision: number): any => {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => roundObject(item, precision));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const newObj: { [key: string]: any } = {};
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const value = obj[key];
			if (typeof value === "number") {
				// Use Number() to remove trailing zeros from toFixed()
				newObj[key] = Number(value.toFixed(precision));
			} else if (typeof value === "object") {
				newObj[key] = roundObject(value, precision);
			} else {
				newObj[key] = value;
			}
		}
	}
	return newObj;
};

export const roundElementProperties = (
	element: Element,
	precision: number
): Element => {
	return roundObject(element, precision) as Element;
};

export const hitTestHandle = (
	el: Element,
	pos: Point,
	beLinient: boolean = false
): HandleType | null => {
	const center = getElementCenter(el);
	// To check for a hit on a handle, we must compare the mouse position
	// with the handle's position in the same coordinate system.
	// The handle positions are calculated in the element's local (un-rotated) space.
	// So, we transform the mouse position into that same local space by applying
	// the inverse rotation of the element.
	const localPos = el.rotation
		? rotatePoint(pos, center, -el.rotation * (Math.PI / 180))
		: pos;

	const handles = getHandles(el);
	for (const h of handles) {
		// Use a larger hit area for icon-based handles and when explicit leniency is requested.
		const isIconHandle = h.type === "rotation" || h.type === "curve";
		const handleSize = beLinient || isIconHandle ? 24 : HANDLE_SIZE;
		if (
			Math.abs(localPos.x - h.x) <= handleSize / 2 &&
			Math.abs(localPos.y - h.y) <= handleSize / 2
		)
			return h.type;
	}
	return null;
};

export const getElementAtPosition = (
	elements: Element[],
	pos: Point,
	leniency = 0,
	includeWires = false
): Element | null => {
	for (let i = elements.length - 1; i >= 0; i--) {
		const el = elements[i];
		const center = getElementCenter(el);
		if (el.type === "wire" && !includeWires) {
			continue;
		}
		const localPos = el.rotation
			? rotatePoint(pos, center, -el.rotation * (Math.PI / 180))
			: pos;

		if (el.type === "rectangle" || el.type === "annotation") {
			const { x, y, width, height } = normalizeRect(el as RectangleElement);

			console.log(
				"detected an element of type",
				el.type,
				x - leniency,
				x + width + leniency,
				y - leniency,
				y + height + leniency,
				localPos.x,
				localPos.y
			);

			if (
				localPos.x >= x - leniency &&
				localPos.x <= x + width + leniency &&
				localPos.y >= y - leniency &&
				localPos.y <= y + height + leniency
			) {
				return el;
			}
		} else if (el.type === "line" || el.type === "arrow") {
			let hit = false;
			if (el.cp1x && el.cp1y) {
				const p0 = { x: el.x, y: el.y };
				const p1 = { x: el.cp1x, y: el.cp1y };
				const p2 = { x: el.x2, y: el.y2 };
				// A simple hit test: check distance to 10 points on the curve
				for (let i = 0; i <= 10; i++) {
					const t = i / 10;
					const p = getPointOnQuadraticCurve(t, p0, p1, p2);
					if (
						Math.hypot(p.x - localPos.x, p.y - localPos.y) <
						LINE_HIT_THRESHOLD + leniency
					) {
						hit = true;
						break;
					}
				}
			} else if (
				distanceToLineSegment(
					localPos,
					{ x: el.x, y: el.y },
					{ x: el.x2, y: el.y2 }
				) < LINE_HIT_THRESHOLD
			) {
				hit = true;
			}

			if (hit) return el;

			if (el.type === "arrow") {
				const distToEndpoint = Math.hypot(
					localPos.x - el.x2,
					localPos.y - el.y2
				);
				if (distToEndpoint < 10) return el; // Arrowhead size is roughly 10px
			}
		}
		if (el.type === "text") {
			const { width, height } = measureText(
				el.text,
				el.fontSize,
				el.fontFamily
			);
			if (
				localPos.x >= el.x - leniency &&
				localPos.x <= el.x + width + leniency &&
				localPos.y >= el.y - leniency &&
				localPos.y <= el.y + height + leniency
			) {
				return el;
			}
		}
		if (el.type === "circle") {
			const dist = Math.hypot(localPos.x - el.x, localPos.y - el.y);
			if (dist <= (el as CircleElement).radius + leniency) {
				return el;
			}
		}
		if (el.type === "diamond") {
			const { x, y, width, height } = normalizeRect(el);
			const centerX = x + width / 2;
			const centerY = y + height / 2;

			// Check if the point is inside the diamond shape.
			// A point (px, py) is inside a diamond if:
			// |(px - centerX) / (width / 2)| + |(py - centerY) / (height / 2)| <= 1
			const dx = Math.abs(localPos.x - centerX);
			const dy = Math.abs(localPos.y - centerY);

			// Add leniency by effectively making the diamond slightly larger
			const effectiveWidth = width / 2 + leniency;
			const effectiveHeight = height / 2 + leniency;

			if (
				effectiveWidth > 0 &&
				effectiveHeight > 0 &&
				dx / effectiveWidth + dy / effectiveHeight <= 1
			) {
				return el;
			}
		} else if (el.type === "pencil") {
			// First, a quick bounding box check to discard elements that are obviously not a match
			const { minX, minY, maxX, maxY } = getPencilElementBounds(el);
			const buffer = LINE_HIT_THRESHOLD;
			if (
				pos.x >= minX - buffer - leniency &&
				pos.x <= maxX + buffer + leniency &&
				pos.y >= minY - buffer - leniency &&
				pos.y <= maxY + buffer + leniency
			) {
				// Detailed check: find minimum distance from point to any segment in the path
				const points = (el as PencilElement).points;
				for (let i = 0; i < points.length - 1; i++) {
					const dist = distanceToLineSegment(
						localPos,
						points[i],
						points[i + 1]
					);
					if (dist < buffer) {
						return el;
					}
				}
			}
		}
	}
	return null;
};

export const moveElement = (el: Element, dx: number, dy: number) => {
	if (el.type === "rectangle") {
		el.x += dx;
		el.y += dy;
	} else if (el.type === "line" || el.type === "arrow") {
		el.x += dx;
		el.y += dy;
		el.x2 += dx;
		el.y2 += dy;
		if (el.cp1x !== undefined && el.cp1y !== undefined) {
			el.cp1x += dx;
			el.cp1y += dy;
		}
		if (el.curveHandleX !== undefined && el.curveHandleY !== undefined) {
			el.curveHandleX += dx;
			el.curveHandleY += dy;
		}
	} else if (el.type === "circle") {
		el.x += dx;
		el.y += dy;
	} else if (el.type === "diamond") {
		el.x += dx;
		el.y += dy;
	} else if (el.type === "text") {
		el.x += dx;
		el.y += dy;
	} else if (el.type === "pencil") {
		el.x += dx;
		el.y += dy;
		(el as PencilElement).points = (el as PencilElement).points.map((p) => ({
			x: p.x + dx,
			y: p.y + dy,
		}));
	}
};

export const resizeElement = (
	el: Element,
	handle: HandleType | null,
	dx: number,
	dy: number
) => {
	if (!handle) return;

	if (el.type === "rectangle" || el.type === "diamond") {
		switch (handle) {
			case "top-left":
				el.x += dx;
				el.y += dy;
				el.width -= dx;
				el.height -= dy;
				break;
			case "top-right":
				el.y += dy;
				el.width += dx;
				el.height -= dy;
				break;
			case "bottom-left":
				el.x += dx;
				el.width -= dx;
				el.height += dy;
				break;
			case "bottom-right":
				el.width += dx;
				el.height += dy;
				break;
		}
	} else if (el.type === "line" || el.type === "arrow") {
		if (handle === "start") {
			el.x += dx;
			el.y += dy;
			// Reset curve when resizing
			delete el.cp1x;
			delete el.cp1y;
			delete el.curveHandleX;
			delete el.curveHandleY;
		} else if (handle === "end") {
			el.x2 += dx;
			el.y2 += dy;
			// Reset curve when resizing
			delete el.cp1x;
			delete el.cp1y;
			delete el.curveHandleX;
			delete el.curveHandleY;
		}
	} else if (el.type === "circle") {
		switch (handle) {
			case "circle-top":
				el.radius = Math.max(0, el.radius - dy);
				break;
			case "circle-bottom":
				el.radius = Math.max(0, el.radius + dy);
				break;
			case "circle-left":
				el.radius = Math.max(0, el.radius - dx);
				break;
			case "circle-right":
			case "radius": // Also handle the old 'radius' type
				el.radius = Math.max(0, el.radius + dx);
				break;
		}
	} else if (el.type === "text") {
		if (handle === "bottom-right") {
			// A larger font size change for a more noticeable effect
			el.fontSize = Math.max(8, el.fontSize + dx * 0.5);
		}
	}
};

export const getElementBounds = (
	// This was already exported, just confirming.
	element: Element
): { x: number; y: number; width: number; height: number } => {
	if (element.type === "rectangle" || element.type === "diamond") {
		// Fall through to the generic rotation handling at the end.
	} else if (element.type === "line" || element.type === "arrow") {
		if (element.cp1x && element.cp1y) {
			return getQuadraticCurveBounds(
				{ x: element.x, y: element.y },
				{ x: element.cp1x, y: element.cp1y },
				{ x: element.x2, y: element.y2 }
			);
		}
		// Fall through to the generic rotation handling at the end.
	} else if (element.type === "circle") {
		// A circle's bounding box is not affected by rotation.
		return {
			x: element.x - element.radius,
			y: element.y - element.radius,
			width: element.radius * 2,
			height: element.radius * 2,
		};
	}

	// --- Generic Bounding Box Calculation (with rotation) ---
	let bounds;
	if (element.type === "rectangle" || element.type === "diamond") {
		bounds = normalizeRect(element);
	} else if (element.type === "line" || element.type === "arrow") {
		const minX = Math.min(element.x, element.x2);
		const minY = Math.min(element.y, element.y2);
		const maxX = Math.max(element.x, element.x2);
		const maxY = Math.max(element.y, element.y2);
		bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	} else if (element.type === "text") {
		const { width, height } = measureText(
			element.text,
			element.fontSize,
			element.fontFamily
		);
		bounds = { x: element.x, y: element.y, width, height };
	} else if (element.type === "pencil") {
		const { minX, minY, maxX, maxY } = getPencilElementBounds(element);
		bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	} else {
		// Fallback for unknown types or types without rotation (like circle)
		return { x: element.x, y: element.y, width: 0, height: 0 };
	}

	if (element.rotation) {
		const { x, y, width, height } = bounds;
		const center = { x: x + width / 2, y: y + height / 2 };
		const angleRad = (element.rotation * Math.PI) / 180;

		const points = [
			{ x, y },
			{ x: x + width, y },
			{ x: x + width, y: y + height },
			{ x, y: y + height },
		].map((p) => rotatePoint(p, center, angleRad));

		const minX = Math.min(points[0].x, points[1].x, points[2].x, points[3].x);
		const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
		const maxX = Math.max(points[0].x, points[1].x, points[2].x, points[3].x);
		const maxY = Math.max(points[0].y, points[1].y, points[2].y, points[3].y);

		return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	}

	return bounds;
};

export const getCombinedElementBounds = (
	elements: readonly Element[]
): { minX: number; minY: number; maxX: number; maxY: number } => {
	if (elements.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	}

	return elements.reduce(
		(acc, el) => {
			const bounds = getElementBounds(el);
			return {
				minX: Math.min(acc.minX, bounds.x),
				minY: Math.min(acc.minY, bounds.y),
				maxX: Math.max(acc.maxX, bounds.x + bounds.width),
				maxY: Math.max(acc.maxY, bounds.y + bounds.height),
			};
		},
		// Initial accumulator value
		{ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
	);
};

export const getElementCenter = (element: Element): Point => {
	const bounds = getElementBounds(element);
	return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
};

export const isElementIntersectingRect = (
	element: Element,
	selectionRect: RectangleElement
): boolean => {
	if (element.type === "circle") {
		const {
			x: rx,
			y: ry,
			width: rw,
			height: rh,
		} = normalizeRect(selectionRect);
		const { radius } = element as CircleElement;
		const circle = { x: element.x, y: element.y, radius };
		// https://yal.cc/rectangle-circle-intersection-test/
		const dx = circle.x - Math.max(rx, Math.min(circle.x, rx + rw));
		const dy = circle.y - Math.max(ry, Math.min(circle.y, ry + rh));
		return dx * dx + dy * dy < circle.radius * circle.radius;
	} else if (element.type === "diamond") {
		// TODO: A more precise diamond-rectangle intersection test could be implemented.
		// For now, we fall through to the general AABB test.
	}

	// For all other shapes (and as a fallback for diamond), use a general
	// Axis-Aligned Bounding Box (AABB) intersection test.
	const { x: rx, y: ry, width: rw, height: rh } = normalizeRect(selectionRect);
	const { x: ex, y: ey, width: ew, height: eh } = getElementBounds(element);
	return rx < ex + ew && rx + rw > ex && ry < ey + eh && ry + rh > ey;
};

/**
 * Returns the world coordinates of a specific handle on an element.
 * @param el The element.
 * @param handle The handle type.
 * @returns The coordinates of the handle.
 */
export const getHandlePoint = (el: Element, handle: HandleType): Point => {
	const center = getElementCenter(el);
	let point: Point;

	if (el.type === "rectangle" || el.type === "text") {
		const { x, y, width, height } = normalizeRect(el as RectangleElement);
		switch (handle) {
			case "top-left":
				point = { x, y };
				break;
			case "top-right":
				point = { x: x + width, y };
				break;
			case "bottom-left":
				point = { x, y: y + height };
				break;
			case "bottom-right":
				point = { x: x + width, y: y + height };
				break;
			// Add other handles like copy/rotation if needed for wiring
			default:
				point = center;
		}
	} else if (el.type === "diamond") {
		const { x, y, width, height } = normalizeRect(el as DiamondElement);
		switch (handle) {
			case "top-left": // Corresponds to left-mid vertex
				point = { x, y: y + height / 2 };
				break;
			case "top-right": // Corresponds to top-mid vertex
				point = { x: x + width / 2, y };
				break;
			case "bottom-left": // Corresponds to right-mid vertex
				point = { x: x + width, y: y + height / 2 };
				break;
			case "bottom-right": // Corresponds to bottom-mid vertex
				point = { x: x + width / 2, y: y + height };
				break;
			default:
				point = center;
		}
	} else if (el.type === "line" || el.type === "arrow" || el.type === "wire") {
		switch (handle) {
			case "start":
				point = { x: el.x, y: el.y };
				break;
			case "end":
				point = { x: el.x2, y: el.y2 };
				break;
			case "curve":
				point = { x: el.curveHandleX!, y: el.curveHandleY! };
				break;
			default:
				point = center;
		}
	} else if (el.type === "circle") {
		switch (handle) {
			case "circle-top":
				point = { x: el.x, y: el.y - el.radius };
				break;
			case "circle-bottom":
				point = { x: el.x, y: el.y + el.radius };
				break;
			case "circle-left":
				point = { x: el.x - el.radius, y: el.y };
				break;
			case "circle-right":
			case "radius": // Keep for backward compatibility
				point = { x: el.x + el.radius, y: el.y };
				break;
			default:
				point = center;
		}
	} else {
		point = center;
	}

	// If the element is rotated, we need to rotate the handle point around the element's center.
	if (el.rotation) {
		return rotatePoint(point, center, el.rotation * (Math.PI / 180));
	}

	return point;
};
