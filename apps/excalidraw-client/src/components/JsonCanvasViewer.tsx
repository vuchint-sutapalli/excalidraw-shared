"use client";

import { useState, useRef, ChangeEvent } from "react";
import CanvasWhiteboard from "@/lib/CanvasWhiteboard";
import type { Element } from "@/lib/CanvasWhiteboard/types";
import { safeJsonParse } from "@/lib";
import type { CanvasWhiteboardRef } from "@/lib/CanvasWhiteboard";

export function JsonCanvasViewer() {
	const [elements, setElements] = useState<Element[]>([]);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const whiteboardRef = useRef<CanvasWhiteboardRef>(null);

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result;
			if (typeof text !== "string") {
				setError("Failed to read file content.");
				return;
			}

			const parsedElements = safeJsonParse(text);
			console.log(parsedElements);

			if (Array.isArray(parsedElements)) {
				setElements(parsedElements as Element[]);
				setError(null);
			} else {
				setError(
					"Invalid JSON file. The file must contain an array of elements."
				);
				setElements([]);
			}
		};
		reader.onerror = () => {
			setError("Error reading the file.");
		};
		reader.readAsText(file);
	};

	return (
		<div className="w-full h-full border rounded-lg shadow-lg bg-white">
			<div className="p-4 border-b">
				<label htmlFor="json-upload" className="font-semibold">
					Select a JSON file to view:
				</label>
				<input
					id="json-upload"
					type="file"
					accept=".json,application/json"
					ref={fileInputRef}
					onChange={handleFileChange}
					className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
				/>
				{error && <p className="text-red-500 text-sm mt-2">{error}</p>}
			</div>
			<div
				style={{
					width: "100%",
					height: "500px",
				}}
			>
				<CanvasWhiteboard
					onSaveToHistory={() => {}}
					ref={whiteboardRef}
					enableZoomPan={true}
					initialViewTransform={{ scale: 1, offsetX: 0, offsetY: 0 }}
					controlledElements={elements}
					readOnly
					showToolbar={false}
					enableCursorTracking={false}
					enableLocalStorage={false}
				/>
			</div>
		</div>
	);
}
