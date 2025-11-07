export const STORAGE_KEY = "level0_hybrid_whiteboard";
export const HANDLE_SIZE = 15;
export const LINE_HIT_THRESHOLD = 5;

export const HOVER_LENIENCY = 30;

export const MIN_SIZE_THRESHOLD = 10;
// You can switch between 'gradient' and 'segments' to see the difference.
// 'gradient' is more performant and smoother.
// 'segments' is the original implementation that can show "dots" at intersections.
export const TRAIL_RENDERING_STRATEGY: "gradient" | "segments" = "segments";

// Defines the virtual canvas dimensions. All element coordinates are relative to this size.
// This allows the canvas to be responsive while maintaining a consistent coordinate system.
const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

export { VIRTUAL_WIDTH, VIRTUAL_HEIGHT };

const strokeColors = [
	"#1e1e1e", // Excalidraw black
	"#e03131", // Excalidraw red
	"#2f9e44", // Excalidraw green
	"#1971c2", // Excalidraw blue
	"#f08c00", // Excalidraw orange
];

const fillColors = [
	"transparent",
	"#ffc9c9", // Light red
	"#b2f2bb", // Light green
	"#a5d8ff", // Light blue
	"#ffd8a8", // Light orange
];

export { strokeColors, fillColors };
