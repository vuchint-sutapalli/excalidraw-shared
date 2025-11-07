import type {
	HandleType,
	Element,
	Point,
	RemotePointer,
	EraserPoint,
	TextElement,
	PencilElement,
	RectangleElement,
} from "../types";
import { HANDLE_SIZE } from "../constants";
import { getHandles, getElementCenter, getElementBounds } from "../element";
import { normalizeRect } from "../geometry";

/**
 * Draws the resize and rotation handles for a given element.
 * @param ctx The canvas rendering context.
 * @param el The element for which to draw handles.
 * @param copyIcon The image for the copy handle.
 * @param rotationIcon The image for the rotation handle.
 */
export const drawResizeHandles = (
	ctx: CanvasRenderingContext2D,
	el: Element,
	copyIcon: HTMLImageElement | null,
	rotationIcon: HTMLImageElement | null,
	hoveredHandle: HandleType | null
) => {
	const handles = getHandles(el);

	handles.forEach((h) => {
		if (h.type === "copy") {
			if (copyIcon) {
				const iconSize = 24;
				ctx.drawImage(
					copyIcon,
					h.x - iconSize / 2,
					h.y - iconSize / 2,
					iconSize,
					iconSize
				);
			} else {
				// Fallback to green square if icon isn't loaded yet
				ctx.fillStyle = "green";
				ctx.fillRect(
					h.x - HANDLE_SIZE / 2,
					h.y - HANDLE_SIZE / 2,
					HANDLE_SIZE,
					HANDLE_SIZE
				);
			}
			return;
		} else if (h.type === "rotation") {
			if (rotationIcon) {
				const iconSize = 24;
				ctx.drawImage(
					rotationIcon,
					h.x - iconSize / 2,
					h.y - iconSize / 2,
					iconSize,
					iconSize
				);
			} else {
				// Fallback to green square if icon isn't loaded yet
				ctx.fillStyle = "green";
				ctx.fillRect(
					h.x - HANDLE_SIZE / 2,
					h.y - HANDLE_SIZE / 2,
					HANDLE_SIZE,
					HANDLE_SIZE
				);
			}
			return;
		} else if (h.type === "curve") {
			ctx.fillStyle = "orange"; // Keep curve handle distinct
		}

		// Default handle style: circle with outline
		ctx.beginPath();
		ctx.arc(h.x, h.y, HANDLE_SIZE / 2, 0, 2 * Math.PI);
		ctx.fillStyle = "white";
		ctx.fill();
		ctx.strokeStyle = "blue";
		ctx.lineWidth = 1;
		ctx.stroke();

		// Hover state: filled inner circle
		if (hoveredHandle === h.type && h.type !== "curve") {
			ctx.beginPath();
			// Draw a slightly smaller circle inside to create the "filled" effect
			ctx.arc(h.x, h.y, HANDLE_SIZE / 2 - 2, 0, 2 * Math.PI);
			ctx.fillStyle = "blue";
			ctx.fill();
		}
	});
};

/**
 * Draws a text label at the center of an element.
 * @param ctx The canvas rendering context.
 * @param label The text of the label.
 * @param center The center point of the element.
 */
export const drawLabel = (
	ctx: CanvasRenderingContext2D,
	label: string,
	center: Point
) => {
	ctx.save();
	ctx.font = "16px sans-serif";
	ctx.fillStyle = "black";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	// Simple multi-line support
	label.split("\n").forEach((line, index) => {
		ctx.fillText(line, center.x, center.y + index * 20);
	});
	ctx.restore();
};

/**
 * Draws a pencil (free-hand) element with smoothed lines.
 * @param ctx The canvas rendering context.
 * @param element The pencil element to draw.
 */
