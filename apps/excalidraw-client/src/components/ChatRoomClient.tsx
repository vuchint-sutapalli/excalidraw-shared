"use client";
import { useSocketContext } from "./SocketProvider";
import { useQueryClient } from "@tanstack/react-query";
import type { CanvasWhiteboardRef } from "@/lib/CanvasWhiteboard";
import { createPortal } from "react-dom";
import CanvasWhiteboard from "@/lib/CanvasWhiteboard";
import { AnnotationModal } from "./AnnotationModal";
import type {
	Element,
	Point,
	RemotePointer,
	PencilElement,
	AnnotationElement,
} from "@/lib/CanvasWhiteboard/types";
import { generateId } from "@/lib/CanvasWhiteboard/id";
import { safeJsonParse, throttle } from "@/lib/index";
import React, {
	useCallback,
	useEffect,
	useState,
	useMemo,
	useRef,
} from "react";
import type { ChangeEvent } from "react";
import { handleExportToJson } from "@/lib/CanvasWhiteboard/exportUtils";
import { Undo2, Redo2, FileUp, FileDown, Save } from "lucide-react";
import { useSnackbar } from "./SnackbarProvider";
// import { throttle } from "@/lib/CanvasWhiteboard/throttle";
import { Shape } from "@/apis/room.server";

