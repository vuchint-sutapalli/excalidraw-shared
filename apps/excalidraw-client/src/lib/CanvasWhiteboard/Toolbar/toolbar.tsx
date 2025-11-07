import React, { useState, RefObject } from "react";
import type { Element, ElementType } from "../types";
import type { ReactElement } from "react";
import styles from "./Toolbar.module.css";

import {
	SelectionIcon,
	RectangleIcon,
	DiamondIcon,
	CircleIcon,
	ArrowIcon,
	PencilIcon,
	TextIcon,
	WireIcon,
	LineIcon,
	EraserIcon,
	LaserIcon,
	HighlighterIcon,
	ClearHighlighterIcon,
	AnnotationIcon,
} from "./icons";

interface ToolbarProps {
	selectedTool: ElementType;
	activeCanvasRef: RefObject<HTMLCanvasElement>;
	setSelectedTool: (tool: ElementType) => void;
	selectedElements: Element[];
	handleClear: () => void;
	handleDeleteSelected: () => void;
	readOnly?: boolean;
	highlighterScribbles: Element[];
	tools: {
		name: ElementType;
		label: string;
		icon: ReactElement;
		key?: string;
	}[];
	ref: React.Ref<HTMLDivElement>;
}

export const tools: {
	name: ElementType;
	label: string;
	icon: JSX.Element;
	key?: string;
}[] = [
	{ name: "selection", label: "Select", icon: <SelectionIcon />, key: "s" },
	{ name: "rectangle", label: "Rectangle", icon: <RectangleIcon />, key: "r" },
	{ name: "diamond", label: "Diamond", icon: <DiamondIcon />, key: "d" },
	{ name: "circle", label: "Circle", icon: <CircleIcon />, key: "c" },
	{ name: "arrow", label: "Arrow", icon: <ArrowIcon />, key: "a" },
	{ name: "pencil", label: "Pencil", icon: <PencilIcon />, key: "p" },
	{ name: "text", label: "Text", icon: <TextIcon />, key: "t" },
	{
		name: "annotation",
		label: "Annotation",
		icon: <AnnotationIcon />,
		key: "m",
	},
	{ name: "wire", label: "Wire", icon: <WireIcon />, key: "w" },
	{ name: "line", label: "Line", icon: <LineIcon />, key: "9" },
	{ name: "eraser", label: "Eraser", icon: <EraserIcon />, key: "0" },
	{ name: "laser", label: "Laser", icon: <LaserIcon />, key: "l" },
	{
		name: "highlighter",
		label: "Highlighter",
		icon: <HighlighterIcon />,
		key: "h",
	},
];

export const Toolbar: React.FC<ToolbarProps> = ({
	selectedTool,
	setSelectedTool,
	handleClear,
	readOnly,
	highlighterScribbles,
	tools,
	ref,
}) => {
	const [isConfirmingClear, setIsConfirmingClear] = useState(false);

	return (
		<div ref={ref} className={styles.toolbar}>
			<div className={styles["toolbar-group"]}>
				{tools.map(({ name, label, icon, key }) => {
					const hasHighlights = highlighterScribbles.length > 0;
					const isHighlighter = name === "highlighter";

					// Determine the class and title based on context
					const buttonClass = `${styles["toolbar-button"]} ${
						selectedTool === name ? styles.active : ""
					} ${isHighlighter && hasHighlights ? styles["clear-mode"] : ""}`;

					const title = isHighlighter
						? hasHighlights
							? "Clear highlights and draw new ones"
							: `${label} (${key})`
						: `${label} (${key})`;

					// Conditionally choose the icon
					const finalIcon =
						isHighlighter && hasHighlights ? <ClearHighlighterIcon /> : icon;

					return (
						<button
							key={name}
							className={buttonClass}
							onClick={() => !readOnly && setSelectedTool(name)}
							disabled={readOnly}
							title={title}
						>
							{finalIcon}
							{key && <span className={styles["keybinding-hint"]}>{key}</span>}
						</button>
					);
				})}
			</div>
			<div className={styles["toolbar-separator"]} />

			{isConfirmingClear ? (
				<div className={styles["toolbar-confirm-group"]}>
					<span className={styles.confirmationText}>Are you sure?</span>
					<button
						className={`${styles["toolbar-button"]} ${styles["toolbar-button-cancel"]}`}
						onClick={() => !readOnly && setIsConfirmingClear(false)}
					>
						Cancel
					</button>
					<button
						className={`${styles["toolbar-button"]} ${styles["toolbar-button-danger"]}`}
						onClick={() => {
							if (readOnly) return;
							handleClear();
							setIsConfirmingClear(false);
						}}
					>
						Confirm
					</button>
				</div>
			) : (
				<button
					className={`${styles["toolbar-button"]} ${styles["clear-button"]}`}
					onClick={() => !readOnly && setIsConfirmingClear(true)}
					disabled={readOnly}
				>
					Clear
				</button>
			)}
		</div>
	);
};

Toolbar.displayName = "Toolbar";
