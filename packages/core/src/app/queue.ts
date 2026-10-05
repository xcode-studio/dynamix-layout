/** @deprecated Internal; removed in 2.0. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
class Queue<T> {
	private buffer: (T | undefined)[]
	private head: number = 0
	private tail: number = 0
	private count: number = 0
	private capacity: number

	constructor(initialCapacity: number = 16, array: T[] = []) {
		this.capacity = Math.max(initialCapacity, array.length)
		this.buffer = new Array(this.capacity)

		array.forEach((element) => {
			this.enqueue(element)
		})
	}

	// ==================== INSERTION OPERATIONS ====================

	/**
	 * Add element to the back of the queue - O(1) amortized
	 * Used for FIFO and FILO patterns
	 */
	enqueue(item: T): void {
		if (this.count === this.capacity) {
			this.resize()
		}

		this.buffer[this.tail] = item
		this.tail = (this.tail + 1) % this.capacity
		this.count++
	}

	/**
	 * Add element to the front of the queue - O(1) amortized
	 * Used for LIFO and LILO patterns
	 */
	enqueueFront(item: T): void {
		if (this.count === this.capacity) {
			this.resize()
		}

		this.head = (this.head - 1 + this.capacity) % this.capacity
		this.buffer[this.head] = item
		this.count++
	}

	/**
	 * Insert element at specific logical index - O(n)
	 * All elements at and after the index are shifted right
	 * @param index - Logical index (0 = front of queue)
	 * @param item - Element to insert
	 * @returns true if insertion successful, false if index out of bounds
	 */
	insert(index: number, item: T): boolean {
		// Validate index bounds
		if (index < 0 || index > this.count) {
			return false
		}

		// Handle edge cases with existing O(1) operations
		if (index === 0) {
			this.enqueueFront(item)
			return true
		}
		if (index === this.count) {
			this.enqueue(item)
			return true
		}

		// Ensure we have capacity
		if (this.count === this.capacity) {
			this.resize()
		}

		// Determine which direction to shift (minimize operations)
		const distanceFromHead = index
		const distanceFromTail = this.count - index

		if (distanceFromHead <= distanceFromTail) {
			// Shift elements towards head (left shift)
			this.shiftLeft(index, item)
		} else {
			// Shift elements towards tail (right shift)
			this.shiftRight(index, item)
		}

		this.count++
		return true
	}

	/**
	 * Insert array of elements at specific logical index - O(n + m) where n is elements to shift, m is array length
	 * All elements at and after the index are shifted right to make room for the entire array
	 * @param index - Logical index (0 = front of queue)
	 * @param items - Array of elements to insert
	 * @returns true if insertion successful, false if index out of bounds
	 */
	insertArray(index: number, items: T[]): boolean {
		// Validate index bounds
		if (index < 0 || index > this.count) {
			return false
		}

		// Handle empty array case
		if (items.length === 0) {
			return true
		}

		// Handle edge cases - append/prepend entire array
		if (index === 0) {
			// Insert at beginning - add all items to front in reverse order
			for (let i = items.length - 1; i >= 0; i--) {
				this.enqueueFront(items[i])
			}
			return true
		}
		if (index === this.count) {
			// Insert at end - add all items to back
			items.forEach((item) => this.enqueue(item))
			return true
		}

		// Ensure we have enough capacity
		while (this.count + items.length > this.capacity) {
			this.resize()
		}

		// Determine which direction to shift (minimize operations)
		const distanceFromHead = index
		const distanceFromTail = this.count - index
		const insertLength = items.length

		if (distanceFromHead <= distanceFromTail) {
			// Shift elements towards head (left shift)
			this.shiftLeftArray(index, items)
		} else {
			// Shift elements towards tail (right shift)
			this.shiftRightArray(index, items)
		}

		this.count += insertLength
		return true
	}

	/**
	 * Insert another queue at specific logical index - O(n + m) where n is elements to shift, m is queue size
	 * All elements at and after the index are shifted right to make room for the entire queue
	 * @param index - Logical index (0 = front of queue)
	 * @param queue - Queue to insert
	 * @returns true if insertion successful, false if index out of bounds
	 */
	insertQueue(index: number, queue: Queue<T>): boolean {
		// Validate index bounds
		if (index < 0 || index > this.count) {
			return false
		}

		// Handle empty queue case
		if (queue.isEmpty()) {
			return true
		}

		const queueSize = queue.size()

		// Handle edge cases - append/prepend entire queue
		if (index === 0) {
			// Insert at beginning - add all items to front in reverse order
			// Use reverse iterator to maintain order
			const items = queue.toArray()
			for (let i = items.length - 1; i >= 0; i--) {
				this.enqueueFront(items[i])
			}
			return true
		}
		if (index === this.count) {
			// Insert at end - add all items to back
			for (const item of queue) {
				this.enqueue(item)
			}
			return true
		}

		// Ensure we have enough capacity
		while (this.count + queueSize > this.capacity) {
			this.resize()
		}

		// Convert queue to array for efficient insertion
		const queueItems = queue.toArray()

		// Determine which direction to shift (minimize operations)
		const distanceFromHead = index
		const distanceFromTail = this.count - index

		if (distanceFromHead <= distanceFromTail) {
			// Shift elements towards head (left shift)
			this.shiftLeftArray(index, queueItems)
		} else {
			// Shift elements towards tail (right shift)
			this.shiftRightArray(index, queueItems)
		}

		this.count += queueSize
		return true
	}

	/**
	 * Alias for enqueue (add to back)
	 */
	push(item: T): void {
		this.enqueue(item)
	}

	/**
	 * Alias for enqueueFront (add to front)
	 */
	unshift(item: T): void {
		this.enqueueFront(item)
	}

	// ==================== REMOVAL OPERATIONS ====================

	/**
	 * Remove and return element from front of queue - O(1)
	 * Used for FIFO and LIFO patterns
	 */
	dequeue(): T | undefined {
		if (this.count === 0) {
			return undefined
		}

		const item = this.buffer[this.head]
		// Don't store undefined - just move the head pointer
		this.head = (this.head + 1) % this.capacity
		this.count--

		return item
	}

	/**
	 * Remove and return element from back of queue - O(1)
	 * Used for FILO and LILO patterns
	 */
	dequeueBack(): T | undefined {
		if (this.count === 0) {
			return undefined
		}

		this.tail = (this.tail - 1 + this.capacity) % this.capacity
		const item = this.buffer[this.tail]
		// Don't store undefined - the tail pointer now excludes this position
		this.count--

		return item
	}

	indexOf(item: T): number {
		for (let i = 0; i < this.count; i++) {
			const actualIndex = (this.head + i) % this.capacity
			if (this.buffer[actualIndex] === item) {
				return i // Return logical index
			}
		}
		return -1 // Not found
	}

	remove(item: T): boolean {
		const index = this.indexOf(item)
		if (index === -1) return false
		this.removeAt(index)
		return true
	}

	/**
	 * Remove element at specific logical index - O(n)
	 * All elements after the index are shifted left
	 * @param index - Logical index (0 = front of queue)
	 * @returns The removed element, or undefined if index out of bounds
	 */
	removeAt(index: number): T | undefined {
		// Validate index bounds
		if (index < 0 || index >= this.count) {
			return undefined
		}

		// Handle edge cases with existing O(1) operations
		if (index === 0) {
			return this.dequeue()
		}
		if (index === this.count - 1) {
			return this.dequeueBack()
		}

		// Get the element to remove
		const actualIndex = (this.head + index) % this.capacity
		const removedItem = this.buffer[actualIndex]

		// Determine which direction to shift (minimize operations)
		const distanceFromHead = index
		const distanceFromTail = this.count - index - 1

		if (distanceFromHead <= distanceFromTail) {
			// Shift elements from head towards the gap (right shift)
			this.shiftRightForRemoval(index)
		} else {
			// Shift elements from tail towards the gap (left shift)
			this.shiftLeftForRemoval(index)
		}

		this.count--
		return removedItem
	}

	/**
	 * Alias for dequeue (remove from front)
	 */
	shift(): T | undefined {
		return this.dequeue()
	}

	/**
	 * Alias for dequeueBack (remove from back)
	 */
	pop(): T | undefined {
		return this.dequeueBack()
	}

	// ==================== PATTERN-SPECIFIC METHODS ====================

	/**
	 * FIFO: First In, First Out
	 * Add to back, remove from front
	 */
	fifoAdd(item: T): void {
		this.enqueue(item)
	}

	fifoRemove(): T | undefined {
		return this.dequeue()
	}

	/**
	 * FILO: First In, Last Out
	 * Add to back, remove from back
	 */
	filoAdd(item: T): void {
		this.enqueue(item)
	}

	filoRemove(): T | undefined {
		return this.dequeueBack()
	}

	/**
	 * LIFO: Last In, First Out
	 * Add to front, remove from front
	 */
	lifoAdd(item: T): void {
		this.enqueueFront(item)
	}

	lifoRemove(): T | undefined {
		return this.dequeue()
	}

	/**
	 * LILO: Last In, Last Out
	 * Add to front, remove from back
	 */
	liloAdd(item: T): void {
		this.enqueueFront(item)
	}

	liloRemove(): T | undefined {
		return this.dequeueBack()
	}

	// ==================== ACCESS OPERATIONS ====================

	/**
	 * Get element at logical index (0 = front of queue) - O(1)
	 */
	get(index: number): T | undefined {
		if (index < 0 || index >= this.count) {
			return undefined
		}

		const actualIndex = (this.head + index) % this.capacity
		return this.buffer[actualIndex]
	}

	/**
	 * Set element at logical index - O(1)
	 */
	set(index: number, item: T): boolean {
		if (index < 0 || index >= this.count) {
			return false
		}

		const actualIndex = (this.head + index) % this.capacity
		this.buffer[actualIndex] = item
		return true
	}

	/**
	 * Get the front element without removing it - O(1)
	 */
	peek(): T | undefined {
		return this.count > 0 ? this.buffer[this.head] : undefined
	}

	/**
	 * Get the back element without removing it - O(1)
	 */
	peekBack(): T | undefined {
		if (this.count === 0) return undefined
		const backIndex = (this.tail - 1 + this.capacity) % this.capacity
		return this.buffer[backIndex]
	}

	/**
	 * Alias for peek (front element)
	 */
	front(): T | undefined {
		return this.peek()
	}

	/**
	 * Alias for peekBack (back element)
	 */
	back(): T | undefined {
		return this.peekBack()
	}

	// ==================== UTILITY METHODS ====================

	/**
	 * Get current size of queue - O(1)
	 */
	size(): number {
		return this.count
	}

	/**
	 * Get current capacity - O(1)
	 */
	getCapacity(): number {
		return this.capacity
	}

	/**
	 * Check if queue is empty - O(1)
	 */
	isEmpty(): boolean {
		return this.count === 0
	}

	/**
	 * Check if queue is full - O(1)
	 */
	isFull(): boolean {
		return this.count === this.capacity
	}

	/**
	 * Clear all elements from queue - O(1)
	 */
	clear(): void {
		// Don't create new array, just reset pointers
		this.head = 0
		this.tail = 0
		this.count = 0
	}

	/**
	 * Convert queue to array (maintains order from front to back) - O(n)
	 */
	toArray(): T[] {
		const result: T[] = []
		for (let i = 0; i < this.count; i++) {
			const actualIndex = (this.head + i) % this.capacity
			result.push(this.buffer[actualIndex] as T)
		}
		return result
	}

	/**
	 * Forward iterator support for for...of loops - O(n) total
	 * Iterates from front to back
	 */
	*[Symbol.iterator](): IterableIterator<T> {
		for (let i = 0; i < this.count; i++) {
			const actualIndex = (this.head + i) % this.capacity
			yield this.buffer[actualIndex] as T
		}
	}

	/**
	 * Forward iterator (same as Symbol.iterator) - O(n) total
	 * Iterates from front to back
	 */
	*forward(): IterableIterator<T> {
		for (let i = 0; i < this.count; i++) {
			const actualIndex = (this.head + i) % this.capacity
			yield this.buffer[actualIndex] as T
		}
	}

	/**
	 * Reverse iterator - O(n) total
	 * Iterates from back to front
	 */
	*reverse(): IterableIterator<T> {
		for (let i = this.count - 1; i >= 0; i--) {
			const actualIndex = (this.head + i) % this.capacity
			yield this.buffer[actualIndex] as T
		}
	}

	/**
	 * Iterator with index information - O(n) total
	 * Returns [index, value] pairs from front to back
	 */
	*entries(): IterableIterator<[number, T]> {
		for (let i = 0; i < this.count; i++) {
			const actualIndex = (this.head + i) % this.capacity
			yield [i, this.buffer[actualIndex] as T]
		}
	}

	/**
	 * Iterator for keys (indices) - O(n) total
	 */
	*keys(): IterableIterator<number> {
		for (let i = 0; i < this.count; i++) {
			yield i
		}
	}

	/**
	 * Iterator for values only - O(n) total
	 * Same as Symbol.iterator but more explicit
	 */
	*values(): IterableIterator<T> {
		for (let i = 0; i < this.count; i++) {
			const actualIndex = (this.head + i) % this.capacity
			yield this.buffer[actualIndex] as T
		}
	}

	/**
	 * Get string representation - O(n)
	 */
	toString(): string {
		return `Queue(${this.toArray().join(', ')})`
	}

	// ==================== PRIVATE HELPER METHODS ====================

	/**
	 * Private method to resize buffer when capacity is exceeded
	 */
	private resize(): void {
		const newCapacity = this.capacity * 2
		const newBuffer = new Array(newCapacity)

		// Copy elements in correct order to new buffer
		for (let i = 0; i < this.count; i++) {
			const oldIndex = (this.head + i) % this.capacity
			newBuffer[i] = this.buffer[oldIndex]
		}

		this.buffer = newBuffer
		this.capacity = newCapacity
		this.head = 0
		this.tail = this.count
	}

	/**
	 * Shift elements left (towards head) to make room for insertion
	 * Used when inserting closer to head
	 */
	private shiftLeft(insertIndex: number, item: T): void {
		// Move head one position left
		this.head = (this.head - 1 + this.capacity) % this.capacity

		// Shift elements from old head position to insert position
		for (let i = 0; i < insertIndex; i++) {
			const fromIndex = (this.head + 1 + i) % this.capacity
			const toIndex = (this.head + i) % this.capacity
			this.buffer[toIndex] = this.buffer[fromIndex]
		}

		// Insert the new item
		const actualInsertIndex = (this.head + insertIndex) % this.capacity
		this.buffer[actualInsertIndex] = item
	}

	/**
	 * Shift elements right (towards tail) to make room for insertion
	 * Used when inserting closer to tail
	 */
	private shiftRight(insertIndex: number, item: T): void {
		// Shift elements from insert position to tail
		for (let i = this.count - 1; i >= insertIndex; i--) {
			const fromIndex = (this.head + i) % this.capacity
			const toIndex = (this.head + i + 1) % this.capacity
			this.buffer[toIndex] = this.buffer[fromIndex]
		}

		// Insert the new item
		const actualInsertIndex = (this.head + insertIndex) % this.capacity
		this.buffer[actualInsertIndex] = item

		// Move tail one position right
		this.tail = (this.tail + 1) % this.capacity
	}

	/**
	 * Shift elements right (towards tail) to fill gap after removal
	 * Used when removing closer to head
	 */
	private shiftRightForRemoval(removeIndex: number): void {
		// Shift elements from head to remove position
		for (let i = removeIndex; i > 0; i--) {
			const fromIndex = (this.head + i - 1) % this.capacity
			const toIndex = (this.head + i) % this.capacity
			this.buffer[toIndex] = this.buffer[fromIndex]
		}

		// Move head pointer (don't store undefined)
		this.head = (this.head + 1) % this.capacity
	}

	/**
	 * Shift elements left (towards head) to fill gap after removal
	 * Used when removing closer to tail
	 */
	private shiftLeftForRemoval(removeIndex: number): void {
		// Shift elements from remove position to tail
		for (let i = removeIndex; i < this.count - 1; i++) {
			const fromIndex = (this.head + i + 1) % this.capacity
			const toIndex = (this.head + i) % this.capacity
			this.buffer[toIndex] = this.buffer[fromIndex]
		}

		// Move tail pointer (don't store undefined)
		this.tail = (this.tail - 1 + this.capacity) % this.capacity
	}

	/**
	 * Shift elements left (towards head) to make room for array insertion
	 * Used when inserting array closer to head
	 */
	private shiftLeftArray(insertIndex: number, items: T[]): void {
		const insertLength = items.length

		// Move head left by insertLength positions
		this.head = (this.head - insertLength + this.capacity) % this.capacity

		// Shift existing elements from old head position to insert position
		for (let i = 0; i < insertIndex; i++) {
			const fromIndex = (this.head + insertLength + i) % this.capacity
			const toIndex = (this.head + i) % this.capacity
			this.buffer[toIndex] = this.buffer[fromIndex]
		}

		// Insert the new items
		for (let i = 0; i < insertLength; i++) {
			const actualInsertIndex =
				(this.head + insertIndex + i) % this.capacity
			this.buffer[actualInsertIndex] = items[i]
		}
	}

	/**
	 * Shift elements right (towards tail) to make room for array insertion
	 * Used when inserting array closer to tail
	 */
	private shiftRightArray(insertIndex: number, items: T[]): void {
		const insertLength = items.length

		// Shift existing elements from insert position to tail, moving right
		for (let i = this.count - 1; i >= insertIndex; i--) {
			const fromIndex = (this.head + i) % this.capacity
			const toIndex = (this.head + i + insertLength) % this.capacity
			this.buffer[toIndex] = this.buffer[fromIndex]
		}

		// Insert the new items
		for (let i = 0; i < insertLength; i++) {
			const actualInsertIndex =
				(this.head + insertIndex + i) % this.capacity
			this.buffer[actualInsertIndex] = items[i]
		}

		// Move tail right by insertLength positions
		this.tail = (this.tail + insertLength) % this.capacity
	}
}

export { Queue }
