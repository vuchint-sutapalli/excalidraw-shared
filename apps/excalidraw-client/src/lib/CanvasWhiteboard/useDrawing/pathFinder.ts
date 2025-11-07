import { Element, Point } from "../types";
import { getElementBounds } from "../element";
import { PriorityQueue } from "./priorityQueue";

const GRID_SIZE = 20;
const OBSTACLE_PADDING = 20; // Extra space around elements

interface Node {
	x: number;
	y: number;
	g: number; // Cost from start
	h: number; // Heuristic cost to end
	f: number; // g + h
	parent: Node | null;
}

const TURN_PENALTY = GRID_SIZE * 2; // Make turns more expensive than moving
const MAX_ITERATIONS = 3000; // Safety break to prevent long freezes

function heuristic(a: Point, b: Point): number {
	// Manhattan distance
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isWalkable(
	x: number,
	y: number,
	obstacles: {
		left: number;
		top: number;
		right: number;
		bottom: number;
	}[]
): boolean {
	for (const obs of obstacles) {
		if (x > obs.left && x < obs.right && y > obs.top && y < obs.bottom) {
			return false;
		}
	}
	return true;
}

export function calculateOrthogonalPath(
	startPoint: Point,
	endPoint: Point,
	allElements: Element[],
	startElementId: string,
	endElementId: string
): Point[] {
	const obstacles = allElements
		.filter((el) => el.id !== startElementId && el.id !== endElementId)
		.map((el) => {
			const bounds = getElementBounds(el);
			return {
				left: bounds.x - OBSTACLE_PADDING,
				top: bounds.y - OBSTACLE_PADDING,
				right: bounds.x + bounds.width + OBSTACLE_PADDING,
				bottom: bounds.y + bounds.height + OBSTACLE_PADDING,
			};
		});

	const startNode: Node = {
		x: Math.round(startPoint.x / GRID_SIZE) * GRID_SIZE,
		y: Math.round(startPoint.y / GRID_SIZE) * GRID_SIZE,
		g: 0,
		h: heuristic(startPoint, endPoint),
		f: heuristic(startPoint, endPoint),
		parent: null,
	};

	const endNodePos = {
		x: Math.round(endPoint.x / GRID_SIZE) * GRID_SIZE,
		y: Math.round(endPoint.y / GRID_SIZE) * GRID_SIZE,
	};

	const openSet = new PriorityQueue<Node>((a, b) => a.f < b.f); // Min-heap
	openSet.push(startNode);

	// Use a Map to store nodes in the open set for quick lookups
	const openSetMap = new Map<string, Node>();
	openSetMap.set(`${startNode.x},${startNode.y}`, startNode);

	const closedSet = new Set<string>();
	let iterations = 0;

	console.log("computingggg path");

	while (!openSet.isEmpty()) {
		if (iterations++ > MAX_ITERATIONS) break; // Safety break
		const currentNode = openSet.pop()!;
		openSetMap.delete(`${currentNode.x},${currentNode.y}`);

		if (currentNode.x === endNodePos.x && currentNode.y === endNodePos.y) {
			// Reconstruct path
			const path: Point[] = [];
			let temp: Node | null = currentNode;
			while (temp) {
				path.push({ x: temp.x, y: temp.y });
				temp = temp.parent;
			}
			const finalPath = path.reverse();

			// Add original start and end points for precision
			finalPath[0] = startPoint;
			finalPath[finalPath.length - 1] = endPoint;
			return finalPath;
		}

		closedSet.add(`${currentNode.x},${currentNode.y}`);
		const parent = currentNode.parent;

		const neighbors = [
			{ x: currentNode.x + GRID_SIZE, y: currentNode.y },
			{ x: currentNode.x - GRID_SIZE, y: currentNode.y },
			{ x: currentNode.x, y: currentNode.y + GRID_SIZE },
			{ x: currentNode.x, y: currentNode.y - GRID_SIZE },
		];

		for (const neighborPos of neighbors) {
			if (
				!isWalkable(neighborPos.x, neighborPos.y, obstacles) ||
				closedSet.has(`${neighborPos.x},${neighborPos.y}`)
			) {
				continue;
			}

			let gScore = currentNode.g + GRID_SIZE;

			// Add turn penalty
			if (parent) {
				const dx1 = currentNode.x - parent.x;
				const dy1 = currentNode.y - parent.y;
				const dx2 = neighborPos.x - currentNode.x;
				const dy2 = neighborPos.y - currentNode.y;
				if (dx1 !== dx2 || dy1 !== dy2) {
					gScore += TURN_PENALTY;
				}
			}

			const existingNeighbor = openSetMap.get(
				`${neighborPos.x},${neighborPos.y}`
			);

			if (!existingNeighbor || gScore < existingNeighbor.g) {
				const neighborNode: Node = {
					x: neighborPos.x,
					y: neighborPos.y,
					g: gScore,
					h: heuristic(neighborPos, endNodePos),
					f: gScore + heuristic(neighborPos, endNodePos),
					parent: currentNode,
				};

				openSet.push(neighborNode);
				openSetMap.set(`${neighborNode.x},${neighborNode.y}`, neighborNode);
			}
		}
	}

	// Fallback to a direct line if no path is found
	return [startPoint, endPoint];
}
