// "use client";
// import {
// 	initDraw,
// 	setTool as setDrawLibTool,
// 	type Shape,
// 	type Tool,
// } from "@/drawlib";
// import React, { useEffect, useState } from "react";
// import { Toolbar } from "./Toolbar";

// // const SHAPES_STORAGE_KEY = "canvas-shapes";

// // function loadShapes(): Shape[] {
// // 	try {
// // 		const savedShapes = localStorage.getItem(SHAPES_STORAGE_KEY);
// // 		if (savedShapes) {
// // 			// In a production app, you'd want to add validation here
// // 			return JSON.parse(savedShapes) as Shape[];
// // 		}
// // 	} catch (error) {
// // 		console.error("Failed to load shapes from localStorage", error);
// // 	}
// // 	return [];
// // }

// interface CanvasProps {
// 	slug: string;
// 	roomId: number;
// 	existingShapes: Shape[];
// }

// function Canvas({ roomId, slug, existingShapes }: CanvasProps) {
// 	const canvasRef = React.useRef<HTMLCanvasElement>(null);
// 	const [tool, setTool] = useState<Tool>("hand");

// 	useEffect(() => {
// 		// Inform the drawlib about the tool change
// 		setDrawLibTool(tool);
// 		return () => {};
// 	}, [tool]);

// 	useEffect(() => {
// 		const setupCanvas = async () => {
// 			if (canvasRef.current) {
// 				const canvas = canvasRef.current;

// 				const ctx = canvas.getContext("2d");

// 				if (!ctx) {
// 					return;
// 				}

// 				// const initialShapes = await loadShapes(roomId);

// 				initDraw(canvas, ctx, existingShapes);
// 			}
// 		};

// 		setupCanvas();

// 		return () => {};
// 	}, []);

// 	return (
// 		<div className=" relative border-amber-300 border-2 w-fit h-fit">
// 			<Toolbar selectedTool={tool} onSelectTool={setTool} />

// 			<canvas ref={canvasRef} width={500} height={500}></canvas>
// 		</div>
// 	);
// }

// export default Canvas;
