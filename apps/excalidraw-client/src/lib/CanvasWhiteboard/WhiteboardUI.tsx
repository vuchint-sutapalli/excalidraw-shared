import React, { useLayoutEffect, useState, useRef } from "react";
import type { Element, ElementType } from "./types";
import { Toolbar } from "./Toolbar/toolbar";
import { Stylebar } from "./Stylebar";
import { LabelEditor } from "./LabelEditor";
import { useLabelEditor } from "./useLabelEditor";
import { useInteractions } from "./useInteractions";
import { useKeyboardManager } from "./useKeyboardManager";
import { useDrawing } from "./useDrawing";
import { useWhiteboard } from "./WhiteboardContext";
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./constants";
interface WhiteboardUIProps {
	className?: string;
	globalKeyboardShortcuts: boolean;
	showToolbar: boolean;
	toolbarTools: {
		name: ElementType;
		label: string;
		icon: JSX.Element;
		key?: string;
	}[];
	handleSetSelectedTool: (tool: ElementType) => void;
	handleDeleteSelected: () => void;
	handleClear: () => void;
	handleStyleChange: (style: Partial<Element>) => void;
	handleCopySelected: () => void;
	toolbarRef: React.RefObject<HTMLDivElement>;
	onElementClick?: (element: Element) => void;
	activeAnnotationId?: string | null;
	stylebarRef: React.RefObject<HTMLDivElement>;
	ref: React.Ref<HTMLDivElement>;
	handleViewTransformChange: (transform: {
		scale: number;
		offsetX: number;
		offsetY: number;
	}) => void;
}

