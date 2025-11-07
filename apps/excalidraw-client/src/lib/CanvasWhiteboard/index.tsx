import React, {
	useMemo,
	useRef,
	useState,
	forwardRef,
	useEffect,
	useCallback,
	useRef as useReactRef, // Alias to avoid confusion with component refs
	useImperativeHandle,
} from "react";
import type {
	Element,
	ElementType,
	Point,
	EraserPoint,
	RectangleElement,
	HandleType,
	Action,
	RemotePointer,
} from "./types";
import { throttle } from "@/lib/index";

import { STORAGE_KEY } from "./constants";
import { drawElement } from "./useDrawing/drawingUtils";
import { roundElementProperties, moveElement } from "./element";
import { generateId } from "./id";
import { tools as allToolbarTools } from "./Toolbar/toolbar";
import { WhiteboardContext } from "./WhiteboardContext";
import { WhiteboardUI } from "./WhiteboardUI";

import "./design-system.css";
import { getCubicBezierControlPoints } from "./useDrawing/bezier";
import { exportToCanvas } from "./exportUtils";

export interface CanvasWhiteboardProps {
	// Component size and styling
	className?: string;

	// State management
	initialElements?: Element[];
	controlledElements?: Element[];
	/** @deprecated use event based props instead */
	onElementsChange?: (elements: Element[]) => void;

	// Viewport management
	onElementClick: (element: Element) => void;
	onElementCreate?: (element: Element) => void;
	onElementsUpdate?: (elements: Partial<Element>[]) => void;
	onElementsDelete?: (elementIds: string[]) => void;

	activeAnnotationId?: string | null;
	// Viewport management
	initialViewTransform?: { scale: number; offsetX: number; offsetY: number };
	viewTransform?: { scale: number; offsetX: number; offsetY: number };
	onViewTransformChange?: (transform: {
		scale: number;
		offsetX: number;
		offsetY: number;
	}) => void;

	// Behavior
	readOnly?: boolean;
	enableLocalStorage?: boolean;
	showToolbar?: boolean;
	enableZoomPan?: boolean;
	enableCursorTracking?: boolean;
	globalKeyboardShortcuts?: boolean;

	// Collaboration props
	remotePointers?: Map<string, RemotePointer>;
	onCursorMove?: (point: Point) => void;
	onStrokeStart?: (element: Element) => void;
	onHighlightStart?: (element: Element) => void;
	onHighlightUpdate?: (strokeId: string, points: Point[]) => void;
	onHighlightEnd?: (strokeId: string) => void;
	onClearHighlights?: () => void;
	inProgressHighlights?: Element[];
	onClear?: () => void;
	inProgressStrokes?: Element[];
	onStrokeEnd?: (strokeId: string, points: Point[]) => void;
	onStrokeUpdate?: (strokeId: string, points: Point[]) => void;
	tools?: ElementType[];
	currentUserId?: string;
	currentUserName?: string;
}

export interface CanvasWhiteboardRef {
	clear: () => void;
	getElements: () => Element[];
	setElements: (elements: Element[]) => void;
	convertCanvasCoordsToScreenCoords: (coords: Point) => Point;
	getCanvasDataURL: () => Promise<string>;
	saveAsPNG: () => Promise<void>;
}

