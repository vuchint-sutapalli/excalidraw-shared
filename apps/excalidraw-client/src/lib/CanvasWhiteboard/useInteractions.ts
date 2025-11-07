import { useState, useCallback, useEffect, useRef } from "react";
import type {
	Element,
	ElementType,
	Point,
	HandleType,
	PencilElement,
	WireElement,
	AnnotationElement,
} from "./types";
import type { TextElement } from "./types";
import {
	hitTestHandle,
	getElementAtPosition,
	moveElement,
	resizeElement,
	getElementCenter,
	isElementIntersectingRect,
	getHandlePoint,
} from "./element";
import { simplifyPath, rotatePoint } from "./geometry";
import { generateId } from "./id";
import { throttle } from "../index";
import { HOVER_LENIENCY, MIN_SIZE_THRESHOLD } from "./constants";
import { useWhiteboard } from "./WhiteboardContext";

/**
 * Factory function to create a new element based on the tool type and position.
 */
const createElement = (
	type: ElementType,
	pos: Point,
	defaultStyles: Partial<Element>
): Element => {
	console.log(`default styles are ${JSON.stringify(defaultStyles)}`);

	const base = {
		id: generateId(),
		x: pos.x,
		y: pos.y,
		rotation: 0,
		...defaultStyles,
	};
	switch (type) {
		case "rectangle":
			return {
				...base,
				type: "rectangle",
				width: 0,
				height: 0,
				fill: base.fill || "#e6e6e6",
			};
		case "diamond":
			return {
				...base,
				type: "diamond",
				width: 0,
				height: 0,
				fill: base.fill || "#e6e6e6",
			};
		case "circle":
			return {
				...base,
				type: "circle",
				radius: 0,
				fill: base.fill || "#e6e6e6",
			};
		case "arrow":
			return {
				...base,
				type: "arrow",
				x2: pos.x,
				y2: pos.y,
				// Arrows are not filled
				fill: undefined,
			};
		case "pencil":
			return {
				...base,
				type: "pencil",
				points: [{ x: pos.x, y: pos.y }],
				// Pencil strokes are not filled
				fill: undefined, // Explicitly setting to undefined
			};
		case "line":
			return {
				...base,
				type: "line",
				x2: pos.x,
				y2: pos.y,
				// Lines are not filled
				fill: undefined,
			};
		case "text":
			return {
				...base,
				type: "text",
				text: "",
				fontSize: base.labelFontSize || 36,
				fontFamily: base.labelFontFamily || "'virgil', sans-serif",
				width: 0,
				height: 0,
				// Text is filled with its color, not a separate fill property
				fill: base.stroke,
				stroke: undefined,
			};
		case "annotation":
			return {
				...base,
				type: "annotation",
				isActivelySelected: false,
				width: 32,
				height: 32,
				annotationState: "open",
				fill: "#FF4136", // A default red color to make it visible
				authorId: "", // Will be set later
				authorName: "", // Will be set later
				comments: [],
			};
		case "eraser":
			// Eraser doesn't create an element, so we can return a placeholder
			// or handle it upstream. Returning a line is a safe fallback.
			// The interaction logic will prevent it from being added.
			return {
				id: "eraser-placeholder",
				type: "line",
				x: 0,
				y: 0,
				x2: 0,
				y2: 0,
			};
		// `wire` and `selection` are not created via this direct drawing method.
		case "laser":
			// Laser doesn't create an element, so we can return a placeholder
			// that will be ignored by the interaction logic.
			return {
				id: "laser-placeholder",
				type: "line",
				x: 0,
				y: 0,
				x2: 0,
				y2: 0,
			};
		// Fallback to a line element if an unexpected type is passed.
		case "highlighter":
			return {
				...base,
				type: "pencil", // It behaves like a pencil
				points: [{ x: pos.x, y: pos.y }],
				stroke: "#ff0000", // Glowing red color
				strokeWidth: 8, // Make it thicker
				opacity: 0.6, // Semi-transparent for a highlighter effect
				isHighlighter: true, // Custom flag to identify highlighter strokes
			};
		default:
			return {
				id: generateId(),
				type: "line",
				x: pos.x,
				y: pos.y,
				x2: pos.x,
				y2: pos.y,
				fill: undefined,
			};
	}
};

/**
 * A comprehensive hook to manage all user interactions on the canvas.
 * This includes drawing, selecting, moving, resizing, rotating, curving, and panning.
 * It functions as a state machine, transitioning between different `Action` states.
 */

interface UseInteractionsProps {
	onElementClick?: (element: Element) => void;
}

