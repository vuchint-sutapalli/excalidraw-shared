// A simple and efficient Min-Heap based Priority Queue implementation.

export class PriorityQueue<T> {
	private heap: T[] = [];
	private comparator: (a: T, b: T) => boolean;

	constructor(comparator = (a: T, b: T) => a < b) {
		this.comparator = comparator;
	}

	size(): number {
		return this.heap.length;
	}

	isEmpty(): boolean {
		return this.size() === 0;
	}

	peek(): T | undefined {
		return this.heap[0];
	}

	push(value: T) {
		this.heap.push(value);
		this.siftUp();
	}

	pop(): T | undefined {
		if (this.isEmpty()) return undefined;
		this.swap(0, this.size() - 1);
		const poppedValue = this.heap.pop();
		this.siftDown();
		return poppedValue;
	}

	private parent = (i: number) => Math.floor((i - 1) / 2);
	private left = (i: number) => 2 * i + 1;
	private right = (i: number) => 2 * i + 2;
	private swap = (i: number, j: number) =>
		([this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]);

	private siftUp() {
		let nodeIdx = this.size() - 1;
		while (
			nodeIdx > 0 &&
			this.comparator(this.heap[nodeIdx], this.heap[this.parent(nodeIdx)])
		) {
			this.swap(nodeIdx, this.parent(nodeIdx));
			nodeIdx = this.parent(nodeIdx);
		}
	}

	private siftDown() {
		let nodeIdx = 0;
		while (
			(this.left(nodeIdx) < this.size() &&
				this.comparator(this.heap[this.left(nodeIdx)], this.heap[nodeIdx])) ||
			(this.right(nodeIdx) < this.size() &&
				this.comparator(this.heap[this.right(nodeIdx)], this.heap[nodeIdx]))
		) {
			const greaterChildIdx =
				this.right(nodeIdx) < this.size() &&
				this.comparator(
					this.heap[this.right(nodeIdx)],
					this.heap[this.left(nodeIdx)]
				)
					? this.right(nodeIdx)
					: this.left(nodeIdx);
			this.swap(nodeIdx, greaterChildIdx);
			nodeIdx = greaterChildIdx;
		}
	}
}