const CanvasWhiteboard = forwardRef<CanvasWhiteboardRef, CanvasWhiteboardProps>(
	(
		{
			className,
			initialElements = [],
			controlledElements,
			onElementsChange,
			onElementClick,
			onElementCreate,
			onElementsUpdate,
			onElementsDelete,
			initialViewTransform,
			activeAnnotationId,
			viewTransform: controlledViewTransform,
			onViewTransformChange,
			readOnly = false,
			enableLocalStorage = false,
			showToolbar = true,
			enableZoomPan = true,
			enableCursorTracking = false,
			globalKeyboardShortcuts = true,
			remotePointers,
			onCursorMove,
			onStrokeStart,
			onHighlightStart,
			onHighlightUpdate,
			onHighlightEnd,
			onClearHighlights,
			inProgressHighlights,
			onClear,
			inProgressStrokes,
			onStrokeEnd,
			onStrokeUpdate,
			tools: allowedTools,
			currentUserId,
			currentUserName,
		},
		ref
	) => {
		// --- 1. Refs ---
		const containerRef = useRef<HTMLDivElement>(null);
		const toolbarRef = useRef<HTMLDivElement>(
			null
		) as React.RefObject<HTMLDivElement>;
		const stylebarRef = useRef<HTMLDivElement>(
			null
		) as React.RefObject<HTMLDivElement>;
		const staticCanvasRef = useRef<HTMLCanvasElement>(
			null!
		) as React.RefObject<HTMLCanvasElement>; // Bottom canvas for static elements
		const activeCanvasRef = useRef<HTMLCanvasElement>(
			null!
		) as React.RefObject<HTMLCanvasElement>; // Top canvas for active/interactive elements

		// --- 2. State Management ---
		// Refs to hold the latest version of event handlers. This is a robust pattern
		// to avoid stale closures in callbacks passed to child components or hooks.

		const onElementCreateRef = useReactRef(onElementCreate);
		const onElementsUpdateRef = useReactRef(onElementsUpdate);
		const onElementsDeleteRef = useReactRef(onElementsDelete);

		// Ensure the refs always have the latest function.
		useEffect(() => {
			onElementCreateRef.current = onElementCreate;
		}, [onElementCreate]);
		useEffect(() => {
			onElementsUpdateRef.current = onElementsUpdate;
		}, [onElementsUpdate]);
		useEffect(() => {
			onElementsDeleteRef.current = onElementsDelete;
		}, [onElementsDelete]);

		// State for controlled/uncontrolled elements
		const [internalElements, setInternalElements] = useState<Element[]>(() => {
			if (enableLocalStorage) {
				try {
					const saved = localStorage.getItem(STORAGE_KEY);
					return saved ? JSON.parse(saved) : initialElements;
				} catch (error) {
					console.error("Failed to parse elements from localStorage", error);
					return initialElements;
				}
			}
			return initialElements;
		});
		const elements = controlledElements ?? internalElements;

		// State for controlled/uncontrolled view transform (pan/zoom)
		const [internalViewTransform, setInternalViewTransform] = useState(
			initialViewTransform || { scale: 0, offsetX: 0, offsetY: 0 }
		);
		const viewTransform = controlledViewTransform ?? internalViewTransform;

		// UI and interaction state
		const [selectedTool, setSelectedTool] = useState<ElementType>("selection");
		const [selectedElements, setSelectedElements] = useState<Element[]>([]);
		const [highlighterScribbles, setHighlighterScribbles] = useState<Element[]>(
			[]
		);
		const [pointerTrail, setPointerTrail] = useState<EraserPoint[]>([]);
		const [drawingAngleInfo, setDrawingAngleInfo] = useState<{
			angle: number;
			x: number;
			y: number;
		} | null>(null);
		const [isSpacePressed, setIsSpacePressed] = useState(false);
		const [isCtrlPressed, setIsCtrlPressed] = useState(false);

		// State for interaction-specific feedback, lifted from hooks to be provided via context
		const [action, setAction] = useState<Action>("none");
		const [selectionRect, setSelectionRect] = useState<RectangleElement | null>(
			null
		);
		const [wireHoveredElement, setWireHoveredElement] = useState<{
			element: Element;
			handle: HandleType;
		} | null>(null);
		const [editingElement, setEditingElement] = useState<Element | null>(null);
		const [defaultStyles, setDefaultStyles] = useState<Partial<Element>>({
			stroke: "#000000",
			fill: "#e6e6e6",
			strokeWidth: 2,
			opacity: 1,
			labelFontSize: 16,
		});

		useEffect(() => {
			console.log("default styles changed", defaultStyles);
		}, [defaultStyles]);

		// --- 3. Memoization ---
		// Memoize the list of tools to prevent re-calculation on every render.
		const toolbarTools = useMemo(() => {
			if (!allowedTools) {
				return allToolbarTools;
			}

			return allToolbarTools.filter((tool) => allowedTools.includes(tool.name));
		}, [allowedTools]);

		// --- 4. Core Logic Callbacks ---
		/**
		 * A robust callback for updating the elements state. It supports both "controlled"
		 * (state managed by parent via props) and "uncontrolled" (internal state) modes.
		 * It also mimics React's state setter by accepting a function for safe updates.
		 */
		const handleElementsChange = useCallback(
			(newElements: Element[] | ((prevElements: Element[]) => Element[])) => {
				// If an onElementsChange prop is provided, the component is in "controlled" mode.
				// It delegates state management to the parent component.
				if (onElementsChange) {
					// We need to handle the functional update pattern manually for the parent.
					// If `newElements` is a function, we call it with the current `elements` state
					// to get the new state, then pass that result to the parent's callback.
					onElementsChange(
						typeof newElements === "function"
							? newElements(elements)
							: newElements
					);
				} else {
					// If no onElementsChange prop is provided, the component is in "uncontrolled" mode.
					// It manages its own state using the `setInternalElements` state setter.
					// The `setInternalElements` hook knows how to handle both a direct value and a function.
					setInternalElements(newElements);
				}
			},
			[elements, onElementsChange]
		);

		const handleViewTransformChange = useCallback(
			(newTransform: { scale: number; offsetX: number; offsetY: number }) => {
				if (onViewTransformChange) {
					onViewTransformChange(newTransform);
				} else {
					setInternalViewTransform(newTransform);
				}
			},
			[onViewTransformChange]
		);

		/**
		 * A robust way to update elements in the state.
		 * It handles both creating new elements and updating existing ones.
		 * @param updatedElements An array of elements that have been created or modified.
		 */
		const updateElements = useCallback(
			(updatedElements: Element[]) => {
				// For performance, create a Map of the updated elements for instant lookups.
				// This is much faster than repeatedly calling .find() in a loop.
				const updatedElementsMap = new Map(
					updatedElements.map((el) => [el.id, el])
				);

				// Use the functional update form of the state setter.
				// `handleElementsChange` is designed to mimic this behavior.
				// React provides `prevElements`, ensuring we're always working with the latest state.
				handleElementsChange((prevElements) => {
					// Step 1: Update existing elements.
					// Iterate over the previous elements and replace any that have an updated version in our map.
					// If an element is not in the map, its old version is kept.
					const newElementsState = prevElements.map(
						(el) => updatedElementsMap.get(el.id) || el
					);

					// Step 2: Add new elements.
					// Create a Set of all current IDs for efficient checking.
					const newIds = new Set(newElementsState.map((el) => el.id));

					// Iterate through the `updatedElements` from the caller. If an element's ID
					// isn't in our `newIds` set, it means it's a brand new element that needs to be added.
					updatedElements.forEach((updatedEl) => {
						if (!newIds.has(updatedEl.id)) {
							newElementsState.push(updatedEl);
						}
					});

					// Return the final array, which now contains all original, updated,
					// and newly created elements.
					return newElementsState;
				});
			},
			[handleElementsChange]
		);

		// In an event-sourcing model, this function would be replaced by
		// specific event handlers like `onElementCreate`, `onElementsUpdate`, etc.
		// For now, we keep it as the primary way to update state from the outside
		// (e.g., from the WebSocket client).

		// --- 5. Event Handler Callbacks ---
		const handleDeleteSelected = useCallback(() => {
			if (selectedElements.length === 0) return;

			// const selectedIds = new Set(selectedElements.map((el) => el.id));
			// handleElementsChange((prevElements) =>
			// 	prevElements.filter((el) => {
			// 		// Remove the element if it's selected
			// 		if (selectedIds.has(el.id)) {
			// 			return false;
			// 		}
			// 		// Also remove any wires connected to a deleted element
			// 		if (el.type === "wire") {
			// 			return (
			// 				!selectedIds.has(el.startElementId) &&
			// 				!selectedIds.has(el.endElementId)
			// 			);
			// 		}
			// 		return true;
			// 	})
			// );
			const selectedIds = selectedElements.map((el) => el.id);
			onElementsDeleteRef.current?.(selectedIds);
			// const selectedIdsSet = new Set(selectedIds);
			// handleElementsChange((prevElements) =>
			// 	prevElements.filter((el) => {
			// 		// Remove the element if it's selected
			// 		if (selectedIdsSet.has(el.id)) {
			// 			return false;
			// 		}
			// 		// Also remove any wires connected to a deleted element
			// 		if (el.type === "wire") {
			// 			return (
			// 				!selectedIdsSet.has(el.startElementId) &&
			// 				!selectedIdsSet.has(el.endElementId)
			// 			);
			// 		}
			// 		return true;
			// 	})
			// );
			// setElements((prev) => prev.filter((el) => !selectedIds.has(el.id)));
			setSelectedElements([]);
		}, [selectedElements]);

		const handleClearScribbles = useCallback(() => {
			if (highlighterScribbles.length > 0) {
				setHighlighterScribbles([]); // Clear local state
			}
			onClearHighlights?.(); // Notify parent to clear for everyone
		}, [highlighterScribbles, onClearHighlights]);

		const handleSetSelectedTool = useCallback(
			(tool: ElementType) => {
				// If the user selects the highlighter tool, clear any existing scribbles.
				if (tool === "highlighter") {
					handleClearScribbles();
				}
				setSelectedTool(tool);
				// After selecting a tool, re-focus the canvas for a better user experience.
				const canvas = activeCanvasRef.current;
				if (canvas && document.activeElement !== canvas) {
					canvas.focus();
				}
			},
			[handleClearScribbles, setSelectedTool, activeCanvasRef]
		);

		const handleStyleChange = useCallback(
			(style: Partial<Element>) => {
				setDefaultStyles((prev) => ({ ...prev, ...style }));
				console.log(`default styles updated ${JSON.stringify(style)}`);

				if (selectedElements.length != 0) {
					// If elements are selected, update their styles.

					const updatedElements = selectedElements.map((el) =>
						Object.assign({}, el, style)
					);
					onElementsUpdateRef.current?.(updatedElements);
					// updateElements(updatedElements);
					setSelectedElements(updatedElements);
				}
			},
			[selectedElements, onElementsUpdateRef, setDefaultStyles]
		);

		const handleCopySelected = useCallback(() => {
			if (selectedElements.length === 0) return;

			const newElements = selectedElements.map((element) => {
				const newElement = JSON.parse(JSON.stringify(element));
				newElement.id = generateId();
				// Wires should not be moved on copy, they will reconnect.
				if (newElement.type !== "wire") {
					moveElement(newElement, 15, 15);
				}
				return newElement;
			});

			newElements.forEach((el) => onElementCreateRef.current?.(el));
			// updateElements(newElements);
			setSelectedElements(newElements);
		}, [selectedElements, setSelectedElements]);

		const handleSaveAsPNG = useCallback(async () => {
			const canvas = await exportToCanvas({
				elements,
				activeAnnotationId,
				backgroundColor: "white",
				padding: 20,
			});
			try {
				const link = document.createElement("a");
				link.download = "whiteboard.png";
				link.href = canvas.toDataURL("image/png");
				link.click();
			} catch (error) {
				console.error("Error exporting to PNG:", error);
			} finally {
				canvas.remove();
			}
		}, [elements, activeAnnotationId]);

		const handleClear = () => {
			onClear?.();
			handleElementsChange([]);
			setSelectedElements([]);
		};

		const throttledViewTransformChange = useMemo(
			() => throttle(handleViewTransformChange, 16), // Throttle to ~60fps
			[handleViewTransformChange]
		);

		// --- 6. Side Effects ---

		// Effect to attach keyboard listeners globally if configured.
		// This provides a better "standalone" experience out of the box.
		useEffect(() => {
			if (globalKeyboardShortcuts) {
			}
		}, [globalKeyboardShortcuts]);

		// Effect for mouse wheel zoom and pan
		useEffect(() => {
			const canvas = activeCanvasRef.current;
			console.log("active canvas is", canvas, staticCanvasRef.current);

			if (!canvas || !enableZoomPan) return;

			const handleWheel = (event: WheelEvent) => {
				event.preventDefault();
				const { clientX, clientY, deltaX, deltaY, ctrlKey } = event;

				// On most mice, deltaY is for vertical scroll.
				// On trackpads, deltaX/deltaY can be for horizontal/vertical panning.
				// If Ctrl key is pressed, always treat it as zoom.
				if (ctrlKey) {
					// Zooming
					const zoomFactor = 1.1;
					const newScale =
						deltaY < 0
							? viewTransform.scale * zoomFactor
							: viewTransform.scale / zoomFactor;

					const clampedScale = Math.max(0.1, Math.min(newScale, 20));

					const rect = canvas.getBoundingClientRect();
					const mouseX = clientX - rect.left;
					const mouseY = clientY - rect.top;

					// Adjust offset to zoom towards the cursor position
					const newOffsetX =
						mouseX -
						((mouseX - viewTransform.offsetX) * clampedScale) /
							viewTransform.scale;
					const newOffsetY =
						mouseY -
						((mouseY - viewTransform.offsetY) * clampedScale) /
							viewTransform.scale;

					throttledViewTransformChange({
						scale: clampedScale,
						offsetX: newOffsetX,
						offsetY: newOffsetY,
					});
				} else {
					// Panning
					throttledViewTransformChange({
						...viewTransform,
						offsetX: viewTransform.offsetX - deltaX,
						offsetY: viewTransform.offsetY - deltaY,
					});
				}
			};

			canvas.addEventListener("wheel", handleWheel, { passive: false });
			return () => canvas.removeEventListener("wheel", handleWheel);
		}, [viewTransform, throttledViewTransformChange, enableZoomPan]);

		// Effect to save elements to localStorage whenever they change
		useEffect(() => {
			if (!enableLocalStorage) return;
			// Round all numeric properties to 2 decimal places before saving.
			// This keeps the JSON clean and small without sacrificing precision.
			const precision = 2;
			const roundedElements = elements.map((el) =>
				roundElementProperties(el, precision)
			);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(roundedElements));
		}, [elements, enableLocalStorage]);

		// --- 7. Imperative API ---
		useImperativeHandle(ref, () => ({
			clear: handleClear,
			getElements: () => elements,
			setElements: (newElements) => handleElementsChange(newElements),
			saveAsPNG: handleSaveAsPNG,

			convertCanvasCoordsToScreenCoords: (coords: Point) => {
				return {
					x: coords.x * viewTransform.scale + viewTransform.offsetX,
					y: coords.y * viewTransform.scale + viewTransform.offsetY,
				};
			},
			getCanvasDataURL: async () => {
				if (elements.length === 0) return "";
				const canvas = await exportToCanvas({
					elements,
					activeAnnotationId,
					backgroundColor: "white",
					padding: 20,
				});
				return canvas.toDataURL("image/png");
			},
		}));

		const contextValue = {
			staticCanvasRef,
			activeCanvasRef,
			elements,
			selectedElements,
			highlighterScribbles,
			pointerTrail,
			viewTransform,
			selectedTool,
			editingElement,
			selectionRect,
			drawingAngleInfo,
			action,
			wireHoveredElement,
			isSpacePressed,
			isCtrlPressed,
			readOnly,
			defaultStyles,
			handleElementsChange,
			setSelectedElements,
			updateElements,
			setHighlighterScribbles,
			setPointerTrail,
			setViewTransform: handleViewTransformChange,
			setSelectedTool: handleSetSelectedTool,
			setEditingElement,
			setDrawingAngleInfo,
			setAction,
			setSelectionRect,
			setWireHoveredElement,
			setIsSpacePressed,
			setIsCtrlPressed,
			setDefaultStyles,
			onCursorMove: enableCursorTracking ? onCursorMove : undefined,
			onStrokeStart,
			onStrokeUpdate,
			onStrokeEnd,
			onHighlightStart,
			onHighlightUpdate,
			onHighlightEnd,
			remotePointers: enableCursorTracking ? remotePointers : undefined,
			inProgressStrokes,
			inProgressHighlights,
			onElementCreate: (...args) => onElementCreateRef.current?.(...args),
			onElementsUpdate: (...args) => onElementsUpdateRef.current?.(...args),
			onElementsDelete: (...args) => onElementsDeleteRef.current?.(...args),
			onElementClick,
			activeAnnotationId,
			currentUserId,
			currentUserName,
		};

		return (
			<WhiteboardContext.Provider value={contextValue}>
				<WhiteboardUI
					ref={containerRef}
					className={className}
					globalKeyboardShortcuts={globalKeyboardShortcuts}
					showToolbar={showToolbar}
					toolbarTools={toolbarTools}
					handleSetSelectedTool={handleSetSelectedTool}
					handleDeleteSelected={handleDeleteSelected}
					handleClear={handleClear}
					stylebarRef={stylebarRef}
					toolbarRef={toolbarRef}
					handleStyleChange={handleStyleChange}
					onElementClick={onElementClick}
					activeAnnotationId={activeAnnotationId}
					handleCopySelected={handleCopySelected}
					handleViewTransformChange={handleViewTransformChange}
				/>
			</WhiteboardContext.Provider>
		);
	}
);
CanvasWhiteboard.displayName = "CanvasWhiteboard";

export default CanvasWhiteboard;
