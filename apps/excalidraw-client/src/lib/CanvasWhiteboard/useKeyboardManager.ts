import { useEffect } from "react";
import { useWhiteboard } from "./WhiteboardContext";
import type { ElementType, TextElement } from "./types";
import { resizeElement } from "./element";

interface UseKeyboardProps {
	onDelete: () => void;
	onToolSelect: (tool: ElementType) => void;
	toolbarTools: { name: ElementType; key?: string }[];
}

export const useKeyboardManager = ({
	onDelete,
	onToolSelect,
	toolbarTools,
}: UseKeyboardProps) => {
	const {
		setIsSpacePressed,
		setIsCtrlPressed,
		selectedElements,
		onElementsUpdate,
		setSelectedElements,
		readOnly,
	} = useWhiteboard();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't trigger shortcuts if the user is typing in an input field.
			const target = e.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
				return;
			}

			// Handle modifier keys for panning
			if (e.key === " ") {
				setIsSpacePressed(true);
			} else if (e.key === "Control") {
				setIsCtrlPressed(true);
			}

			// Handle actions that should not run in read-only mode
			if (readOnly) return;

			// --- Tool Selection Shortcuts ---
			const tool = toolbarTools.find((t) => t.key === e.key);
			if (tool) {
				onToolSelect(tool.name);
				return; // Exit after handling
			}

			// --- Action Shortcuts ---
			switch (e.key) {
				case "Delete":
				case "Backspace":
					onDelete();
					break;
				// --- Font Size Shortcuts ---
				case "<":
				case ">":
					if (e.ctrlKey && e.shiftKey) {
						const isTextElementSelected =
							selectedElements.length === 1 &&
							selectedElements[0].type === "text";

						if (!isTextElementSelected) return;

						e.preventDefault();
						const FONT_STEP = 2;
						const direction = e.key === "<" ? -1 : 1;
						const textElement = selectedElements[0] as TextElement;
						const newFontSize = textElement.fontSize + direction * FONT_STEP;
						const clampedSize = Math.max(8, newFontSize); // Min font size of 8

						// Create a temporary updated element to calculate new dimensions
						const updatedElement = { ...textElement, fontSize: clampedSize };

						// Recalculate width and height based on the new font size
						resizeElement(updatedElement, "bottom-right", 0, 0);
						// Manually update the selected elements state. This is the key to
						// forcing a re-render of the active canvas with the new dimensions.
						setSelectedElements([updatedElement]);

						// Emit an update with all changed properties
						onElementsUpdate?.([
							{
								id: textElement.id,
								fontSize: clampedSize,
								width: updatedElement.width,
								height: updatedElement.height,
							},
						]);
					}
					break;
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === " ") {
				setIsSpacePressed(false);
			} else if (e.key === "Control") {
				setIsCtrlPressed(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [
		onDelete,
		onToolSelect,
		toolbarTools,
		readOnly,
		selectedElements,
		onElementsUpdate,
		setIsSpacePressed,
		setIsCtrlPressed,
	]);
};
