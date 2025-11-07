import { useState, useEffect, useRef, useCallback } from "react";
import type { Element } from "./types";
import {
	getElementAtPosition,
	getElementCenter,
	resizeElement,
} from "./element";
import { useWhiteboard } from "./WhiteboardContext";

export const useLabelEditor = () => {
	const {
		elements,
		viewTransform,
		activeCanvasRef,
		editingElement,
		setEditingElement,
		setSelectedElements,
		onElementsUpdate,
		onElementsDelete,
		readOnly,
	} = useWhiteboard();
	const [labelText, setLabelText] = useState("");
	const [editorPosition, setEditorPosition] = useState<{
		x: number;

		y: number;
	} | null>(null);
	const textAreaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (editingElement) {
			const center = getElementCenter(editingElement);
			setEditorPosition({ x: center.x, y: center.y });
			setLabelText(
				editingElement.type === "text"
					? editingElement.text
					: editingElement.label || ""
			);
			setTimeout(() => textAreaRef.current?.focus(), 0);
		}
	}, [editingElement]);

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (readOnly) return; // Prevent double-click interaction in read-only mode
			const canvas = activeCanvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
			const worldPos = {
				x: (screenPos.x - viewTransform.offsetX) / viewTransform.scale,
				y: (screenPos.y - viewTransform.offsetY) / viewTransform.scale,
			};

			const element = getElementAtPosition(elements, worldPos);
			if (element) {
				setEditingElement(element);
				setSelectedElements([element]);
			}
		},
		[
			activeCanvasRef,
			elements,
			setSelectedElements,
			viewTransform.offsetX,
			viewTransform.offsetY,
			viewTransform.scale,
			setEditingElement,
			readOnly,
		]
	);

	const handleLabelChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setLabelText(e.target.value);
	};

	const handleLabelUpdate = useCallback(() => {
		if (!editingElement) return;

		let updatedElement: Element;
		if (editingElement.type === "text") {
			const textElement = { ...editingElement, text: labelText };
			resizeElement(textElement, "bottom-right", 0, 0); // Recalculate dimensions
			updatedElement = textElement;
		} else {
			updatedElement = { ...editingElement, label: labelText };
		}

		// If a new text element is created but the text is empty, cancel it.
		if (
			updatedElement.type === "text" &&
			updatedElement.text === "" &&
			!elements.some((el) => el.id === updatedElement.id)
		) {
			setEditingElement(null);
			onElementsDelete?.([updatedElement.id]);
			return;
		}

		onElementsUpdate?.([updatedElement]);
		// updateElements([updatedElement]);
		setSelectedElements((prev) =>
			prev.map((el) => (el.id === updatedElement.id ? updatedElement : el))
		);
		setEditingElement(null);
	}, [
		editingElement,
		elements,
		labelText,
		setSelectedElements,
		onElementsUpdate,
		setEditingElement,
	]);

	const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleLabelUpdate();
		}
		if (e.key === "Escape") {
			setEditingElement(null);
		}
	};

	return {
		editorPosition,
		labelText,
		textAreaRef,
		handleDoubleClick,
		handleLabelChange,
		handleLabelUpdate,
		handleLabelKeyDown,
	};
};
