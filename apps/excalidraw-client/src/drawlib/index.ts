function applyDarkmode(
	canvas: HTMLCanvasElement,
	context: CanvasRenderingContext2D
) {
	context.fillStyle = "rgba(0,0,0)";
	context.fillRect(0, 0, canvas?.width || 0, canvas?.height || 0);
	context.strokeStyle = "rgba(255,255,255)";
}

const round = (val: number) => Math.round(val * 10) / 10;

// In a real app, this would be imported from a shared types file.
export type Tool = "text" | "rectangle" | "hand" | "eraser" | "circle";

export type Shape =
	| {
			type: "rectangle";
			x: number;
			y: number;
			width: number;
			height: number;
	  }
	| {
			type: "circle";
			x: number;
			y: number;
			radius: number;
	  };

const SHAPES_STORAGE_KEY = "canvas-shapes";

function saveShapes(shapes: Shape[]) {
	try {
		localStorage.setItem(SHAPES_STORAGE_KEY, JSON.stringify(shapes));
	} catch (error) {
		console.error("Failed to save shapes to localStorage", error);
	}
}

const state = {
	currentTool: "hand" as Tool,
};

export function setTool(tool: Tool) {
	state.currentTool = tool;
}

export function initDraw(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	initialShapes: Shape[] = []
) {
	applyDarkmode(canvas, ctx);
	setTool("hand"); // Ensure the initial tool is set

	let existingShapes: Shape[] = [];

	if (initialShapes.length > 0) {
		existingShapes = [...initialShapes];
	}

	// Draw any initial shapes that were loaded
	repaintCanvas();

	function getMousePosition(event: MouseEvent) {
		const rect = canvas?.getBoundingClientRect();
		if (!rect) {
			return { x: event.clientX, y: event.clientY };
		}
		const x = round(event.clientX - rect.left);
		const y = round(event.clientY - rect.top);

		return { x, y };
	}

	function repaintCanvas() {
		ctx.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);

		applyDarkmode(canvas, ctx);
		console.log(existingShapes);

		existingShapes.forEach((shape) => {
			switch (shape.type) {
				case "rectangle":
					ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
					break;
				case "circle":
					ctx.beginPath();
					ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
					ctx.stroke();
					break;
			}
		});
	}

	function handleMouseMove(
		event: MouseEvent,
		context: CanvasRenderingContext2D,
		startx: number,
		starty: number
	) {
		const { x, y } = getMousePosition(event);
		const width = round(x - startx);
		const height = round(y - starty);

		repaintCanvas();

		if (state.currentTool === "rectangle") {
			context.strokeRect(startx, starty, width, height);
		} else if (state.currentTool === "circle") {
			const radius = Math.sqrt(width ** 2 + height ** 2);
			context.beginPath();
			context.arc(startx, starty, radius, 0, 2 * Math.PI);
			context.stroke();
		}
	}

	canvas.addEventListener("mousedown", (event) => {
		if (state.currentTool === "hand") {
			// Logic for panning the canvas would go here.
			console.log("Panning not implemented yet.");
			return;
		}

		const { x: startx, y: starty } = getMousePosition(event);

		console.log("mousedown", startx, starty);

		const mouseMoveListener = (e: MouseEvent) =>
			handleMouseMove(e, ctx, startx, starty);

		canvas.addEventListener("mousemove", mouseMoveListener);

		canvas.addEventListener(
			"mouseup",
			(e) => {
				const { x, y } = getMousePosition(e);
				console.log("mouseup", x, y, startx, starty);

				const width = round(x - startx);
				const height = round(y - starty);

				if (state.currentTool === "rectangle") {
					existingShapes.push({
						type: "rectangle",
						x: startx,
						y: starty,
						width,
						height,
					});
				} else if (state.currentTool === "circle") {
					const radius = Math.sqrt(width ** 2 + height ** 2);
					existingShapes.push({
						type: "circle",
						x: startx,
						y: starty,
						radius: radius,
					});
				}

				saveShapes(existingShapes);
				repaintCanvas();

				canvas.removeEventListener("mousemove", mouseMoveListener);
			},
			{ once: true }
		);
	});
}
