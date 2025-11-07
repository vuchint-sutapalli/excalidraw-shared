import React, { createContext, useContext } from "react";
import type {
	Element,
	ElementType,
	Point,
	EraserPoint,
	RemotePointer,
	HandleType,
	RectangleElement,
	Action,
} from "./types";

interface WhiteboardContextType {
	// Refs
	staticCanvasRef: React.RefObject<HTMLCanvasElement>;
	activeCanvasRef: React.RefObject<HTMLCanvasElement>;

	// State
	elements: Element[];
	selectedElements: Element[];
	highlighterScribbles: Element[];
	pointerTrail: EraserPoint[];
	viewTransform: { scale: number; offsetX: number; offsetY: number };
	selectedTool: ElementType;
	editingElement: Element | null;
	selectionRect: RectangleElement | null;
	drawingAngleInfo: { angle: number; x: number; y: number } | null;
	action: Action;
	wireHoveredElement: {
		element: Element;
		handle: HandleType | null;
	} | null;
	isSpacePressed: boolean;
	isCtrlPressed: boolean;
	readOnly: boolean;
	activeAnnotationId?: string | null;
	defaultStyles: Partial<Element>;

	// State Setters & Callbacks
	handleElementsChange: (
		elements: Element[] | ((prevElements: Element[]) => Element[])
	) => void;
	onElementCreate?: (element: Element) => void;
	onElementsUpdate?: (updatedElements: Partial<Element>[]) => void;
	onElementClick?: (element: Element) => void;
	onElementsDelete?: (elementIds: string[]) => void;
	setSelectedElements: React.Dispatch<React.SetStateAction<Element[]>>;
	updateElements: (updatedElements: Element[]) => void;
	setHighlighterScribbles: React.Dispatch<React.SetStateAction<Element[]>>;
	setPointerTrail: React.Dispatch<React.SetStateAction<EraserPoint[]>>;
	setViewTransform: (transform: {
		scale: number;
		offsetX: number;
		offsetY: number;
	}) => void;
	setSelectedTool: (tool: ElementType) => void;
	setEditingElement: React.Dispatch<React.SetStateAction<Element | null>>;
	setDrawingAngleInfo: React.Dispatch<
		React.SetStateAction<{ angle: number; x: number; y: number } | null>
	>;
	setAction: React.Dispatch<React.SetStateAction<Action>>;
	setSelectionRect: React.Dispatch<
		React.SetStateAction<RectangleElement | null>
	>;
	setWireHoveredElement: React.Dispatch<
		React.SetStateAction<{ element: Element; handle: HandleType | null } | null>
	>;
	setIsSpacePressed: React.Dispatch<React.SetStateAction<boolean>>;
	setIsCtrlPressed: React.Dispatch<React.SetStateAction<boolean>>;
	setDefaultStyles: React.Dispatch<React.SetStateAction<Partial<Element>>>;

	// Collaboration Props
	onCursorMove?: (point: Point) => void;
	onStrokeStart?: (element: Element) => void;
	onStrokeUpdate?: (strokeId: string, points: Point[]) => void;
	onStrokeEnd?: (strokeId: string, points: Point[]) => void;
	onHighlightStart?: (element: Element) => void;
	onHighlightUpdate?: (strokeId: string, points: Point[]) => void;
	onHighlightEnd?: (strokeId: string) => void;
	remotePointers?: Map<string, RemotePointer>;
	inProgressStrokes?: Element[];
	inProgressHighlights?: Element[];

	currentUserName: string | undefined;
	currentUserId: string | undefined;
	onSaveToHistory: () => void;
}

export const WhiteboardContext = createContext<WhiteboardContextType | null>(
	null
);

/**
 * A custom hook to consume the WhiteboardContext.
 * It ensures that the context is used within a provider.
 */
export const useWhiteboard = (): WhiteboardContextType => {
	const context = useContext(WhiteboardContext);
	if (!context) {
		throw new Error("useWhiteboard must be used within a WhiteboardProvider");
	}
	return context;
};