export const useInteractions = ({ onElementClick }: UseInteractionsProps) => {
	const {
		activeCanvasRef,
		elements,
		handleElementsChange,
		updateElements,
		setEditingElement,
		setDrawingAngleInfo,
		viewTransform,
		setHighlighterScribbles,
		setViewTransform,
		isSpacePressed,
		isCtrlPressed,
		readOnly,
		onCursorMove,
		onStrokeStart,
		onStrokeUpdate,
		onHighlightStart,
		onHighlightUpdate,
		onHighlightEnd,
		onStrokeEnd,
		onElementCreate,
		onSaveToHistory,
		onElementsUpdate,
		// onElementClick,
		onElementsDelete,
		action,
		setPointerTrail,
		setAction,
		setSelectionRect,
		wireHoveredElement,
		setWireHoveredElement,
		currentUserId,
		currentUserName,
		selectedElements,
		setSelectedElements,
		selectedTool,
		setSelectedTool,
		selectionRect,
		defaultStyles,
		highlighterScribbles,
	} = useWhiteboard();

	// State for element transformations.
	const [resizeHandle, setResizeHandle] = useState<HandleType | null>(null);
	const [startPos, setStartPos] = useState<Point>({ x: 0, y: 0 });
	const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
	const [wiringState, setWiringState] = useState<{
		startElement: Element;
		startHandle: HandleType;
		startPoint: Point;
		tempLine: Element | null;
	} | null>(null);
	const erasedElementsDuringStroke = useRef<Set<string>>(new Set());

	// Refs for managing complex interactions like panning and rotation.
	const activePointers = useRef<Map<number, Point>>(new Map()); // Tracks active pointers for multi-touch gestures.
	const panStartRef = useRef<{
		point: Point;
		viewTransform: { offsetX: number; offsetY: number };
	}>({ point: { x: 0, y: 0 }, viewTransform: { offsetX: 0, offsetY: 0 } });
	const rotationCenterRef = useRef<Point | null>(null);
	const initialRotationRef = useRef<number>(0);

	// Effect to update the cursor style based on the current tool and interaction.
	useEffect(() => {
		const canvas = activeCanvasRef.current;
		if (!canvas) return;

		// Panning cursor takes precedence.
		if (isSpacePressed || isCtrlPressed) {
			canvas.style.cursor = "grab";
			return;
		}

		if (selectedTool !== "wire" && wireHoveredElement) {
			setWireHoveredElement(null);
		}

		switch (selectedTool) {
			case "selection":
				canvas.style.cursor = "default";
				break;
			case "rectangle":
			case "diamond":
			case "circle":
			case "arrow":
			case "pencil":
			case "line":
			case "wire":

			case "eraser":
			case "laser":
				canvas.style.cursor = "crosshair";
				break;
			case "highlighter":
				canvas.style.cursor = "crosshair"; // Or a custom highlighter cursor
				break;
			case "text":
				canvas.style.cursor = "text";
				break;
		}
	}, [
		selectedTool,
		activeCanvasRef,
		isSpacePressed,
		isCtrlPressed,
		wireHoveredElement,
	]);

	/**
	 * Converts pointer event coordinates from screen space to canvas "world" space.
	 * This accounts for the current pan and zoom level.
	 */
	const getCanvasPos = useCallback(
		(event: React.PointerEvent<HTMLCanvasElement>) => {
			const canvas = activeCanvasRef.current!;
			const rect = canvas.getBoundingClientRect();
			const screenX = event.clientX - rect.left;
			const screenY = event.clientY - rect.top;
			// Convert screen coordinates to world coordinates
			const worldX = (screenX - viewTransform.offsetX) / viewTransform.scale;
			const worldY = (screenY - viewTransform.offsetY) / viewTransform.scale;
			return { x: worldX, y: worldY };
		},
		[activeCanvasRef, viewTransform]
	);

	/**
	 * Converts pointer event coordinates to screen space, relative to the canvas element.
	 * This is used for interactions that don't depend on zoom/pan, like panning itself.
	 */
	const getScreenPos = useCallback(
		(event: React.PointerEvent<HTMLCanvasElement>) => {
			const canvas = activeCanvasRef.current!;
			const rect = canvas.getBoundingClientRect();
			return { x: event.clientX - rect.left, y: event.clientY - rect.top };
		},
		[activeCanvasRef]
	);

	const handleAnnotationPlacement = useCallback(
		(pos: Point) => {
			setAction("placing_annotation");
			setStartPos(pos);
		},
		[setAction, setStartPos]
	);

	/**
	 * Handles interactions when the "selection" tool is active.
	 * This function determines whether to start a resize, drag, rotation, or multi-selection.
	 * The order of checks is important to prioritize handle interactions over general element clicks.
	 */
	const handleSelectionInteraction = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>, pos: Point) => {
			// Priority 1: Check for handle interaction on selected elements.
			// If readOnly, only allow annotation clicks to proceed.
			// All other selection/dragging/resizing should be blocked.
			if (readOnly) {
				return;
			}
			if (selectedElements.length > 0) {
				const activeElement = selectedElements[0];
				const handle = hitTestHandle(activeElement, pos);

				if (handle) {
					if (handle === "curve") {
						setAction("curving");
					} else if (handle === "rotation") {
						setAction("rotating");
						rotationCenterRef.current = getElementCenter(activeElement);
						initialRotationRef.current = activeElement.rotation || 0;
						setStartPos(pos);
					}
					// else if (handle === "copy") {
					// 	const newElement = JSON.parse(JSON.stringify(activeElement));
					// 	newElement.id = generateId();
					// 	moveElement(newElement, 15, 15);
					// 	updateElements([newElement]);
					// 	setSelectedElements([newElement]);
					// 	setAction("none"); // It's a one-off action.
					// }
					else {
						setAction("resizing");
						setResizeHandle(handle);
						setStartPos(pos);
					}
					// Save state before starting a transformation
					onSaveToHistory?.();
					return; // Handle found, interaction started.
				}
			}

			// Priority 2: Check if we are clicking on an element to select or drag it.
			const elementUnderPointer = getElementAtPosition(elements, pos, 30);
			console.log("elements under pointer", elementUnderPointer);

			if (elementUnderPointer) {
				// If the user clicks on an existing annotation, open the modal.
				if (elementUnderPointer.type === "annotation") {
					console.log("clicking the annotation", elementUnderPointer);

					onElementClick?.(elementUnderPointer);
					return;
				}

				// Save state before starting a drag
				onSaveToHistory?.();
				setAction("dragging");
				setDragOffset({
					x: pos.x - elementUnderPointer.x,
					y: pos.y - elementUnderPointer.y,
				});
				if (!selectedElements.some((el) => el.id === elementUnderPointer.id)) {
					setSelectedElements([elementUnderPointer]);
				}
				return;
			}

			// Priority 3: Click on empty space. Start multi-selection.
			setAction("multi-selecting");
			setStartPos(pos);
			setSelectionRect({
				id: "selection",
				type: "rectangle",
				x: pos.x,
				y: pos.y,
				width: 0,
				height: 0,
			});
			setSelectedElements([]);
		},
		[
			elements,
			selectedElements,
			setSelectedElements,
			updateElements,
			onSaveToHistory,
			readOnly,
			onElementClick,
		]
	);

	/**
	 * Handles the start of a wiring interaction.
	 */
	const handleWiringInteraction = useCallback(
		(pos: Point) => {
			if (wiringState) return; // Already wiring.

			const el = getElementAtPosition(elements, pos, HOVER_LENIENCY);
			if (!el) return;

			const handle = hitTestHandle(el, pos, true);
			if (!handle || handle === "rotation") return;

			const handlePoint = getHandlePoint(el, handle);
			setAction("wiring");
			setWiringState({
				startElement: el,
				startHandle: handle,
				startPoint: handlePoint,
				tempLine: null,
			});
			setWireHoveredElement(null);
		},
		[elements, wiringState]
	);

	const handleDrawingInteraction = useCallback(
		(pos: Point) => {
			console.log("drawing interaction recreated");

			const newEl = createElement(selectedTool, pos, defaultStyles);
			setStartPos(pos);
			if (newEl.type === "text") {
				setAction("placing");
				setSelectedElements([newEl]);
			} else {
				setAction("drawing");
				setSelectedElements([newEl]);
			}
			if (newEl.type === "pencil") {
				onStrokeStart?.(newEl);
			}
		},
		[selectedTool, onStrokeStart, setSelectedElements, defaultStyles]
	);

	/**
	 * The main entry point for pointer down events.
	 * This function orchestrates the start of any interaction.
	 */
	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			// Capture the pointer to ensure we receive events even if the cursor leaves the canvas.
			e.currentTarget.setPointerCapture(e.pointerId);
			activePointers.current.set(e.pointerId, getScreenPos(e));

			// Panning takes precedence over all other actions.
			// It can be triggered by middle mouse, spacebar, ctrl key, or two-finger touch.
			const isPanning =
				e.button === 1 ||
				isSpacePressed ||
				isCtrlPressed ||
				activePointers.current.size > 1;

			// If readOnly, only allow panning.
			if (readOnly && !isPanning) {
				activePointers.current.delete(e.pointerId);
				return;
			}

			if (isPanning) {
				// If we are drawing, we want to cancel it and switch to panning.
				// This should only happen if not in readOnly mode.
				if (!readOnly && action === "drawing" && selectedElements.length > 0) {
					onElementsDelete?.([selectedElements[0].id]);
					setSelectedElements([]);
				}

				// for two-finger panning, we need to recalculate the pan start point
				// to be the center of the two fingers.
				if (action !== "panning" && activePointers.current.size > 1) {
					setAction("panning");
					const pointers = Array.from(activePointers.current.values());
					panStartRef.current.point = {
						x: (pointers[0].x + pointers[1].x) / 2,
						y: (pointers[0].y + pointers[1].y) / 2,
					};
					panStartRef.current.viewTransform.offsetX = viewTransform.offsetX;
					panStartRef.current.viewTransform.offsetY = viewTransform.offsetY;
				}

				setAction("panning");
				panStartRef.current = {
					point: getScreenPos(e),
					viewTransform: {
						offsetX: viewTransform.offsetX,
						offsetY: viewTransform.offsetY,
					},
				};

				// If it's a two-finger pan, use the midpoint.
				if (activePointers.current.size > 1) {
					const pointers = Array.from(activePointers.current.values());
					panStartRef.current.point = {
						x: (pointers[0].x + pointers[1].x) / 2,
						y: (pointers[0].y + pointers[1].y) / 2,
					};
				}

				return;
			}

			// All other actions are disabled in readOnly mode.
			if (readOnly) {
				return;
			}

			// If not panning, determine the action based on the selected tool.
			const pos = getCanvasPos(e);
			if (selectedTool === "annotation") {
				console.log("detected annotation tool click");

				handleAnnotationPlacement(pos);
				return; // Explicitly stop here for annotation placement
			} else if (selectedTool === "selection") {
				handleSelectionInteraction(e, pos);
			} else if (selectedTool === "wire") {
				handleWiringInteraction(pos);
			} else if (selectedTool === "eraser") {
				handleEraserInteraction(pos);
			} else if (selectedTool === "laser") {
				handleLaserInteraction(pos);
			} else if (selectedTool === "highlighter") {
				handleHighlightingInteraction(pos);
			} else {
				handleDrawingInteraction(pos);
			}
		},
		[
			readOnly,
			getCanvasPos,
			getScreenPos,
			selectedTool,
			elements,
			selectedElements,
			setSelectedElements,
			updateElements,
			isSpacePressed,
			isCtrlPressed,
			viewTransform.offsetX,
			viewTransform.offsetY,
			action,
			handleAnnotationPlacement,
			handleSelectionInteraction,
			handleWiringInteraction,
			handleDrawingInteraction,
		]
	);

	const handleEraserInteraction = useCallback(
		(pos: Point) => {
			setAction("erasing");
			erasedElementsDuringStroke.current.clear();
			// Initial erase on pointer down
			setPointerTrail([{ x: pos.x, y: pos.y, timestamp: Date.now() }]);
			eraseElementAtPosition(pos);
		},
		[setPointerTrail]
	);

	const handleLaserInteraction = useCallback(
		(pos: Point) => {
			setAction("lasering");
			setPointerTrail([{ x: pos.x, y: pos.y, timestamp: Date.now() }]);
		},
		[setPointerTrail]
	);

	const handleHighlightingInteraction = useCallback(
		(pos: Point) => {
			const newScribble = createElement("highlighter", pos, defaultStyles);
			// Broadcast the start of the highlight
			onHighlightStart?.(newScribble);
			setHighlighterScribbles((prev) => [...prev, newScribble]);
			setAction("highlighting");
		},
		[setHighlighterScribbles, onHighlightStart, defaultStyles]
	);

	// Create a throttled function for highlight updates, just like for the pencil
	const throttledHighlightUpdate = useCallback(
		throttle((id: string, points: Point[]) => {
			onHighlightUpdate?.(id, points);
		}, 50),
		[onHighlightUpdate]
	);

	const eraseElementAtPosition = useCallback(
		(pos: Point) => {
			const elementToErase = getElementAtPosition(elements, pos);
			if (elementToErase) {
				erasedElementsDuringStroke.current.add(elementToErase.id);
				// Provide immediate visual feedback by updating selectedElements
				// The drawing hook will see this and can render them differently.
				// We pass dummy objects with just the ID to signal "erasing" status.
				setSelectedElements(
					Array.from(erasedElementsDuringStroke.current).map((id) => ({
						id,
					})) as Element[]
				);
			}
		},
		[elements, setSelectedElements]
	);
	/**
	 * The main handler for pointer move events.
	 * This function executes the logic for the current `action`.
	 */
	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const pos = getCanvasPos(e);
			// Always send cursor position, even if no action is active
			onCursorMove?.(pos);

			// Update pointer position for multi-touch gestures.
			if (activePointers.current.has(e.pointerId)) {
				activePointers.current.set(e.pointerId, getScreenPos(e));
			}

			const canvas = activeCanvasRef.current!;
			// --- Panning Logic ---
			if (action === "panning") {
				canvas.style.cursor = "grabbing";
				let currentScreenPos = getScreenPos(e);

				// For two-finger panning, use the midpoint of the pointers.
				if (activePointers.current.size > 1) {
					const pointers = Array.from(activePointers.current.values());
					currentScreenPos = {
						x: (pointers[0].x + pointers[1].x) / 2,
						y: (pointers[0].y + pointers[1].y) / 2,
					};
				}

				const panStart = panStartRef.current;
				const panDeltaX = currentScreenPos.x - panStart.point.x;
				const panDeltaY = currentScreenPos.y - panStart.point.y;
				setViewTransform({
					...viewTransform,
					offsetX: panStart.viewTransform.offsetX + panDeltaX,
					offsetY: panStart.viewTransform.offsetY + panDeltaY,
				});
				return;
			}

			// --- Erasing Logic ---
			if (action === "erasing") {
				setPointerTrail((trail) => [
					...trail,
					{ x: pos.x, y: pos.y, timestamp: Date.now() },
				]);
				eraseElementAtPosition(pos);
				return;
			}

			// --- Laser Logic ---
			if (action === "lasering") {
				setPointerTrail((trail) => [
					...trail,
					{ x: pos.x, y: pos.y, timestamp: Date.now() },
				]);
				return;
			}

			// --- Highlighting Logic ---
			if (action === "highlighting") {
				setHighlighterScribbles((scribbles) => {
					// Create a new array to ensure React detects a state change.
					const newScribbles = [...scribbles];
					// Get a reference to the last scribble (the one being drawn).
					const currentScribble = newScribbles[
						newScribbles.length - 1
					] as PencilElement;
					const newPoints = [...currentScribble.points, { x: pos.x, y: pos.y }];
					// Directly mutate the points array of the current scribble.
					currentScribble.points = newPoints;
					// Broadcast the update
					throttledHighlightUpdate(currentScribble.id, newPoints);
					return newScribbles;
				});
				return;
			}

			// --- Wiring Logic ---
			if (action === "wiring" && wiringState) {
				const tempLine: Element = {
					id: "wiring-temp",
					type: "arrow",
					x: wiringState.startPoint.x,
					y: wiringState.startPoint.y,
					x2: pos.x,
					y2: pos.y,
				};
				setWiringState({ ...wiringState, tempLine });
				// Since this is ephemeral, we draw it on the active canvas
				// by putting it in selectedElements.
				setSelectedElements([tempLine]);

				// Also perform hover detection for the destination element
				// const HOVER_LENIENCY = 30; // 30px buffer around elements
				const el = getElementAtPosition(elements, pos, HOVER_LENIENCY);
				if (el && el.id !== wiringState.startElement.id) {
					const handle = hitTestHandle(el, pos);
					if (handle) {
						canvas.style.cursor = "pointer";
					} else {
						canvas.style.cursor = "crosshair";
					}
					if (
						!wireHoveredElement ||
						wireHoveredElement.element?.id !== el.id ||
						wireHoveredElement.handle !== handle
					) {
						setWireHoveredElement({ element: el, handle: handle });
					}
				} else {
					if (wireHoveredElement) {
						setWireHoveredElement(null);
					}
					canvas.style.cursor = "crosshair";
				}
				return; // Exit after handling wiring move
			}

			// --- Hover Logic (when no action is active) ---
			if (action === "none") {
				if (selectedTool === "wire") {
					// const HOVER_LENIENCY = 30; // 10px buffer around elements
					const el = getElementAtPosition(elements, pos, HOVER_LENIENCY);
					if (el) {
						// We are hovering over an element. Show its handles.
						const handle = hitTestHandle(el, pos, true); // Check if we are also on a handle.
						if (handle) {
							canvas.style.cursor = "pointer";
						} else {
							// If we are over an element but not a handle, don't show a special cursor.
							// This prevents the cursor from flickering between 'pointer' and 'crosshair'.
							canvas.style.cursor = "crosshair";
						}

						// Update state if the hovered element or handle has changed.
						if (
							!wireHoveredElement ||
							wireHoveredElement.element?.id !== el.id ||
							wireHoveredElement.handle !== handle
						) {
							setWireHoveredElement({ element: el, handle: handle });
						}
						return; // Exit early
					}
					// If no element is found, clear the hover state.
					// Only update state if it's not already null.
					if (wireHoveredElement !== null) {
						setWireHoveredElement(null);
					}
					canvas.style.cursor = "crosshair";
				}
				// else if (selectedTool === "selection") {
				// 	if (isSpacePressed || isCtrlPressed) {
				// 		canvas.style.cursor = "grab";
				// 		return;
				// 	}
				// 	const el = getElementAtPosition(elements, pos);
				// 	if (el) {
				// 		const handle = hitTestHandle(el, pos);
				// 		// Set cursor based on the handle type.
				// 		if (handle) {
				// 			switch (handle) {
				// 				case "top-left":
				// 				case "bottom-right":
				// 					canvas.style.cursor = "nwse-resize";
				// 					break;
				// 				case "top-right":
				// 				case "bottom-left":
				// 					canvas.style.cursor = "nesw-resize";
				// 					break;
				// 				case "start":
				// 				case "end":
				// 					canvas.style.cursor = "pointer";
				// 					break;
				// 				case "rotation":
				// 					canvas.style.cursor = "crosshair"; // Or a custom rotation cursor
				// 					break;
				// 				case "curve":
				// 					canvas.style.cursor = "move";
				// 					break;
				// 				default:
				// 					canvas.style.cursor = "ew-resize";
				// 					break;
				// 			}
				// 		} else {
				// 			canvas.style.cursor = "move";
				// 		}
				// 	} else {
				// 		canvas.style.cursor = "default";
				// 	}
				// }
				return; // All hover logic is done, no need to continue
			}

			// --- Placing Text Logic ---
			if (action === "placing") {
				const distance = Math.hypot(pos.x - startPos.x, pos.y - startPos.y);
				if (distance > 5) {
					// if user drags more than 5px, cancel placing and switch to drawing a text box.
					// This is a potential future feature. For now, it just cancels.
					setAction("none");
				}
				return;
			}

			// --- Multi-selecting Logic ---
			if (action === "multi-selecting" && selectionRect) {
				setSelectionRect({
					...selectionRect,
					width: pos.x - startPos.x,
					height: pos.y - startPos.y,
				});
				return;
			}

			// --- Drawing Logic ---
			if (action === "drawing" && selectedElements.length > 0 && startPos) {
				const updatedEl = { ...selectedElements[0] };
				// Update the element's properties based on its type.
				if (updatedEl.type === "rectangle" || updatedEl.type === "diamond") {
					updatedEl.width = pos.x - startPos.x;
					updatedEl.height = pos.y - startPos.y;
					setDrawingAngleInfo(null);
				} else if (updatedEl.type === "pencil") {
					const newPoints = [
						...(updatedEl as PencilElement).points,
						{ x: pos.x, y: pos.y },
					];
					(updatedEl as PencilElement).points = newPoints;
					// For real-time collaboration, send updates
					if (updatedEl.type === "pencil") {
						onStrokeUpdate?.(updatedEl.id, newPoints);
					}
					setDrawingAngleInfo(null);
				} else if (updatedEl.type === "line" || updatedEl.type === "arrow") {
					updatedEl.x2 = pos.x;
					updatedEl.y2 = pos.y;
					const dx = updatedEl.x2 - updatedEl.x;
					const dy = updatedEl.y2 - updatedEl.y;
					if (dx !== 0 || dy !== 0) {
						const angleRad = Math.atan2(dy, dx);
						const angleDeg = (angleRad * 180) / Math.PI;
						setDrawingAngleInfo({
							angle: Math.round(angleDeg),
							x: pos.x,
							y: pos.y,
						});
					} else {
						setDrawingAngleInfo(null);
					}
				} else if (updatedEl.type === "circle") {
					updatedEl.radius = Math.hypot(pos.x - startPos.x, pos.y - startPos.y);
					setDrawingAngleInfo(null);
				} else if (updatedEl.type === "annotation") {
					// For annotations, we just update the position, size is fixed.
					updatedEl.x = pos.x;
					updatedEl.y = pos.y;
				}
				setSelectedElements([updatedEl]);
			}
			// --- Dragging Logic ---
			else if (
				action === "dragging" &&
				selectedElements.length > 0 &&
				dragOffset
			) {
				const leadElement =
					getElementAtPosition(selectedElements, startPos) ||
					selectedElements[0];
				const dx = pos.x - dragOffset.x - leadElement.x;
				const dy = pos.y - dragOffset.y - leadElement.y;
				const newSelectedElements = selectedElements.map((el) => {
					const newEl = { ...el };
					moveElement(newEl, dx, dy);
					return newEl;
				});
				setSelectedElements(newSelectedElements);
			}
			// --- Curving Logic ---
			else if (
				action === "curving" &&
				selectedElements.length > 0 &&
				startPos
			) {
				const activeElement = selectedElements[0];
				if (activeElement.type === "line" || activeElement.type === "arrow") {
					// Transform the mouse position into the element's local coordinate system
					// by applying the inverse rotation.
					const center = getElementCenter(activeElement);
					const localPos = activeElement.rotation
						? rotatePoint(
								pos,
								center,
								-activeElement.rotation * (Math.PI / 180)
							)
						: pos;

					// The user drags the handle, which should be a point ON the curve.
					// We'll call this point P_handle (localPos).
					// The actual Bezier control point (P1) needs to be calculated
					// such that the curve passes through P_handle at t=0.5.
					// The formula is: P1 = 2 * P_handle - 0.5 * P0 - 0.5 * P2
					const p0 = { x: activeElement.x, y: activeElement.y };
					const p2 = { x: activeElement.x2, y: activeElement.y2 };
					const cp1x = 2 * localPos.x - 0.5 * p0.x - 0.5 * p2.x;
					const cp1y = 2 * localPos.y - 0.5 * p0.y - 0.5 * p2.y;

					const curvedEl = {
						...activeElement,
						cp1x,
						cp1y,
						curveHandleX: localPos.x,
						curveHandleY: localPos.y,
					};
					setSelectedElements([curvedEl]);
				}
				return;
			}
			// --- Rotating Logic ---
			else if (
				action === "rotating" &&
				selectedElements.length > 0 &&
				rotationCenterRef.current
			) {
				const center = rotationCenterRef.current;
				const startVector = {
					x: startPos.x - center.x,
					y: startPos.y - center.y,
				};
				const startAngle = Math.atan2(startVector.y, startVector.x);

				const currentVector = { x: pos.x - center.x, y: pos.y - center.y };
				const currentAngle = Math.atan2(currentVector.y, currentVector.x);

				const angleDiff = currentAngle - startAngle;
				const newRotation =
					initialRotationRef.current + (angleDiff * 180) / Math.PI;

				const rotatedEl = { ...selectedElements[0], rotation: newRotation };
				setSelectedElements([rotatedEl]);
			}
			// --- Resizing Logic ---
			else if (
				action === "resizing" &&
				selectedElements.length > 0 &&
				resizeHandle &&
				startPos
			) {
				const activeElement = selectedElements[0]!;
				const dx = pos.x - startPos.x;
				const dy = pos.y - startPos.y;
				const resizedEl = { ...activeElement };
				resizeElement(resizedEl, resizeHandle, dx, dy);
				setSelectedElements([resizedEl]);
				if (resizedEl.type === "line" || resizedEl.type === "arrow") {
					const rdx = resizedEl.x2 - resizedEl.x;
					const rdy = resizedEl.y2 - resizedEl.y;
					if (rdx !== 0 || rdy !== 0) {
						const angleRad = Math.atan2(rdy, rdx);
						const angleDeg = (angleRad * 180) / Math.PI;
						setDrawingAngleInfo({
							angle: Math.round(angleDeg),
							x: pos.x,
							y: pos.y,
						});
					}
				} else {
					setDrawingAngleInfo(null);
				}
				setStartPos(pos);
			}
		},
		[
			action,
			getCanvasPos,
			getScreenPos,
			selectedTool,
			selectedElements,
			startPos,
			dragOffset,
			resizeHandle,
			elements,
			selectionRect,
			activeCanvasRef,
			setSelectedElements,
			setDrawingAngleInfo,
			isSpacePressed,
			isCtrlPressed,
			eraseElementAtPosition,
			setViewTransform,
			viewTransform,
			wireHoveredElement,
			wiringState,
		]
	);

	/**
	 * The main handler for pointer up events.
	 * This function finalizes the current interaction.
	 */
	const handlePointerUp = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			console.log(" handling pointer up");

			// Release the pointer capture.
			e.currentTarget.releasePointerCapture(e.pointerId);

			activePointers.current.delete(e.pointerId);
			const canvas = activeCanvasRef.current;

			if (readOnly && action !== "panning") {
				setSelectedElements([]); // Ensure selected elements are cleared
				setSelectionRect(null); // Clear selection rectangle
				return;
			}

			if (action === "panning") {
				if (canvas) {
					canvas.style.cursor =
						isSpacePressed || isCtrlPressed ? "grab" : "default";
				}
				// A pan action always ends on pointer up.
				setAction("none");
				return;
			}

			if (action === "erasing") {
				const idsToErase = erasedElementsDuringStroke.current;
				if (idsToErase.size > 0) {
					onElementsDelete?.(Array.from(idsToErase));
				}
				setSelectedElements([]); // Clear selection after erasing
				erasedElementsDuringStroke.current.clear();
				setPointerTrail([]); // Clear the visual trail
			} else if (action === "lasering") {
				// The laser is purely visual, so we just need to clear the trail on pointer up.
				setPointerTrail([]);
			} else if (action === "highlighting") {
				// Finalize the scribble. It's already in the state, so we just simplify the path.
				const currentScribble =
					highlighterScribbles[highlighterScribbles.length - 1];
				// if (currentScribble && currentScribble.type === "pencil") {
				// 	const simplifiedPoints = simplifyPath(currentScribble.points, 1.0);
				// 	const finalScribble = {
				// 		...currentScribble,
				// 		points: simplifiedPoints,
				// 	};
				// 	setHighlighterScribbles((scribbles) => [
				// 		...scribbles.slice(0, -1),
				// 		finalScribble,
				// 	]);
				// }
				if (currentScribble) {
					onHighlightEnd?.(currentScribble.id);
				}
				// Do NOT switch back to selection tool, to allow for continuous highlighting.
				setAction("none");
			} else if (action === "wiring") {
				setAction("none");
				// handleWiringInteraction(getCanvasPos(e));
				// Finalize the wire creation on pointer up.
				const pos = getCanvasPos(e);
				const endEl = getElementAtPosition(elements, pos, HOVER_LENIENCY);
				if (wiringState && endEl) {
					let endHandle = hitTestHandle(endEl, pos, true);
					if (endHandle === "rotation") {
						endHandle = null;
					}

					if (endHandle) {
						const endPoint = getHandlePoint(endEl, endHandle);
						const newWire: WireElement = {
							id: generateId(),
							type: "wire",
							x: wiringState.startPoint.x,
							y: wiringState.startPoint.y,
							x2: endPoint.x,
							y2: endPoint.y,
							label: "",
							startElementId: wiringState.startElement.id,
							endElementId: endEl.id,
							startHandle: wiringState.startHandle,
							endHandle: endHandle,
						};
						onElementCreate?.(newWire);
						setSelectedElements([newWire]);
					} else {
						// If no valid handle is found, cancel the wiring and clear the temp line.
						setSelectedElements([]);
					}
				}
				setWiringState(null);
				setWireHoveredElement(null);
			} else if (action === "multi-selecting" && selectionRect) {
				// Finalize multi-selection
				const selected = elements.filter((el) =>
					isElementIntersectingRect(el, selectionRect)
				);
				setSelectedElements(selected);
				setSelectionRect(null);
			} else if (
				["drawing", "resizing", "dragging", "rotating", "curving"].includes(
					action
				) &&
				selectedElements.length > 0
			) {
				console.log("finalizing", action, selectedElements);

				// This is the key fix. If the action was 'dragging' but the mouse
				// barely moved, we identify it as a click. We must NOT finalize
				// the transform, as that would send an unnecessary update and
				// cause the annotation modal to close.
				if (
					action === "dragging" &&
					startPos &&
					Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) < 5
				) {
					// It was a click, do nothing else.
				} else {
					// Finalize any element transformation or creation.
					let finalElements = selectedElements.map((el) => {
						if (el.type === "pencil" && el.points.length > 1) {
							// Simplify the path before storing it to improve performance and reduce storage size.
							// An epsilon of 1.0 is a good starting point.
							const simplifiedPoints = simplifyPath(el.points, 1.0);

							// For real-time collaboration, signal the end of the stroke
							if (action === "drawing") {
								console.log("calling stroke end");

								onStrokeEnd?.(el.id, simplifiedPoints);
							}
							return { ...el, points: simplifiedPoints };
						}

						return el;
					});

					// Prevent creation of very small elements on drawing completion
					if (action === "drawing") {
						finalElements = finalElements.filter((el) => {
							if (el.type === "rectangle" || el.type === "diamond") {
								return (
									Math.abs(el.width) > MIN_SIZE_THRESHOLD &&
									Math.abs(el.height) > MIN_SIZE_THRESHOLD
								);
							}
							if (el.type === "circle") {
								return el.radius > MIN_SIZE_THRESHOLD;
							}
							if (el.type === "line" || el.type === "arrow") {
								return (
									Math.hypot(el.x2 - el.x, el.y2 - el.y) > MIN_SIZE_THRESHOLD
								);
							}
							if (el.type === "pencil") {
								// A pencil stroke should have at least a few points to be considered intentional
								return el.points.length > 2;
							}
							// For other types, we don't have a size check, so we keep them.
							return true;
						});
					}

					if (action === "drawing") {
						finalElements.forEach((el) => onElementCreate?.(el));
					} else {
						onElementsUpdate?.([...finalElements]);

						// onElementsUpdate?.(
						// 	finalElements.map(({ id, x, y, width, height, rotation }) => ({
						// 		id,
						// 		x,
						// 		y,
						// 		width,
						// 		height,
						// 		rotation,
						// 	}))
						// );
					}
					// updateElements(finalElements);

					// // Only call updateElements for non-pencil drawings, as pencil strokes
					// // are handled by the real-time stroke-end event.
					// const nonPencilElements = finalElements.filter(
					// 	(el) => el.type !== "pencil"
					// );
					// if (nonPencilElements.length > 0) {
					// 	updateElements(nonPencilElements);
					// }
				}
			} else if (action === "placing" && selectedTool === "text") {
				const newEl = createElement(
					selectedTool,
					startPos,
					defaultStyles
				) as TextElement;
				onElementCreate?.(newEl);
				setEditingElement(newEl);
				// We don't call updateElements yet, that will happen in handleLabelUpdate
			}

			if (action === "placing_annotation") {
				console.log("placing annotation action detected in pointer up");

				// This is a click to place a new annotation.
				// We create the element and immediately trigger the onElementClick
				// callback, which will be handled by the parent to show the modal.
				const newAnnotation = {
					...createElement("annotation", getCanvasPos(e), defaultStyles),
					authorId: currentUserId || "unknown",
					authorName: currentUserName || "Anonymous",
				} as AnnotationElement;

				onElementClick?.(newAnnotation);
				setAction("none"); // Reset action immediately
			}

			// Handle a simple click on an element. This is to prevent
			// the 'dragging' action from finalizing and sending an update.
			if (
				action === "dragging" &&
				startPos &&
				Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) < 5
			) {
				setAction("none"); // This was a click, not a drag. Reset and do nothing else.
				return;
			}

			// // Handle a simple click on an element
			// if (
			// 	action === "dragging" &&
			// 	startPos &&
			// 	Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) < 5
			// ) {
			// 	const element = getElementAtPosition(
			// 		elements,
			// 		getCanvasPos(e),
			// 		5,
			// 		true
			// 	);
			// 	if (element) {
			// 		onElementClick?.(element);
			// 		setAction("none"); // This was a click, not a drag
			// 	}
			// }

			const previousAction = action;

			// Reset interaction state
			setAction("none");
			setDrawingAngleInfo(null);
			setResizeHandle(null);
			rotationCenterRef.current = null;

			// After drawing or wiring, switch back to the selection tool for a smoother workflow.
			if (
				previousAction === "drawing" ||
				previousAction === "wiring" ||
				previousAction === "erasing"
			) {
				if (selectedTool !== "pencil") {
					setSelectedTool("selection");
				}
			} else if (
				previousAction === "placing" ||
				previousAction === "placing_annotation"
			) {
				setSelectedTool("selection");
			}
		},
		[
			readOnly,
			action,
			selectedElements,
			updateElements,
			elements,
			selectionRect,
			setSelectedElements,
			setSelectedTool,
			setDrawingAngleInfo,
			setEditingElement,
			startPos, // This was missing a comma
			highlighterScribbles, // This was missing a comma
			setHighlighterScribbles,
			setPointerTrail,
			selectedTool,
			isSpacePressed,
			isCtrlPressed,
			handleElementsChange,
			getCanvasPos,
			activeCanvasRef,
		]
	);

	return {
		action,
		selectionRect,
		wireHoveredElement,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
	};
};