function ChatRoomClient({
	existingShapes,
	id,
	userId,
	userName,
	slug,
}: {
	existingShapes: Shape[];
	id: string;
	userId: string;
	userName: string;
	slug: string;
}) {
	const socketContext = useSocketContext();
	const queryClient = useQueryClient();
	const whiteboardRef = useRef<CanvasWhiteboardRef>(null);
	const importFileRef = useRef<HTMLInputElement>(null);
	const socket = socketContext?.socket;
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null
	);
	const loading = socketContext?.loading; // or set appropriately if loading is part of your context
	// const [isJoined, setIsJoined] = useState(false);

	const [canvasElements, setCanvasElements] = useState<Element[]>(
		existingShapes.map((shape) => shape.data) as Element[]
	);
	// Stacks for Undo/Redo functionality
	const [undoStack, setUndoStack] = useState<Element[][]>([]);
	const [redoStack, setRedoStack] = useState<Element[][]>([]);

	const [inProgressStrokes, setInProgressStrokes] = useState<
		Map<string, PencilElement>
	>(new Map());

	const [inProgressHighlights, setInProgressHighlights] = useState<Element[]>(
		[]
	);

	const [remotePointers, setRemotePointers] = useState<
		Map<string, RemotePointer>
	>(new Map());

	// const [messages, setMessages] = useState<{ user: string; text: string }[]>(
	// 	[]
	// );
	// const [newMessage, setNewMessage] = useState("");
	const [editingAnnotation, setEditingAnnotation] =
		useState<AnnotationElement | null>(null);

	const { showSnackbar } = useSnackbar();

	useEffect(() => {
		console.log("noticed change,", editingAnnotation);
	}, [editingAnnotation]);

	// Effect to find the portal container in the Navbar
	useEffect(() => {
		setPortalContainer(document.getElementById("navbar-menu-portal"));
	}, []);

	useEffect(() => {
		if (!socket || loading) return;

		const handleMessage = (event: MessageEvent) => {
			const parsedData = safeJsonParse(event.data);

			// const parsedData = JSON.parse(event.data);
			if (!parsedData || parsedData.roomId !== id) return;

			switch (parsedData.type) {
				case "joined_room":
					// setIsJoined(true);
					break;
				case "chat":
					console.log("Received chat message from server");
					// Handle chat message state update
					break;
				case "elements-updated":
					showSnackbar("Elements updated", "success");
					setCanvasElements(parsedData.message);
					break;
				case "import-failed":
					console.error("Import failed");
					showSnackbar("Import failed", "error");
					break;

				case "element-create":
					setCanvasElements((prevElements) => {
						// Avoid adding duplicates
						if (prevElements.some((el) => el.id === parsedData.element.id)) {
							return prevElements;
						}
						return [...prevElements, parsedData.element];
					});
					break;
				case "elements-update":
					setCanvasElements((prevElements) => {
						const updatedElementsMap = new Map(
							parsedData.elements.map((el: Element) => [el.id, el])
						);
						console.log("elements updated", updatedElementsMap);

						// return prevElements.map((el) => {
						// 	const update = updatedElementsMap.get(el.id);
						// 	return update ? { ...el, ...update } : el;
						// });
						return prevElements.map(
							(el) => (updatedElementsMap.get(el.id) as Element) || el
						);
					});
					break;
				case "elements-delete":
					setCanvasElements((prevElements) => {
						const deletedIds = new Set(parsedData.elementIds);
						return prevElements.filter((el) => {
							if (deletedIds.has(el.id)) {
								return false;
							}
							if (el.type === "wire") {
								return !(
									deletedIds.has(el.startElementId) ||
									deletedIds.has(el.endElementId)
								);
							}
							return true;
						});
					});
					break;
				case "cursor-move":
					setRemotePointers((prev) => {
						const newMap = new Map(prev);
						newMap.set(parsedData.userId, {
							x: parsedData.x,
							y: parsedData.y,
							userName: parsedData.userName,
							timestamp: Date.now(),
						});
						return newMap;
					});
					break;
				case "stroke-start":
					setInProgressStrokes((prev) => {
						const newMap = new Map(prev);
						newMap.set(parsedData.element.id, parsedData.element);
						return newMap;
					});
					break;
				case "stroke-update":
					setInProgressStrokes((prev) => {
						const newMap = new Map(prev);
						const existingStroke = newMap.get(parsedData.strokeId);
						if (existingStroke) {
							newMap.set(parsedData.strokeId, {
								...existingStroke,
								points: parsedData.points,
							});
						}
						return newMap;
					});
					break;
				case "stroke-end":
					setInProgressStrokes((currentInProgressStrokes) => {
						const finalStroke = currentInProgressStrokes.get(
							parsedData.strokeId
						);
						if (finalStroke) {
							const newMap = new Map(currentInProgressStrokes);
							newMap.delete(parsedData.strokeId);
							return newMap;
						}
						return currentInProgressStrokes;
					});
					break;
				case "highlight-start":
					setInProgressHighlights((prev) => [...prev, parsedData.element]);
					break;
				case "highlight-update":
					setInProgressHighlights((prev) =>
						prev.map((el) =>
							el.id === parsedData.strokeId
								? { ...el, points: parsedData.points }
								: el
						)
					);
					break;
				case "highlight-end":
					//this is not needed as its temporarily stored in inProgressHighlights
					// setInProgressHighlights((prev) =>
					// 	prev.filter((el) => el.id !== parsedData.strokeId)
					// );

					break;
				case "clear-highlights":
					setInProgressHighlights([]);
					break;
				case "canvas-cleared":
					setCanvasElements([]);
					break;
				default:
					console.warn("Received unknown message type:", parsedData.type);
			}
		};

		socket.addEventListener("message", handleMessage);

		return () => {
			socket.removeEventListener("message", handleMessage);
		};
	}, [socket, id, loading, userId]); // Keep dependency array minimal

	const sendMessage = useCallback(
		(payload: object) => {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ ...payload, roomId: id }));
			}
		},
		[socket, id]
	);

	useEffect(() => {
		if (!socket || !id || loading) return;
		console.log("joining room", id);

		// if (socket.readyState === WebSocket.OPEN) {
		// 	socket.send(JSON.stringify({ type: "join_room", roomId: id }));
		// }
		sendMessage({ type: "join_room", roomId: id });

		return () => {
			queryClient.invalidateQueries({ queryKey: ["userRooms"] });

			sendMessage({ type: "leave_room", roomId: id });
			// When the user leaves the classroom, invalidate the rooms query
			// so the dashboard refetches the latest data and previews.
			console.log("invalidating roomsdata");
		};
	}, [socket, id, loading, sendMessage, queryClient]);

	// Effect to clean up inactive cursors
	useEffect(() => {
		const POINTER_TIMEOUT = 5000; // 5 seconds
		const interval = setInterval(() => {
			setRemotePointers((prev) => {
				const newMap = new Map(prev);
				let changed = false;
				newMap.forEach((pointer, id) => {
					if (Date.now() - pointer.timestamp > POINTER_TIMEOUT) {
						newMap.delete(id);
						changed = true;
					}
				});
				return changed ? newMap : prev;
			});
		}, POINTER_TIMEOUT);
		return () => clearInterval(interval);
	}, []);

	// const handleNewMessage = (e: React.FormEvent) => {
	// 	if (!socket || !id || loading) return;
	// 	e.preventDefault();
	// 	if (socket.readyState === WebSocket.OPEN) {
	// 		socket.send(
	// 			JSON.stringify({
	// 				type: "chat",
	// 				roomId: id,
	// 				message: newMessage,
	// 			})
	// 		);
	// 		setNewMessage("");
	// 	}
	// };

	const handleImportFromJson = (event: ChangeEvent<HTMLInputElement>) => {
		console.log("importiiiiiiiiiiiig");

		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result;
			if (typeof text !== "string") {
				console.error("Failed to read file content.");
				showSnackbar("Failed to read file content.", "error");
				return;
			}

			const parsedElements = safeJsonParse(text);

			if (Array.isArray(parsedElements)) {
				// Replace all elements on the canvas and notify the server.
				// Generate new IDs to prevent database collisions and maintain data integrity.
				const oldIdToNewIdMap = new Map<string, string>();

				// 1. First pass: Create new IDs for every element and map old to new.
				parsedElements.forEach((el: Element) => {
					oldIdToNewIdMap.set(el.id, generateId());
				});

				// 2. Second pass: Create new elements with updated IDs and references.
				const newElements = (parsedElements as Element[]).map((el) => {
					const newElement = {
						...el,
						id: oldIdToNewIdMap.get(el.id)!,
					};

					// Update references for connected elements like wires.
					if (newElement.type === "wire") {
						newElement.startElementId = oldIdToNewIdMap.get(
							newElement.startElementId
						)!;
						newElement.endElementId = oldIdToNewIdMap.get(
							newElement.endElementId
						)!;
					}

					return newElement;
				});

				handleElementsChange(newElements);
			} else {
				console.error("Invalid JSON file format.");
				showSnackbar("Invalid JSON file format.", "error");
			}
		};
		reader.readAsText(file);
	};

	const handleElementsChange = (updatedElements: Element[]) => {
		// setCanvasElements(updatedElements);
		console.log("saving elemnts in bulk", updatedElements);

		sendMessage({ type: "update-elements", message: updatedElements });
	};

	/**
	 * Saves the current state of canvasElements to the undo stack.
	 * This should be called BEFORE a new change is made.
	 */
	const saveToHistory = useCallback(() => {
		setUndoStack((prev) => [...prev, canvasElements]);
		// Any new action clears the redo stack
		setRedoStack([]);
	}, [canvasElements]);

	const handleUndo = () => {
		if (undoStack.length === 0) return;

		const lastState = undoStack[undoStack.length - 1];
		const newUndoStack = undoStack.slice(0, -1);

		// Move the current state to the redo stack before reverting
		setRedoStack((prev) => [canvasElements, ...prev]);
		setUndoStack(newUndoStack);
		setCanvasElements(lastState);
		// Also notify other clients of the change
		sendMessage({ type: "update-elements", message: lastState });
	};

	const handleRedo = () => {
		if (redoStack.length === 0) return;

		const nextState = redoStack[0];
		const newRedoStack = redoStack.slice(1);

		// Move the current state back to the undo stack
		setUndoStack((prev) => [...prev, canvasElements]);
		setRedoStack(newRedoStack);
		setCanvasElements(nextState);
		sendMessage({ type: "update-elements", message: nextState });
	};

	// Throttled function to send cursor position to the server
	const handleCursorMove = useMemo(
		() =>
			throttle((point: Point) => {
				if (socket && socket.readyState === WebSocket.OPEN) {
					sendMessage({
						type: "cursor-move",
						userId: userId,
						userName: userName,
						x: point.x,
						y: point.y,
					});
				}
			}, 100), // Send updates at most every 100ms
		[socket, userId, userName, sendMessage]
	);

	const handleStrokeStart = useCallback(
		(element: Element) => sendMessage({ type: "stroke-start", element }),
		[sendMessage]
	);

	const handleStrokeUpdate = useMemo(
		() =>
			throttle(
				(strokeId: string, points: Point[]) =>
					sendMessage({ type: "stroke-update", strokeId, points }),
				50
			),
		[sendMessage]
	);

	const handleStrokeEnd = useCallback(
		(strokeId: string, points: Point[]) =>
			sendMessage({ type: "stroke-end", strokeId, points }),
		[sendMessage]
	);

	const handleHighlightStart = useCallback(
		(element: Element) => sendMessage({ type: "highlight-start", element }),
		[sendMessage]
	);

	const handleHighlightUpdate = useMemo(
		() =>
			throttle(
				(strokeId: string, points: Point[]) =>
					sendMessage({ type: "highlight-update", strokeId, points }),
				50
			),
		[sendMessage]
	);

	const handleHighlightEnd = useCallback(
		(strokeId: string) => {
			sendMessage({ type: "highlight-end", strokeId });
		},
		[sendMessage]
	);

	const handleClearHighlights = useCallback(() => {
		sendMessage({ type: "clear-highlights" });
	}, [sendMessage]);

	const handleClearCanvas = useCallback(() => {
		sendMessage({ type: "clear-canvas" });
	}, [sendMessage]);

	const handleElementCreate = useCallback(
		(element: Element) => {
			saveToHistory();
			// Optimistic update
			setCanvasElements((prevElements) => [...prevElements, element]);
			// Send event to server
			console.log("notifying ws server about ele creation", element);

			sendMessage({ type: "element-create", element });
		},
		[sendMessage, saveToHistory]
	);

	const handleElementsUpdate = useCallback(
		(updatedElementParts: Partial<Element>[]) => {
			saveToHistory();
			// Perform an "optimistic update" on the local state.
			// This makes the UI feel instantaneous for the user, while the event
			// is sent to the server in the background to sync with other clients.
			setCanvasElements((prevElements) => {
				// For performance, create a Map of the updates for instant lookups.
				console.log(
					"handling final updates",
					updatedElementParts,
					prevElements
				);

				const updatesMap = new Map(
					updatedElementParts.map((part) => [part.id, part])
				);
				// Iterate over the current elements and apply the partial updates.
				const finalstate = prevElements.map((el) => {
					const update = updatesMap.get(el.id);
					// If an update exists for this element, merge it. Otherwise, return the original element.
					return update ? ({ ...el, ...update } as Element) : el;
				});
				console.log(finalstate);

				return finalstate;
			});
			console.log(
				"notifying ws server about ele updation",
				updatedElementParts
			);

			// After updating locally, send the event to the server to be broadcast.
			sendMessage({ type: "elements-update", elements: updatedElementParts });
		},
		[sendMessage, saveToHistory]
	);

	const handleElementsDelete = useCallback(
		(elementIds: string[]) => {
			saveToHistory();
			console.log(`deleting .. ${elementIds}`);

			const idsToDelete = new Set(elementIds);

			// Optimistic update
			setCanvasElements((prevElements) => {
				// Also find any wires connected to the elements being deleted.
				prevElements.forEach((el) => {
					if (
						el.type === "wire" &&
						(idsToDelete.has(el.startElementId) ||
							idsToDelete.has(el.endElementId))
					) {
						idsToDelete.add(el.id);
					}
				});

				return prevElements.filter((el) => {
					return !idsToDelete.has(el.id);
				});
			});
			console.log(Array.from(idsToDelete));

			// Send event to server
			sendMessage({
				type: "elements-delete",
				elementIds: Array.from(idsToDelete),
			});
		},
		[sendMessage, saveToHistory]
	);

	const handleAnnotationUpdate = (updatedAnnotation: AnnotationElement) => {
		// This function is called when a comment is added to an existing annotation
		setCanvasElements((prev) =>
			prev.map((el) =>
				el.id === updatedAnnotation.id ? updatedAnnotation : el
			)
		);
		handleElementsUpdate([updatedAnnotation]);
		setEditingAnnotation(updatedAnnotation);
	};

	const handleAnnotationCreate = (newAnnotation: AnnotationElement) => {
		// This function is called when the first comment is submitted
		newAnnotation.authorId = userId;
		newAnnotation.authorName = userName;
		setCanvasElements((prev) => [...prev, newAnnotation]);
		handleElementCreate(newAnnotation);
		setEditingAnnotation(newAnnotation);
	};

	const handleAnnotationModalClose = () => {
		let element = editingAnnotation;
		if (!element) {
			setEditingAnnotation(null);
			return;
		}
		if (element?.isActivelySelected) {
			element = { ...element, isActivelySelected: false };
		}
		setCanvasElements((prevElements) =>
			prevElements.map((el) => (el.id === element.id ? element : el))
		);

		setEditingAnnotation(null);
	};

	const handleAnnotationStateChange = () => {
		if (!editingAnnotation) return;

		const newAnnotationState =
			editingAnnotation.annotationState === "open" ? "resolved" : "open";

		const updatedAnnotation = {
			...editingAnnotation,
			annotationState: newAnnotationState,
		};
		handleAnnotationUpdate(updatedAnnotation as AnnotationElement);
	};

	const handleAnnotationDelete = () => {
		if (!editingAnnotation) return;
		handleElementsDelete([editingAnnotation.id]);
		setEditingAnnotation(null);
	};

	const getModalPosition = (): { x: number; y: number } => {
		if (!editingAnnotation || !whiteboardRef.current) {
			return { x: 0, y: 0 };
		}
		const screenCoords =
			whiteboardRef.current.convertCanvasCoordsToScreenCoords(
				editingAnnotation
			);

		return { x: screenCoords.x + 40, y: screenCoords.y };
	};

	const handleElementClick = (element: Element) => {
		console.log("element click noticed", element);

		// handleElementsChange([...elements]);

		if (element.type === "annotation") {
			setCanvasElements((prevElements) => [...prevElements]);

			setEditingAnnotation(element as AnnotationElement);
		}
	};

	const handleAddComment = (text: string) => {
		if (!editingAnnotation) return;

		const newComment = {
			id: generateId(),
			userId,
			userName,
			text,
			timestamp: Date.now(),
		};

		const updatedAnnotation = {
			...editingAnnotation,
			comments: [...editingAnnotation.comments, newComment],
		};

		// If the annotation is new (not on canvas yet), create it. Otherwise, update it.
		const isOnCanvas = canvasElements.some(
			(el) => el.id === editingAnnotation.id
		);
		if (isOnCanvas) {
			handleAnnotationUpdate(updatedAnnotation);
			// After updating, we don't close the modal, just refresh its content.
		} else {
			handleAnnotationCreate(updatedAnnotation);
		}
	};

	return (
		<>
			<CanvasWhiteboard
				ref={whiteboardRef}
				controlledElements={canvasElements}
				onElementsChange={handleElementsChange}
				enableCursorTracking={false}
				onClear={handleClearCanvas}
				enableZoomPan={true}
				onCursorMove={handleCursorMove}
				remotePointers={remotePointers}
				inProgressStrokes={Array.from(inProgressStrokes.values())} // This can also be simplified if its clearing logic changes
				inProgressHighlights={Array.from(inProgressHighlights.values())}
				// tools={["selection", "pencil", "eraser"]}
				onStrokeStart={handleStrokeStart}
				onStrokeEnd={handleStrokeEnd}
				onStrokeUpdate={handleStrokeUpdate}
				onHighlightStart={handleHighlightStart}
				onClearHighlights={handleClearHighlights}
				onHighlightUpdate={handleHighlightUpdate}
				onHighlightEnd={handleHighlightEnd}
				onElementCreate={handleElementCreate}
				onElementsUpdate={handleElementsUpdate}
				onElementsDelete={handleElementsDelete}
				onElementClick={handleElementClick}
				onSaveToHistory={saveToHistory}
				activeAnnotationId={editingAnnotation?.id}
				currentUserName={userName}
				currentUserId={userId}
			/>

			{editingAnnotation && (
				<AnnotationModal
					annotation={editingAnnotation}
					onDelete={handleAnnotationDelete}
					getModalPosition={getModalPosition}
					onClose={handleAnnotationModalClose}
					onStateChange={handleAnnotationStateChange}
					onCommentAdd={handleAddComment}
					currentUserName={userName}
				/>
			)}

			{portalContainer &&
				createPortal(
					<>
						<button
							onClick={() => {
								importFileRef.current?.click();
							}}
							className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
						>
							<FileUp className="h-4 w-4" />
							Import JSON
						</button>
						<button
							onClick={() => {
								handleExportToJson(slug, canvasElements);
							}}
							className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
						>
							<FileDown className="h-4 w-4" />
							Export JSON
						</button>
						<button
							onClick={() => {
								whiteboardRef.current?.saveAsPNG();
							}}
							className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
						>
							<Save className="h-4 w-4" />
							Save as PNG
						</button>
						<div className="my-1 h-px bg-gray-200" /> {/* Separator */}
					</>,
					portalContainer
				)}

			{/* This div is now just for the hidden file input and the undo/redo controls */}
			<div className="absolute top-0 left-0 w-full h-full pointer-events-none">
				<input
					type="file"
					ref={importFileRef}
					onChange={handleImportFromJson}
					accept=".json,application/json"
					style={{ display: "none" }}
				/>
				<div className="pointer-events-auto absolute bottom-4 left-4 z-10 flex items-center space-x-1 bg-white p-1 rounded-lg shadow-md border border-gray-200">
					<button
						type="button"
						onClick={handleUndo}
						disabled={undoStack.length === 0}
						className="p-2 rounded-md text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
						aria-label="Undo"
						title="Undo (Ctrl+Z)"
					>
						<Undo2 className="h-5 w-5" />
					</button>
					<button
						type="button"
						onClick={handleRedo}
						disabled={redoStack.length === 0}
						className="p-2 rounded-md text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
						aria-label="Redo"
						title="Redo (Ctrl+Y)"
					>
						<Redo2 className="h-5 w-5" />
					</button>
				</div>
			</div>
		</>
	);
}

export default ChatRoomClient;
