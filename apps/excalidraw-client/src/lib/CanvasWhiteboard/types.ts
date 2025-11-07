export interface BaseElement {
	id: string;
	x: number;
	y: number;
	label?: string;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	// Styling properties
	stroke?: string;
	fill?: string;
	strokeWidth?: number;
	opacity?: number;
	// Label-specific styling
	labelColor?: string;
	labelBackgroundColor?: string;
	labelFontFamily?: string;
	labelFontSize?: number;
}

export interface RectangleElement extends BaseElement {
	type: "rectangle";
	width: number;
	height: number;
}

export interface LineElement extends BaseElement {
	type: "line";
	x2: number;
	y2: number;
	// Control points for Bezier curves
	cp1x?: number;
	cp1y?: number;
	cp2x?: number;
	cp2y?: number;
	curveHandleX?: number;
	curveHandleY?: number;
	points?: Point[];
}

export interface CircleElement extends BaseElement {
	type: "circle";
	radius: number;
}

export interface ArrowElement extends LineElement {
	type: "arrow";
}

export interface WireElement extends ArrowElement {
	type: "wire";
	startElementId: string;
	endElementId: string;
	startHandle: HandleType;
	endHandle: HandleType;
	points?: Point[];
}

export interface DiamondElement extends RectangleElement {
	type: "diamond";
}

// Define the structure for a pencil element
export interface PencilElement extends BaseElement {
	type: "pencil";
	points: { x: number; y: number }[];
	isHighlighter?: boolean; // New property to identify highlighter strokes
}

export interface TextElement extends RectangleElement {
	type: "text";
	text: string;
	fontSize: number;
	fontFamily?: string;
}

export interface Comment {
	id: string;
	userId: string;
	userName: string;
	text: string;
	timestamp: number;
}

export interface AnnotationElement extends BaseElement {
	type: "annotation";
	annotationState: "open" | "resolved";
	width: number;
	authorId: string;
	authorName: string;
	isActivelySelected: boolean;
	height: number;
	comments: Comment[];
}

export type Element =
	| RectangleElement
	| LineElement
	| CircleElement
	| ArrowElement
	| DiamondElement
	| TextElement
	| PencilElement
	| WireElement
	| AnnotationElement;

export type ElementType =
	| Element["type"]
	| "selection"
	| "eraser"
	| "laser"
	| "highlighter";

export type HandleType =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right"
	| "start"
	| "end"
	| "circle-top"
	| "circle-bottom"
	| "circle-left"
	| "circle-right"
	| "radius" // Kept for backward compatibility or other uses
	| "pencil"
	| "copy"
	| "rotation"
	| "curve";

export type Action =
	| "none"
	| "drawing"
	| "dragging"
	| "resizing"
	| "multi-selecting"
	| "placing"
	| "placing_annotation"
	| "rotating"
	| "curving"
	| "panning"
	| "wiring"
	| "erasing"
	| "lasering"
	| "highlighting";

export interface Point {
	x: number;
	y: number;
}

export interface EraserPoint extends Point {
	timestamp: number;
}

export interface RemotePointer extends Point {
	userName: string;
	timestamp: number;
}
