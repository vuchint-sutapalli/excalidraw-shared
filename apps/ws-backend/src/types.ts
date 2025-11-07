import { WebSocket } from "ws";

export interface WebSocketWithID extends WebSocket {
	id: string;
	userId: string;
	roomId: string | null;
}

export interface BaseMessage {
	type: string;
	roomId: string;
}

export interface JoinRoomMessage extends BaseMessage {
	type: "join_room";
}

export interface LeaveRoomMessage extends BaseMessage {
	type: "leave_room";
}

export interface ChatMessage extends BaseMessage {
	type: "chat";
	message: string;
}

export interface ShapeMessage extends BaseMessage {
	type: "update-elements";
	message: any; // Keeping this flexible for shape data
}

export interface ElementsUpdateMessage extends BaseMessage {
	type: "elements-update";
	elements: { id: string; [key: string]: any }[];
}

export interface ElementCreateMessage extends BaseMessage {
	type: "element-create";
	element: { id: string; [key: string]: any };
}
export interface ElementsDeleteMessage extends BaseMessage {
	type: "elements-delete";
	elementIds: string[];
}
export interface CursorMoveMessage extends BaseMessage {
	type: "cursor-move";
	userId: string;
	userName: string;
	x: number;
	y: number;
}

export interface StrokeStartMessage extends BaseMessage {
	type: "stroke-start";
	element: any; // PencilElement
}

export interface StrokeUpdateMessage extends BaseMessage {
	type: "stroke-update";
	strokeId: string;
	points: { x: number; y: number }[];
}

export interface StrokeEndMessage extends BaseMessage {
	type: "stroke-end";
	strokeId: string;
	points: { x: number; y: number }[];
}

export interface HighlightStartMessage extends BaseMessage {
	type: "highlight-start";
	element: any; // PencilElement
}

export interface HighlightUpdateMessage extends BaseMessage {
	type: "highlight-update";
	strokeId: string;
	points: { x: number; y: number }[];
}

export interface HighlightEndMessage extends BaseMessage {
	type: "highlight-end";
	strokeId: string;
}
export interface ClearHighlightsMessage extends BaseMessage {
	type: "clear-highlights";
}

export interface ClearCanvasMessage extends BaseMessage {
	type: "clear-canvas";
}

export type WebSocketMessage =
	| JoinRoomMessage
	| LeaveRoomMessage
	| ChatMessage
	| ShapeMessage
	| ElementsUpdateMessage
	| ElementCreateMessage
	| ElementsDeleteMessage
	| CursorMoveMessage
	| StrokeStartMessage
	| StrokeUpdateMessage
	| StrokeEndMessage
	| HighlightStartMessage
	| HighlightUpdateMessage
	| HighlightEndMessage
	| ClearHighlightsMessage
	| ClearCanvasMessage;

export interface RoomConnections {
	[roomId: string]: {
		[userId: string]: Set<WebSocketWithID>;
	};
}