export const drawPencilElement = (
	ctx: CanvasRenderingContext2D,
	element: PencilElement
) => {
	if (element.points.length === 0) {
		return;
	}

	ctx.save();
	// Inherit strokeStyle from the main drawElement function for highlighting
	ctx.globalAlpha = element.opacity ?? 1;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	ctx.beginPath();
	ctx.moveTo(element.points[0].x, element.points[0].y);

	// Use quadraticCurveTo for a smoother line
	for (let i = 1; i < element.points.length - 1; i++) {
		const p1 = element.points[i];
		const p2 = element.points[i + 1];
		const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
		ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
	}

	// Draw the last segment as a straight line
	if (element.points.length > 1) {
		const lastPoint = element.points[element.points.length - 1];
		ctx.lineTo(lastPoint.x, lastPoint.y);
	}

	ctx.stroke();

	// If it's a highlighter, draw a thinner, lighter stroke on top
	if (element.isHighlighter) {
		// Reduce the line width for the inner stroke. A 50% reduction usually looks good.
		ctx.lineWidth = element.strokeWidth / 2;
		// Use a semi-transparent white for a softer inner glow.
		ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
		ctx.stroke();
	}

	ctx.restore();
};

/**
 * Draws the cursors of other users on the canvas.
 * @param ctx The canvas rendering context.
 * @param remotePointers A map of user IDs to their cursor data.
 */
export const drawRemotePointers = (
	ctx: CanvasRenderingContext2D,
	remotePointers: Map<string, RemotePointer>
) => {
	//how to loop through map

	remotePointers.forEach((pointer) => {
		const { x, y, userName } = pointer;

		// Draw the cursor icon (a simple triangle)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + 15, y + 15);
		ctx.lineTo(x, y + 20);
		ctx.closePath();
		ctx.fillStyle = "rgba(0, 120, 255, 0.8)"; // A nice blue color
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2;
		ctx.fill();
		ctx.stroke();
		ctx.restore();

		// Draw the user's name label
		ctx.save();
		ctx.font = "14px sans-serif";
		const textMetrics = ctx.measureText(userName);
		const padding = 5;
		const rectWidth = textMetrics.width + padding * 2;
		const rectHeight = 20;
		const rectX = x + 18;
		const rectY = y + 18;

		// Draw label background
		ctx.fillStyle = "rgba(0, 120, 255, 0.8)";
		ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

		// Draw label text
		ctx.fillStyle = "white";
		ctx.fillText(userName, rectX + padding, rectY + rectHeight - padding - 2);
		ctx.restore();
	});
};

/**
 * The core function for drawing a single element on the canvas.
 * It handles different element types, rotation, and highlight states.
 * @param ctx The canvas rendering context.
 * @param el The element to draw.
 * @param highlight If true, draws the element in a highlighted state (e.g., red, dashed).
 * @param copyIcon The image for the copy handle (if highlighted).
 * @param rotationIcon The image for the rotation handle (if highlighted).
 */
