import React, { useState, useEffect } from "react";
import type { Element, ElementType } from "../types";
import styles from "./Stylebar.module.css";
import { fillColors, strokeColors } from "../constants";
interface StylebarProps {
	selectedTool: ElementType;
	selectedElements: Element[];
	defaultStyles: Partial<Element>;
	onStyleChange: (style: Partial<Element>) => void;
	onDelete: () => void;
	onCopy: () => void;
	ref: React.Ref<HTMLDivElement>;
	toolbarHeight: number;
}

const ColorPalette: React.FC<{
	onColorChange: (color: string) => void;
	selectedColor?: string;
	colors: string[];
}> = ({ onColorChange, selectedColor, colors }) => (
	<div className={styles.colorPalette}>
		{colors.map((color) => (
			<button
				key={color}
				title={color}
				className={`${styles.colorSwatch} ${selectedColor === color ? styles.selected : ""}`}
				style={{ backgroundColor: color }}
				onClick={() => onColorChange(color)}
			/>
		))}
	</div>
);

const StylebarComponent: React.FC<StylebarProps> = ({
	selectedTool,
	selectedElements,
	defaultStyles,
	onStyleChange,
	onCopy,
	onDelete,
	ref,
	toolbarHeight,
}) => {
	const isSelectionEmpty = selectedElements.length === 0;

	// --- START: Multi-select style aggregation ---
	const getCommonValue = <K extends keyof Element>(
		prop: K
	): Element[K] | undefined => {
		if (isSelectionEmpty) {
			return defaultStyles[prop] as Element[K] | undefined;
		} else {
			const firstElement = selectedElements[0];
			if (!firstElement || !(prop in firstElement)) return undefined;

			const firstValue = firstElement[prop];
			if (
				selectedElements.every((el) => prop in el && el[prop] === firstValue)
			) {
				return firstValue;
			}
			return undefined; // Indicates a "mixed" state
		}
	};

	const commonStroke = getCommonValue("stroke");
	const commonFill = getCommonValue("fill");
	const commonStrokeWidth = getCommonValue("strokeWidth") as number | undefined;
	const commonRotation = getCommonValue("rotation") as number | undefined;
	const commonOpacity = getCommonValue("opacity") as number | undefined;

	// Label-specific common values
	const commonLabelColor = getCommonValue("labelColor");
	const commonLabelBackgroundColor = getCommonValue("labelBackgroundColor");
	const commonLabelFontSize = getCommonValue("labelFontSize") as
		| number
		| undefined;
	// --- START: Local state for deferred updates ---
	const [localRotation, setLocalRotation] = useState(0);
	const [localStrokeWidth, setLocalStrokeWidth] = useState(1);

	const [localOpacity, setLocalOpacity] = useState(1);
	const [localLabelFontSize, setLocalLabelFontSize] = useState(16);

	useEffect(() => {
		// When selection changes, update local state from the common values.
		// If selection is empty, it will reset to defaults.
		setLocalRotation(commonRotation ?? 0);
		setLocalStrokeWidth(commonStrokeWidth ?? defaultStyles.strokeWidth ?? 1);
		setLocalOpacity(commonOpacity ?? defaultStyles.opacity ?? 1);
		setLocalLabelFontSize(
			commonLabelFontSize ?? defaultStyles.labelFontSize ?? 16
		);
	}, [
		selectedElements,
		commonRotation,
		commonStrokeWidth,
		commonOpacity,
		commonLabelFontSize, // This was missing
		defaultStyles,
	]);
	// --- END: Local state for deferred updates ---

	if (
		isSelectionEmpty &&
		!["rectangle", "diamond", "circle", "arrow", "line", "pencil"].includes(
			selectedTool
		)
	) {
		return null;
	}

	// Determine which controls to show. Only show if all selected elements have the property.
	const showStroke = isSelectionEmpty
		? ["rectangle", "diamond", "circle", "arrow", "line", "pencil"].includes(
				selectedTool
			)
		: selectedElements.every(
				(el) => "stroke" in el && el["stroke"] !== undefined
			);
	const showFill = isSelectionEmpty
		? ["rectangle", "diamond", "circle"].includes(selectedTool)
		: selectedElements.every((el) => "fill" in el && el["fill"] !== undefined);
	const showStrokeWidth = isSelectionEmpty
		? ["rectangle", "diamond", "circle", "arrow", "line", "pencil"].includes(
				selectedTool
			)
		: selectedElements.every(
				(el) => "strokeWidth" in el && el["strokeWidth"] !== undefined
			);
	const showRotation = isSelectionEmpty
		? false
		: selectedElements.every(
				(el) => "rotation" in el && el["rotation"] !== undefined
			);
	const showOpacity = isSelectionEmpty
		? true
		: selectedElements.every(
				(el) => "opacity" in el && el["opacity"] !== undefined
			);
	const showLabelStyles = isSelectionEmpty
		? false
		: selectedElements.every(
				(el) => "label" in el && el.label && el.label.length > 0
			);
	// --- END: Multi-select style aggregation ---

	const handleStrokeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onStyleChange({ stroke: e.target.value });
	};

	const handleFillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onStyleChange({ fill: e.target.value });
	};

	const handleStrokeWidthInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newWidth = parseInt(e.target.value, 10) || 1;
		setLocalStrokeWidth(newWidth);
		// Update in real-time
		onStyleChange({ strokeWidth: newWidth });
	};

	const handleRotationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Update local state in real-time while dragging
		setLocalRotation(parseInt(e.target.value, 10));
	};

	const handleRotationChange = () => {
		// Commit the final value to the canvas state on release
		onStyleChange({
			rotation: (localRotation + 360) % 360,
		});
	};

	const handleOpacityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newOpacity = parseFloat(e.target.value);
		setLocalOpacity(newOpacity);
		onStyleChange({
			opacity: newOpacity,
		});
	};

	const handleLabelFontSizeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newSize = parseInt(e.target.value, 10) || 16;
		setLocalLabelFontSize(newSize);
		onStyleChange({ labelFontSize: newSize });
	};

	return (
		<div
			ref={ref}
			className={styles.stylebar}
			style={{
				top: `${30 + toolbarHeight}px`,
			}}
		>
			{!isSelectionEmpty && (
				<div className={styles.actions}>
					<button
						onClick={onCopy}
						title="Copy selected elements"
						className={styles.actionButton}
					>
						{/* A simple SVG for a copy icon */}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
						</svg>
					</button>
					<button
						onClick={onDelete}
						title="Delete selected elements"
						className={styles.actionButton}
					>
						{/* A simple SVG for a trash icon */}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="3 6 5 6 21 6"></polyline>
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
						</svg>
					</button>
				</div>
			)}
			{showStroke && (
				<div className={styles.controlGroup}>
					<label className={styles.label}>Stroke</label>
					<div className={styles.colorPalette}>
						<ColorPalette
							onColorChange={(color) => onStyleChange({ stroke: color })}
							colors={strokeColors}
							selectedColor={commonStroke}
						/>
						<div className={styles.colorPickerContainer}>
							<input
								type="color"
								id="stroke-color"
								value={commonStroke || "#000000"} // Fallback to black if mixed
								onChange={handleStrokeChange}
								// This input is styled by the parent .colorPickerContainer
							/>
						</div>
					</div>
				</div>
			)}
			{showFill && (
				<div className={styles.controlGroup}>
					<label className={styles.label}>Fill</label>
					<div className={styles.colorPalette}>
						<ColorPalette
							onColorChange={(color) => onStyleChange({ fill: color })}
							colors={fillColors}
							selectedColor={commonFill}
						/>
						<div className={styles.colorPickerContainer}>
							<input
								type="color"
								id="fill-color"
								value={commonFill || "#000000"} // Fallback to black if mixed
								onChange={handleFillChange}
								// This input is styled by the parent .colorPickerContainer
							/>
						</div>
					</div>
				</div>
			)}
			{showStrokeWidth && (
				<div className={styles.controlGroup}>
					<label htmlFor="stroke-width" className={styles.label}>
						Width
					</label>
					<input
						type="range"
						id="stroke-width"
						min="1"
						max="50"
						value={localStrokeWidth}
						onInput={handleStrokeWidthInput}
						className={styles.rangeSlider}
					/>
				</div>
			)}
			{showRotation && (
				<div className={styles.controlGroup}>
					<label htmlFor="rotation" className={styles.label}>
						Rotate
					</label>
					<input
						type="range"
						id="rotation"
						min="0"
						max="360"
						onInput={handleRotationInput}
						value={(localRotation + 360) % 360}
						onMouseUp={handleRotationChange}
						className={styles.rangeSlider}
					/>
				</div>
			)}
			{showOpacity && (
				<div className={styles.controlGroup}>
					<label htmlFor="opacity" className={styles.label}>
						Opacity
					</label>
					<input
						type="range"
						id="opacity"
						min="0"
						max="1"
						step="0.05"
						value={localOpacity}
						onInput={handleOpacityInput}
						className={styles.rangeSlider}
					/>
				</div>
			)}
			{showLabelStyles && (
				<div className={styles.controlGroup}>
					<label className={styles.label}>Label</label>
					<div className={styles.inlineControls}>
						<div className={styles.colorPickerContainer}>
							<input
								type="color"
								id="label-color"
								title="Label color"
								value={commonLabelColor || "#000000"}
								onChange={(e) => onStyleChange({ labelColor: e.target.value })}
							/>
						</div>
						<div className={styles.colorPickerContainer}>
							<input
								type="color"
								id="label-bg-color"
								title="Label background color"
								value={commonLabelBackgroundColor || "#FFFFFF"}
								onChange={(e) =>
									onStyleChange({ labelBackgroundColor: e.target.value })
								}
							/>
						</div>
						<input
							type="range"
							id="label-font-size"
							title="Label font size"
							min="8"
							max="64"
							value={localLabelFontSize}
							onInput={handleLabelFontSizeInput}
							className={`${styles.rangeSlider} ${styles.flexGrow}`}
						/>
					</div>
				</div>
			)}
		</div>
	);
};

StylebarComponent.displayName = "Stylebar";

export const Stylebar = React.memo(StylebarComponent);
