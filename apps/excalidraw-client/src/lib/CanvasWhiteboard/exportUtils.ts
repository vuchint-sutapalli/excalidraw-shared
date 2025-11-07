import type { Element } from "./types";
import { getCombinedElementBounds, getHandlePoint } from "./element";
import { drawElement } from "./useDrawing/drawingUtils";
import { getCubicBezierControlPoints } from "./useDrawing/bezier";

interface ExportOptions {
	elements: readonly Element[];
	activeAnnotationId?: string | null;
	padding?: number;
	backgroundColor?: string;
}

/**
 * Draws a set of elements onto a given canvas context.
 * This function handles special cases like calculating wire positions and setting annotation highlights.
 * @param ctx - The canvas rendering context to draw on.
 * @param elements - The array of elements to draw.
 * @param activeAnnotationId - The ID of the currently active annotation, to apply highlights.
 */
export const drawElementsOnCanvas = (
	ctx: CanvasRenderingContext2D,
	elements: readonly Element[],
	activeAnnotationId: string | null | undefined
) => {
	const elementsById = new Map(elements.map((el) => [el.id, el]));

	elements.forEach((el) => {
		let elementToDraw = el;
		if (el.type === "annotation") {
			// Temporarily mutate for rendering highlight. This is specific to the export function
			// and won't affect the main canvas state.
			(elementToDraw as any).isActivelySelected = activeAnnotationId === el.id;
		} else if (el.type === "wire") {
			const startEl = elementsById.get(el.startElementId);
			const endEl = elementsById.get(el.endElementId);
			if (startEl && endEl) {
				const startPoint = getHandlePoint(startEl, el.startHandle);
				const endPoint = getHandlePoint(endEl, el.endHandle);
				const { cp1, cp2 } = getCubicBezierControlPoints(
					startPoint,
					endPoint,
					el.startHandle,
					el.endHandle
				);
				elementToDraw = {
					...el,
					x: startPoint.x,
					y: startPoint.y,
					x2: endPoint.x,
					y2: endPoint.y,
					cp1x: cp1.x,
					cp1y: cp1.y,
					cp2x: cp2.x,
					cp2y: cp2.y,
				};
			}
		}
		drawElement(ctx, elementToDraw, false, null, null, null, false, {
			scale: 1,
			offsetX: 0,
			offsetY: 0,
		});
	});
};

/**
 * Creates an off-screen canvas and draws the provided elements onto it.
 * This is the core logic for exporting the whiteboard content to an image.
 * @param options - The export options.
 * @returns A promise that resolves with the HTMLCanvasElement containing the drawing.
 */
export const exportToCanvas = (
	options: ExportOptions
): Promise<HTMLCanvasElement> => {
	return new Promise((resolve) => {
		const {
			elements,
			activeAnnotationId = null,
			padding = 20,
			backgroundColor = "white",
		} = options;

		if (elements.length === 0) {
			const emptyCanvas = document.createElement("canvas");
			emptyCanvas.width = 1;
			emptyCanvas.height = 1;
			resolve(emptyCanvas);
			return;
		}

		const tempCanvas = document.createElement("canvas");
		const { minX, minY, maxX, maxY } = getCombinedElementBounds(elements);

		tempCanvas.width = maxX - minX + padding * 2;
		tempCanvas.height = maxY - minY + padding * 2;
		const tempCtx = tempCanvas.getContext("2d")!;

		// Draw background
		tempCtx.fillStyle = backgroundColor;
		tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

		// Translate context to fit all elements
		tempCtx.translate(-minX + padding, -minY + padding);

		drawElementsOnCanvas(tempCtx, elements, activeAnnotationId);

		// Use setTimeout to ensure the canvas has been painted before resolving.
		setTimeout(() => resolve(tempCanvas), 100);
	});
};

export const handleExportToJson = (slug: string, canvasElements: Element[]) => {
	// 1. Deep clone elements to avoid mutating the original state.
	const elementsToExport = JSON.parse(
		JSON.stringify(canvasElements)
	) as Element[];

	// 2. Anonymize user-specific data.
	const anonymizedElements = elementsToExport.filter(
		(el) => el.type !== "annotation"
	);

	// 3. Create JSON content and trigger download.
	const jsonString = JSON.stringify(anonymizedElements, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `canvas-export-${slug}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};