export const drawElement = (
	ctx: CanvasRenderingContext2D,
	el: Element,
	highlight: boolean,
	copyIcon: HTMLImageElement | null,
	rotationIcon: HTMLImageElement | null,
	hoveredHandle: HandleType | null = null,
	isErasing: boolean = false,
	viewTransform: { scale: number; offsetX: number; offsetY: number }
) => {
	// Draw bounding box if highlighted
	if (highlight && el.type !== "wire" && el.type !== "arrow") {
		const bounds = getElementBounds(el);
		ctx.save();
		ctx.strokeStyle = "blue";
		ctx.lineWidth = 1;
		ctx.setLineDash([]); // Use a solid line for the bounding box
		ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
		ctx.restore();
	}

	ctx.save();
	// Apply rotation if the element has one.
	const center = getElementCenter(el);
	if (el.rotation && center) {
		ctx.translate(center.x, center.y);
		ctx.rotate((el.rotation * Math.PI) / 180);
		ctx.translate(-center.x, -center.y);
	}

	// Apply element-specific styles
	ctx.strokeStyle = el.stroke || "black";
	ctx.lineWidth = el.strokeWidth || 2;
	ctx.fillStyle = el.fill || "transparent";
	ctx.globalAlpha = el.opacity ?? 1;

	// Apply a common highlight style for selected elements.
	if (highlight) {
		ctx.setLineDash([5, 3]);
		// For filled shapes, we can't show a highlight fill, so we just use the stroke.
		// For arrows, we want the arrowhead to be red.
		if (el.type === "arrow" && el.id !== "wiring-temp") {
			ctx.fillStyle = "red";
		}
	}

	// Apply eraser feedback style
	if (isErasing) {
		ctx.globalAlpha = 0.3;
	}

	if (el.type === "rectangle") {
		const { x, y, width, height } = normalizeRect(el);
		ctx.fillRect(x, y, width, height);
		ctx.strokeRect(x, y, width, height);
		if (el.label && !highlight) {
			drawLabel(ctx, el.label, { x: x + width / 2, y: y + height / 2 });
		}
	} else if (el.type === "diamond") {
		const { x, y, width, height } = normalizeRect(el);
		ctx.beginPath();
		ctx.moveTo(x + width / 2, y);
		ctx.lineTo(x + width, y + height / 2);
		ctx.lineTo(x + width / 2, y + height);
		ctx.lineTo(x, y + height / 2);
		ctx.closePath();
		ctx.fill(el.fillRule || "nonzero");
		ctx.stroke();
		if (el.label && !highlight) {
			drawLabel(ctx, el.label, { x: x + width / 2, y: y + height / 2 });
		}
	} else if (el.type === "line") {
		ctx.beginPath();
		ctx.moveTo(el.x, el.y);
		if (el.cp1x && el.cp1y) {
			ctx.quadraticCurveTo(el.cp1x, el.cp1y, el.x2, el.y2);
		} else {
			ctx.lineTo(el.x2, el.y2);
		}
		ctx.stroke();
		if (el.label && !highlight) {
			drawLabel(ctx, el.label, getElementCenter(el));
		}
	} else if (el.type === "arrow" || el.type === "wire") {
		let arrowAngle;
		if (el.cp1x && el.cp1y) {
			// The tangent of a quadratic bezier at t=1 is the line from the control point to the end point.
			arrowAngle = Math.atan2(el.y2 - el.cp1y, el.x2 - el.cp1x);
		} else {
			arrowAngle = Math.atan2(el.y2 - el.y, el.x2 - el.x);
		}
		let endPoint: Point;

		ctx.beginPath();
		ctx.moveTo(el.x, el.y);
		if (el.cp1x && el.cp1y) {

		if (el.points && el.points.length > 1) {
			// Orthogonal path for wires
			ctx.moveTo(el.points[0].x, el.points[0].y);
			for (let i = 1; i < el.points.length; i++) {
				ctx.lineTo(el.points[i].x, el.points[i].y);
			}
			const p1 = el.points[el.points.length - 2];
			const p2 = el.points[el.points.length - 1];
			arrowAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
			endPoint = p2;
		} else if (el.cp1x && el.cp1y) {
			// Curved path for arrows
			ctx.moveTo(el.x, el.y);
			ctx.quadraticCurveTo(el.cp1x, el.cp1y, el.x2, el.y2);
			arrowAngle = Math.atan2(el.y2 - el.cp1y, el.x2 - el.cp1x); // Tangent at t=1
			endPoint = { x: el.x2, y: el.y2 };
		} else {
			// Straight line for arrows
			ctx.moveTo(el.x, el.y);
			ctx.lineTo(el.x2, el.y2);
			arrowAngle = Math.atan2(el.y2 - el.y, el.x2 - el.x);
			endPoint = { x: el.x2, y: el.y2 };
		}

		ctx.fillStyle = el.stroke || "#596aca";
		ctx.strokeStyle = el.stroke || "#596aca";
		ctx.stroke();

		// Draw arrowhead
		ctx.save();
		ctx.translate(el.x2, el.y2);
		ctx.rotate(arrowAngle);
		ctx.beginPath();
		// Make arrowhead size proportional to the line width for better scaling.
		const strokeWidth = el.strokeWidth || 2;
		const side = strokeWidth * 8; // side length of the equilateral triangle
		const h = side * (Math.sqrt(3) / 2); // height
		const cornerRadius = side / 6;
		// Draw arrowhead if an angle was determined
		if (arrowAngle !== undefined && endPoint) {
			ctx.save();
			ctx.translate(endPoint.x, endPoint.y);
			ctx.rotate(arrowAngle);
			ctx.beginPath();
			// Make arrowhead size proportional to the line width for better scaling.
			const strokeWidth = el.strokeWidth || 2;
			const side = strokeWidth * 8; // side length of the equilateral triangle
			const h = side * (Math.sqrt(3) / 2); // height
			const cornerRadius = side / 6;

		const p1 = { x: 0, y: 0 };
		const p2 = { x: -h, y: -side / 2 };
		const p3 = { x: -h, y: side / 2 };
			const p1 = { x: 0, y: 0 };
			const p2 = { x: -h, y: -side / 2 };
			const p3 = { x: -h, y: side / 2 };

		// A more robust way to draw a rounded triangle
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x + cornerRadius, p2.y);
		ctx.quadraticCurveTo(p2.x, p2.y, p2.x, p2.y + cornerRadius);
		ctx.lineTo(p3.x, p3.y - cornerRadius);
		ctx.quadraticCurveTo(p3.x, p3.y, p3.x + cornerRadius, p3.y);
		ctx.moveTo(p1.x, p1.y);
			// A more robust way to draw a rounded triangle
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x + cornerRadius, p2.y);
			ctx.quadraticCurveTo(p2.x, p2.y, p2.x, p2.y + cornerRadius);
			ctx.lineTo(p3.x, p3.y - cornerRadius);
			ctx.quadraticCurveTo(p3.x, p3.y, p3.x + cornerRadius, p3.y);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}

		ctx.closePath();
		ctx.fill();
		ctx.restore();
		if (el.label && !highlight) {
			drawLabel(ctx, el.label, getElementCenter(el));
		}
	} else if (el.type === "circle") {
		ctx.beginPath();
		ctx.arc(el.x, el.y, el.radius, 0, 2 * Math.PI);
		ctx.fill(el.fillRule || "nonzero");
		ctx.stroke();
		if (el.label && !highlight) {
			drawLabel(ctx, el.label, { x: el.x, y: el.y });
		}
	} else if (el.type === "text") {
		const textEl = el as TextElement;
		// When drawing on a scaled canvas, we must scale the font size as well
		// to ensure the text appears at the correct size relative to other elements.
		const scaledFontSize = textEl.fontSize * viewTransform.scale;

		ctx.font = `${scaledFontSize}px ${textEl.fontFamily || "'virgil', sans-serif"}`;
		ctx.textBaseline = "top";
		ctx.fillStyle = el.fill || "black";
		textEl.text.split("\n").forEach((line, index) => {
			// The y-offset for new lines also needs to be scaled.
			ctx.fillText(line, textEl.x, textEl.y + index * scaledFontSize);
		});
	} else if (el.type === "pencil") {
		drawPencilElement(ctx, el as PencilElement);
	}

	// Draw handles if highlighted
	if (highlight) {
		drawResizeHandles(ctx, el, copyIcon, rotationIcon, hoveredHandle);
	}

	ctx.restore();
};

