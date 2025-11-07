import { useLayoutEffect, useRef, useEffect, useMemo } from "react";
import { useWhiteboard } from "../WhiteboardContext";

import { TRAIL_RENDERING_STRATEGY } from "../constants";
import { getElementCenter, getHandlePoint } from "../element";
import {
	drawElement,
	drawSelectionRect,
	drawAngleIndicator,
	drawPointerTrailWithSegments,
	drawPointerTrailWithGradient,
	drawLabel,
	drawResizeHandles,
} from "./drawingUtils";
import { getCubicBezierControlPoints } from "./bezier";
// import { drawElementsOnCanvas } from "../exportUtils";

/**
 * A hook that manages all rendering operations for the whiteboard.
 * It uses a double-buffering technique with two canvases:
 * - `staticCanvas` (bottom layer): Renders all non-selected, static elements. It's only redrawn when elements are added, removed, or deselected.
 * - `activeCanvas` (top layer): Renders selected elements, handles, and interaction feedback (like selection boxes). It's cleared and redrawn on every frame during an interaction.
 */
export const useDrawing = () => {
	const {
		staticCanvasRef,
		activeCanvasRef,
		elements,
		wireHoveredElement,
		action,
		selectedElements,
		editingElement,
		selectionRect,
		drawingAngleInfo,
		pointerTrail,
		highlighterScribbles,
		inProgressHighlights,
		viewTransform,
		activeAnnotationId,
	} = useWhiteboard();

	console.log("start rendering");

	const copyIconRef = useRef<HTMLImageElement | null>(null);
	const rotationIconRef = useRef<HTMLImageElement | null>(null);
	const animationFrameId = useRef<number | null>(null);

	const editingElementId = editingElement ? editingElement.id : null;

	// Effect to load the SVG icons for the copy and rotate handles.
	useEffect(() => {
		const icon = new Image();
		const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
		icon.src = `data:image/svg+xml;utf8,${encodeURIComponent(copyIconSvg)}`;
		icon.onload = () => {
			copyIconRef.current = icon;
		};

		const rotIcon = new Image();
		const rotationIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0000ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;
		rotIcon.src = `data:image/svg+xml;utf8,${encodeURIComponent(rotationIconSvg)}`;
		rotIcon.onload = () => {
			rotationIconRef.current = rotIcon;
		};

		// Cleanup animation frame on unmount
		return () => {
			if (animationFrameId.current) {
				// eslint-disable-next-line react-hooks/exhaustive-deps
				cancelAnimationFrame(animationFrameId.current);
			}
		};
	}, []);

	// Create a stable string of IDs to use as a dependency for memoization.
	// This prevents re-calculating the Set when `selectedElements` array reference changes but the IDs remain the same.
	const selectedIdsString = selectedElements.map((el) => el.id).join(",");
	const selectedIds = useMemo(
		() => new Set(selectedElements.map((el) => el.id)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedIdsString]
	);

	// Effect for drawing the static canvas (bottom layer).
	// This is optimized to only run when the core elements, selection, or view transform change.
	useLayoutEffect(() => {
		const staticCanvas = staticCanvasRef.current;

		// This is the key optimization:
		// On the very first render, viewTransform will be in its default state.
		// We skip drawing to prevent a flicker, knowing that the ResizeObserver
		// will immediately trigger a second render with the correct, centered transform.

		if (
			!staticCanvas ||
			(viewTransform.scale === 0 &&
				viewTransform.offsetX === 0 &&
				viewTransform.offsetY === 0)
		)
			return;

		console.log("trying to draw static canvas", viewTransform);

		const { width, height } = staticCanvas.getBoundingClientRect();
		if (width === 0 || height === 0) {
			return;
		}

		const staticCtx = staticCanvas.getContext("2d")!;
		staticCtx.clearRect(0, 0, staticCanvas.width, staticCanvas.height);

		// --- Draw static canvas (bottom layer) ---
		staticCtx.save();
		staticCtx.translate(viewTransform.offsetX, viewTransform.offsetY);
		staticCtx.scale(viewTransform.scale, viewTransform.scale);

		const currentlySelectedIds = new Set(selectedIds);
		if (editingElementId) {
			currentlySelectedIds.add(editingElementId);
		}

		// const staticElements = elements.filter(
		// 	(el) => !currentlySelectedIds.has(el.id)
		// );

		// drawElementsOnCanvas(staticCtx, staticElements, activeAnnotationId);

		const elementsById = new Map(elements.map((el) => [el.id, el]));

		// Draw all elements that are NOT selected or being edited onto the static canvas.
		console.log(
			"drawing static elements",
			elements
				.filter((el) => !currentlySelectedIds.has(el.id))
				.map((el) => el.id)
		);

		elements
			.filter((el) => !currentlySelectedIds.has(el.id))
			.forEach((el) => {
				let elementToDraw = el;
				if (el.type === "annotation") {
					el.isActivelySelected = activeAnnotationId === el.id;
				}
				if (el.type === "wire") {
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
				drawElement(
					staticCtx,
					elementToDraw,
					false,
					null,
					null,
					null,
					false, // isErasing
					viewTransform
				);
			});

		staticCtx.restore();
	}, [
		elements,
		selectedIds, // Depends on the stable set of IDs now
		editingElementId,
		viewTransform,
		staticCanvasRef,
	]);

	// Effect for drawing the active canvas (top layer).
	// This runs on every interaction to provide real-time feedback.
	useLayoutEffect(() => {
		const activeCanvas = activeCanvasRef.current;
		if (!activeCanvas) return;

		const { width, height } = activeCanvas.getBoundingClientRect();
		if (width === 0 || height === 0) {
			return;
		}

		const activeCtx = activeCanvas.getContext("2d")!;
		activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);

		const elementsById = new Map(elements.map((el) => [el.id, el]));

		// --- Draw active canvas (top layer) ---
		activeCtx.save();
		activeCtx.translate(viewTransform.offsetX, viewTransform.offsetY);
		activeCtx.scale(viewTransform.scale, viewTransform.scale);

		// Draw in-progress remote highlights
		inProgressHighlights?.forEach((el) => {
			console.log("drawing higlighst");

			drawElement(
				activeCtx,
				el,
				false, // Not highlighted
				null,
				null,
				null,
				false, // Not erasing
				viewTransform
			);
		});

		// Draw highlighter scribbles
		highlighterScribbles.forEach((el) => {
			drawElement(
				activeCtx,
				el,
				false, // Not highlighted
				null,
				null,
				null,
				false, // Not erasing
				viewTransform
			);
		});

		// Draw the pointer trail for eraser or laser
		if (action === "erasing" || action === "lasering") {
			if (TRAIL_RENDERING_STRATEGY === "segments") {
				drawPointerTrailWithSegments(activeCtx, pointerTrail, action);
			} else {
				drawPointerTrailWithGradient(activeCtx, pointerTrail, action);
			}
		}

		// Draw elements marked for erasing with a "ghosted" style for feedback.
		// This is a bit of a hack: the eraser interaction puts dummy objects
		// with just an ID into `selectedElements`. We find the real elements
		// here and draw them with a special highlight state.
		const erasedElementIds = new Set(
			selectedElements.filter((el) => !el.type).map((el) => el.id)
			// Note: We create a new Set here to track elements drawn in this pass.
		);
		if (erasedElementIds.size > 0) {
			elements
				.filter((el) => erasedElementIds.has(el.id))
				.forEach((el) => {
					// The `highlight` is true, but the element has no type,
					// which `drawElement` uses as a signal to gray it out.
					drawElement(
						activeCtx,
						el,
						false, // Not a regular highlight
						null,
						null,
						null,
						true, // isErasing
						viewTransform
					);
				});
		}

		// Draw all selected elements in their highlighted state.
		selectedElements
			// Filter out elements that are part of the eraser feedback
			// to prevent them from being drawn twice with different styles.
			.filter((el) => el.type && !erasedElementIds.has(el.id))
			// Do not draw the element that is currently being edited.
			// The HTML LabelEditor component is rendered on top of it instead.
			.filter((el) => {
				if (editingElement && el.id === editingElement.id) {
					return false;
				}
				return true;
			})
			.forEach((el) => {
				console.log("drawing selected elements in active canvas", el);

				let elementToDraw = el;
				if (el.type === "annotation") {
					el.isActivelySelected = activeAnnotationId === el.id;
				}
				if (el.type === "wire") {
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
				drawElement(
					activeCtx,
					elementToDraw,
					true,
					copyIconRef.current,
					rotationIconRef.current,
					undefined,
					false, // isErasing
					viewTransform
				);
				// Manually draw the label on top for non-text elements
				if (
					"label" in elementToDraw &&
					elementToDraw.label &&
					elementToDraw.id !== editingElement?.id
				) {
					drawLabel(activeCtx, elementToDraw);
				}
			});

		// Draw handles for the element being hovered over by the wire tool
		if (
			wireHoveredElement?.element &&
			!selectedIds.has(wireHoveredElement.element.id)
		) {
			activeCtx.save();
			const { element } = wireHoveredElement;
			// Apply rotation to the context before drawing handles, so they appear in the correct place.
			const center = getElementCenter(element);
			if (element.rotation && center) {
				activeCtx.translate(center.x, center.y);
				activeCtx.rotate((element.rotation * Math.PI) / 180);
				activeCtx.translate(-center.x, -center.y);
			}
			drawResizeHandles(
				activeCtx,
				wireHoveredElement.element,
				null,
				null,
				wireHoveredElement.handle
			);
			activeCtx.restore();
		}
		if (selectionRect) {
			drawSelectionRect(activeCtx, selectionRect);
		}

		activeCtx.restore();

		// Draw the angle indicator in screen space, so it's not affected by canvas zoom/pan.
		if (drawingAngleInfo) {
			const screenX =
				drawingAngleInfo.x * viewTransform.scale + viewTransform.offsetX;
			const screenY =
				drawingAngleInfo.y * viewTransform.scale + viewTransform.offsetY;
			drawAngleIndicator(activeCtx, {
				...drawingAngleInfo,
				x: screenX,
				y: screenY,
			});
		}
	}, [
		elements, // Keep elements here for wire lookups
		wireHoveredElement,
		selectedElements,
		selectedIds,
		editingElement,
		selectionRect,
		viewTransform,
		pointerTrail,
		highlighterScribbles,
		action,
		inProgressHighlights,
		drawingAngleInfo,
		staticCanvasRef,
		activeCanvasRef,
	]);
};
