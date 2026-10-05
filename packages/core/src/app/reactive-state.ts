import type { ReactiveValue, ChangeListener } from '../type'

/** @deprecated Internal; removed in 2.0. Use `layout.subscribe()`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
function createReactiveState<T>(
	initialValue: T,
	comparator: (a: T, b: T) => boolean = (a, b) => a === b
): ReactiveValue<T> {
	let value = initialValue
	const listeners = new Set<ChangeListener<T>>()
	let pendingResolvers: Array<(val: T) => void> = []

	const get = (): T => value

	const set = (newValue: T, flag: boolean = false): void => {
		if (flag) {
			value = newValue
			return
		}

		if (!comparator(value, newValue)) {
			value = newValue

			listeners.forEach((cb) => cb(value))
			pendingResolvers.forEach((resolve) => resolve(value))
			pendingResolvers = []
		}
	}

	const triggerChange = (): void => {
		listeners.forEach((cb) => cb(value))
		pendingResolvers.forEach((resolve) => resolve(value))
		pendingResolvers = []
	}

	const onChange = (listener: ChangeListener<T>): (() => void) => {
		listeners.add(listener)
		return () => listeners.delete(listener)
	}

	const nextChange = (): Promise<T> => {
		return new Promise<T>((resolve) => {
			pendingResolvers.push(resolve)
		})
	}

	const onChangePromise = (listener: ChangeListener<T>): (() => void) => {
		let active = true

		const loop = async () => {
			while (active) {
				const val = await nextChange()
				if (!active) break
				listener(val)
			}
		}

		loop()

		return () => {
			active = false
		}
	}

	return {
		get,
		set,

		onChange,
		nextChange,
		triggerChange,
		onChangePromise,
	}
}

export { createReactiveState }