/**
 * Draws the blue rectangle shown when multi-selecting elements.
 * @param ctx The canvas rendering context.
 * @param rect The selection rectangle element.
 */
export const drawSelectionRect = (
	ctx: CanvasRenderingContext2D,
	rect: RectangleElement
) => {
	const { x, y, width, height } = normalizeRect(rect);
	ctx.save();
	ctx.fillStyle = "rgba(0, 0, 255, 0.1)";
	ctx.strokeStyle = "blue";
	ctx.lineWidth = 1;
	ctx.fillRect(x, y, width, height);
	ctx.strokeRect(x, y, width, height);
	ctx.restore();
};

/**
 * Draws the angle indicator tooltip that appears during rotation or line drawing.
 * @param ctx The canvas rendering context.
 * @param info The angle and position information.
 */
export const drawAngleIndicator = (
	ctx: CanvasRenderingContext2D,
	info: { angle: number; x: number; y: number }
) => {
	ctx.save();

	const text = `${info.angle}°`;
	ctx.font = "12px sans-serif";
	const textMetrics = ctx.measureText(text);
	const textWidth = textMetrics.width;
	const textHeight = 12; // approximation

	const padding = 6;
	const rectWidth = textWidth + padding * 2;
	const rectHeight = textHeight + padding;

	// Position tooltip slightly offset from the cursor
	const rectX = info.x + 15;
	const rectY = info.y + 15;

	// Draw background
	ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
	ctx.beginPath();
	ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 4);
	ctx.fill();

	// Draw text
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, rectX + rectWidth / 2, rectY + rectHeight / 2);

	ctx.restore();
};