export const WhiteboardUI: React.FC<WhiteboardUIProps> = (props) => {
	const {
		ref,
		className,
		globalKeyboardShortcuts,
		showToolbar,
		toolbarTools,
		handleSetSelectedTool,
		handleDeleteSelected,
		handleClear,
		handleStyleChange,
		handleCopySelected,
		toolbarRef,
		onElementClick,
		activeAnnotationId,
		stylebarRef,

		handleViewTransformChange,
	} = props;

	const {
		staticCanvasRef,
		activeCanvasRef,
		highlighterScribbles,
		readOnly,
		action,
		editingElement,
		viewTransform,
		selectedElements,
		selectedTool,
		defaultStyles,
	} = useWhiteboard();

	const tcontainer = (ref as React.RefObject<HTMLDivElement>)?.current;
	// if (!tcontainer) {
	// 	return;
	// }
	console.log(
		"container is",
		tcontainer?.offsetHeight,
		tcontainer?.offsetWidth
	);

	// State for canvas dimensions and layout
	const [width, setWidth] = useState(tcontainer?.offsetWidth || 0);
	const [height, setHeight] = useState(tcontainer?.offsetHeight || 0);
	const [toolbarHeight, setToolbarHeight] = useState(0);

	const {
		editorPosition,
		labelText,
		textAreaRef,
		handleDoubleClick,
		handleLabelChange,
		handleLabelUpdate,
		handleLabelKeyDown,
	} = useLabelEditor();

	const { handlePointerDown, handlePointerMove, handlePointerUp } =
		useInteractions({ onElementClick });

	// Centralized hook for managing all keyboard shortcuts.
	// This is placed here because it needs access to the whiteboard context.
	useKeyboardManager({
		onDelete: handleDeleteSelected,
		onToolSelect: handleSetSelectedTool,
		toolbarTools,
	});
	// Effect to handle responsive canvas resizing
	useLayoutEffect(() => {
		const container = (ref as React.RefObject<HTMLDivElement>)?.current;
		const toolbar = toolbarRef.current;
		console.log("inside layout effer for resize oberver.", container);
		// The container is essential. If it's not ready, we can't do anything.
		if (!container) {
			return;
		}

		const observer = new ResizeObserver(() => {
			// The toolbar might not exist if showToolbar is false.
			const newToolbarHeight = toolbar ? toolbar.offsetHeight : 0;
			// If the toolbar is shown, subtract its height. Otherwise, use the full container height.
			const newHeight = showToolbar
				? container.offsetHeight - newToolbarHeight
				: container.offsetHeight;
			const newWidth = container.offsetWidth;

			console.log("height/width are ", newHeight, newWidth);

			// Always update local dimensions
			setToolbarHeight(newToolbarHeight);
			setWidth(newWidth);
			setHeight(newHeight);

			// Calculate the ideal centered transform
			const scale = Math.min(
				newWidth / VIRTUAL_WIDTH,
				newHeight / VIRTUAL_HEIGHT
			);
			const offsetX = (newWidth - VIRTUAL_WIDTH * scale) / 2;
			const offsetY = (newHeight - VIRTUAL_HEIGHT * scale) / 2;
			console.log("view is", scale, offsetX, offsetY);

			// Only update the viewTransform if it has actually changed.
			// This prevents an unnecessary re-render and flicker on initial load.
			if (
				viewTransform.scale !== scale ||
				viewTransform.offsetX !== offsetX ||
				viewTransform.offsetY !== offsetY
			) {
				console.log("updating the view............");

				handleViewTransformChange({ scale, offsetX, offsetY });
			}
			// handleViewTransformChange({ scale, offsetX, offsetY });
		});
		observer.observe(container);
		if (toolbar) {
			observer.observe(toolbar); // Also observe the toolbar for height changes
		}

		return () => {
			observer.disconnect();
		};
	}, [ref, toolbarRef, handleViewTransformChange, showToolbar]);

	console.log("calling useDrawing");

	useDrawing();

	return (
		<div
			ref={ref}
			className={`app-container ${className || ""}`}
			style={{ width: "100%", height: "100%" }}
			tabIndex={globalKeyboardShortcuts ? -1 : 0}
		>
			{showToolbar && (
				<Toolbar
					activeCanvasRef={activeCanvasRef}
					ref={toolbarRef}
					selectedTool={selectedTool}
					setSelectedTool={handleSetSelectedTool}
					handleDeleteSelected={handleDeleteSelected}
					selectedElements={selectedElements}
					handleClear={handleClear}
					tools={toolbarTools}
					highlighterScribbles={highlighterScribbles}
					readOnly={readOnly}
				/>
			)}

			{!readOnly &&
				(selectedElements.length > 0 ||
					[
						"rectangle",
						"diamond",
						"circle",
						"arrow",
						"line",
						"pencil",
					].includes(selectedTool)) &&
				action === "none" && (
					<Stylebar
						ref={stylebarRef}
						selectedTool={selectedTool}
						selectedElements={selectedElements}
						defaultStyles={defaultStyles}
						onStyleChange={handleStyleChange}
						onCopy={handleCopySelected}
						onDelete={handleDeleteSelected}
						toolbarHeight={toolbarHeight}
					/>
				)}
			{editingElement && editorPosition && (
				<LabelEditor
					ref={textAreaRef}
					value={labelText}
					onChange={handleLabelChange}
					onBlur={handleLabelUpdate}
					onKeyDown={handleLabelKeyDown}
					style={{
						top:
							editorPosition.y * viewTransform.scale +
							viewTransform.offsetY +
							toolbarHeight,
						left:
							editorPosition.x * viewTransform.scale + viewTransform.offsetX,
					}}
				/>
			)}
			{width && height ? (
				<>
					<canvas
						ref={staticCanvasRef}
						width={width}
						height={height}
						style={{
							position: "absolute",
							left: 0,
							top: `${toolbarHeight}px`,
							border: "1px solid #ccc",
							touchAction: "none",
						}}
					/>
					<canvas
						ref={activeCanvasRef}
						width={width}
						height={height}
						style={{
							position: "absolute",
							left: 0,
							top: `${toolbarHeight}px`,
							zIndex: 1,
							touchAction: "none",
						}}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={(e) => handlePointerUp(e)}
						onDoubleClick={handleDoubleClick}
					/>
				</>
			) : null}
		</div>
	);
};

WhiteboardUI.displayName = "WhiteboardUI";
