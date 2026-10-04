import { Queue } from './queue'
import { createReactiveState } from './reactive-state'
import { areNodeOptionsMapEqual } from './comparator'
import { Node, Bond } from './node'
import { layoutState, defaultCreateId, defaultTimer } from './state'
import type { Timer } from './state'
import type {
	Dimension,
	LayoutTree,
	NodeOptions,
	RootAdjustment,
	ReactiveValue,
	TabsIds,
} from '../type'
import * as treeBuilder from './tree-builder'
import * as geometry from './geometry'
import * as slider from './slider'
import * as treeMutations from './tree-mutations'

class Layout {
	static get _root(): Node {
		return layoutState.root
	}

	static set _root(value: Node) {
		layoutState.root = value
	}

	static get _tree(): LayoutTree | null {
		return layoutState.tree
	}

	static set _tree(value: LayoutTree | null) {
		layoutState.tree = value
	}

	static get _minW(): number {
		return layoutState.minW
	}

	static set _minW(value: number) {
		layoutState.minW = value
	}

	static get _minH(): number {
		return layoutState.minH
	}

	static set _minH(value: number) {
		layoutState.minH = value
	}

	static get _bond(): number {
		return layoutState.bond
	}

	static set _bond(value: number) {
		layoutState.bond = value
	}

	static get _inst(): Layout | null {
		return layoutState.inst
	}

	static set _inst(value: Layout | null) {
		layoutState.inst = value
	}

	nodeOps: ReactiveValue<Map<string, NodeOptions>>
	cntdown: ReturnType<typeof setTimeout> | null = null
	tabsIds: TabsIds = new Map<string, string>()
	constructor(
		options: {
			tabs?: string[]
			tree?: LayoutTree | null
			minW?: number
			minH?: number
			bond?: number
			uqid?: string
			tabsIds?: TabsIds
			/** Generates ids for new nodes and bonds (default `crypto.randomUUID`). */
			createId?: () => string
			/** Schedules deferred updates (default `setTimeout`/`clearTimeout`). */
			timer?: Timer
		} = {}
	) {
		const config = {
			tabs: [],
			tree: null,
			minW: 40,
			minH: 40,
			bond: 10,
			uqid: 'dynamix-layout-root',
			tabsIds: new Map<string, string>(),
			...options,
		}

		this.tabsIds = config.tabsIds
		layoutState.createId = config.createId ?? defaultCreateId
		layoutState.timer = config.timer ?? defaultTimer

		// Reset on every construction so a tabs-only layout never reuses the
		// tree of a previously created layout.
		Layout._tree = config.tree ?? null

		Layout._root = new Node({
			unId: config.uqid,
			name: config.uqid,
			type: 'row',
		})

		this.nodeOps = createReactiveState(
			new Map<string, NodeOptions>(),
			areNodeOptionsMapEqual
		)

		Layout._minW = config.minW
		Layout._minH = config.minH
		Layout._bond = config.bond

		const tabsQueue = new Queue<string>(config.tabs.length, config.tabs)
		if (Layout._tree) this.createNodeLayout()
		else this.createBinaryNodeTreeFromQueue(tabsQueue)

		Layout._inst = this
	}

	*JSONLayoutIterator(root: LayoutTree): IterableIterator<LayoutTree> {
		yield* treeBuilder.JSONLayoutIterator(root)
	}

	*NodeLayoutIterator(root: Node): IterableIterator<Node> {
		yield* treeBuilder.NodeLayoutIterator(root)
	}

	*NodeLayoutRecursiveIterator(root: Node): IterableIterator<Node> {
		yield* treeBuilder.NodeLayoutRecursiveIterator(this, root)
	}

	updateChildDirections(parent: Node) {
		return treeBuilder.updateChildDirections(this, parent)
	}

	createNodeLayout(root: LayoutTree | null = Layout._tree) {
		return treeBuilder.createNodeLayout(this, root)
	}

	createNodeTreeFromJSONTree(json: LayoutTree, host: Node) {
		return treeBuilder.createNodeTreeFromJSONTree(this, json, host)
	}

	createBinaryNodeTreeFromQueue(
		queue: Queue<string>,
		host: Node = Layout._root
	) {
		return treeBuilder.createBinaryNodeTreeFromQueue(this, queue, host)
	}

	createNodeFromJSON(json: LayoutTree): Node {
		return treeBuilder.createNodeFromJSON(this, json)
	}

	calcTabsetCountAndMinDim(root: Node = Layout._root, clear: boolean = true) {
		return geometry.calcTabsetCountAndMinDim(this, root, clear)
	}

	pruneStaleDirections() {
		return geometry.pruneStaleDirections()
	}

	calculateRootAdjustment(): RootAdjustment {
		return geometry.calculateRootAdjustment()
	}

	calcDimensions(root: Node = Layout._root, supress: boolean = false) {
		return geometry.calcDimensions(this, root, supress)
	}

	updateDimension(
		dim: Dimension,
		disableTimeout: boolean = false,
		timeout: number = 2
	) {
		return geometry.updateDimension(this, dim, disableTimeout, timeout)
	}

	updateSlider(
		id: string,
		dim: { x: number; y: number },
		disableTimeout: boolean = false,
		timeout: number = 2
	) {
		return slider.updateSlider(this, id, dim, disableTimeout, timeout)
	}

	updateSliderDimension(id: string, dim: { x: number; y: number }) {
		return slider.updateSliderDimension(this, id, dim)
	}

	updateTree(
		src: string,
		des: string,
		layout: 'top' | 'bottom' | 'left' | 'right' | 'contain'
	): boolean {
		return treeMutations.updateTree(this, src, des, layout)
	}

	isOnlyContent(node: Node): boolean {
		return treeMutations.isOnlyContent(this, node)
	}

	moveNodeAsTab(src: Node, des: Node, layout: 'left' | 'right' | 'contain') {
		return treeMutations.moveNodeAsTab(this, src, des, layout)
	}

	moveRelativeToRoot(
		src: Node,
		des: Node,
		layout: 'top' | 'bottom' | 'left' | 'right'
	) {
		return treeMutations.moveRelativeToRoot(this, src, des, layout)
	}

	moveRelativeToTabset(
		src: Node,
		des: Node,
		layout: 'top' | 'bottom' | 'left' | 'right'
	) {
		return treeMutations.moveRelativeToTabset(this, src, des, layout)
	}

	insertNode(des: Node, src: Node, flag: boolean) {
		return treeMutations.insertNode(this, des, src, flag)
	}

	insertNodeWithNewParent(src: Node, des: Node, flag: boolean) {
		return treeMutations.insertNodeWithNewParent(this, src, des, flag)
	}

	moveAdjacentNodeToGrandParent(src: Node) {
		return treeMutations.moveAdjacentNodeToGrandParent(this, src)
	}

	removeRelation(src: Node, fix: boolean = true) {
		return treeMutations.removeRelation(src, fix)
	}

	removeNode(src: Node) {
		return treeMutations.removeNode(this, src)
	}

	removeKid(kid: Node) {
		return treeMutations.removeKid(kid)
	}

	clearAllCache() {
		return treeMutations.clearAllCache()
	}
}

export { Node, Bond }
export { Layout as DynamixLayoutCore }