const ERASER_TRAIL_DURATION = 700; // ms

export const drawPointerTrailWithSegments = (
	ctx: CanvasRenderingContext2D,
	trail: EraserPoint[],
	action: "erasing" | "lasering"
) => {
	if (trail.length < 2) return;

	ctx.save();
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	for (let i = 1; i < trail.length; i++) {
		const p1 = trail[i - 1];
		const p2 = trail[i];

		const age = Date.now() - p2.timestamp;
		if (age > ERASER_TRAIL_DURATION) continue;

		const opacity = 1 - age / ERASER_TRAIL_DURATION;
		const size = 10 * (1 - age / ERASER_TRAIL_DURATION);

		if (size <= 1) continue;

		ctx.lineWidth = size;
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);

		if (action === "erasing") {
			ctx.strokeStyle = `rgba(180, 180, 220, ${opacity * 0.8})`;
			ctx.stroke();
		} else if (action === "lasering") {
			ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
			ctx.stroke();
			ctx.lineWidth = size / 2;
			ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
			ctx.stroke();
		}
	}

	ctx.restore();
};

/**
 * Draws a temporary, fading trail for tools like the eraser or laser.
 * @param ctx The canvas rendering context.
 * @param trail An array of points with timestamps.
 * @param action The current interaction action ('erasing', 'lasering').
 */
export const drawPointerTrailWithGradient = (
	ctx: CanvasRenderingContext2D,
	trail: EraserPoint[],
	action: "erasing" | "lasering"
) => {
	if (trail.length < 2) return;

	ctx.save();
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	// Filter out points that have already faded
	const visibleTrail = trail.filter(
		(p) => Date.now() - p.timestamp < ERASER_TRAIL_DURATION
	);

	if (visibleTrail.length < 2) {
		ctx.restore();
		return;
	}

	// Build a single, continuous path using quadratic curves for smoothness
	ctx.beginPath();
	ctx.moveTo(visibleTrail[0].x, visibleTrail[0].y);
	for (let i = 1; i < visibleTrail.length - 1; i++) {
		const p1 = visibleTrail[i];
		const p2 = visibleTrail[i + 1];
		const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
		ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
	}
	// Draw the last segment as a line
	ctx.lineTo(
		visibleTrail[visibleTrail.length - 1].x,
		visibleTrail[visibleTrail.length - 1].y
	);

	// Create a gradient to simulate the fading size and opacity
	const head = visibleTrail[visibleTrail.length - 1];
	const tail = visibleTrail[0];
	const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);

	// The trail is thickest and most opaque at the head (end of the array)
	const headOpacity = 1 - (Date.now() - head.timestamp) / ERASER_TRAIL_DURATION;
	ctx.lineWidth = 10 * headOpacity;

	if (action === "lasering") {
		// Outer red stroke
		gradient.addColorStop(0, "rgba(255, 0, 0, 0)");
		gradient.addColorStop(1, `rgba(255, 0, 0, ${headOpacity})`);
		ctx.strokeStyle = gradient;
		ctx.stroke();

		// Inner white stroke
		ctx.lineWidth = (10 * headOpacity) / 2;
		ctx.strokeStyle = `rgba(255, 255, 255, ${headOpacity * 0.8})`;
		ctx.stroke();
	} else if (action === "erasing") {
		gradient.addColorStop(0, "rgba(180, 180, 220, 0)");
		gradient.addColorStop(1, `rgba(180, 180, 220, ${headOpacity * 0.8})`);
		ctx.strokeStyle = gradient;
		ctx.stroke();
	}

	ctx.restore();
};
