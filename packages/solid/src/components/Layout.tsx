import {
	getTabBarPlacement,
	getTabContentRect,
	type Rect,
	type Side,
} from '@dynamix-layout/core'
import {
	createEffect,
	createMemo,
	For,
	on,
	onMount,
	Show,
	type JSX,
	type ParentComponent,
} from 'solid-js'
import {
	DefaultHoverElement,
	DefaultSliderElement,
	DefaultWrapTabBody,
	DefaultWrapTabHead,
	DefaultWrapTabLabel,
	DefaultWrapTabPanel,
	DefaultTabsetToolbar,
	RootSplitterHoverEl,
} from './Default'
import { useDynamixLayout } from '../hooks/useLayout'
import type { LayoutProps } from '../types'

const DEFAULT_SIZE = 40
const DEFAULT_BOND = 10
const SIDES: readonly Side[] = ['left', 'right', 'top', 'bottom']

const position = (rect: Rect | undefined): JSX.CSSProperties =>
	rect
		? {
				left: `${rect.x}px`,
				top: `${rect.y}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
			}
		: {}

/** Keys that only change when the set of ids changes, so `<For>` keeps its items. */
const sameIds = (a: readonly string[], b: readonly string[]) =>
	a.length === b.length && a.every((id, i) => id === b[i])

export const DynamixLayout: ParentComponent<LayoutProps> = (props) => {
	let root: HTMLDivElement | undefined
	/* eslint-disable solid/reactivity -- read once, like the v1 component */
	const initialTabs = props.tabs
	const tabHeadHeight = props.tabHeadHeight ?? DEFAULT_SIZE
	const enableTabbar = props.enableTabbar ?? true
	const enableMaximize = props.enableMaximize ?? true
	// Folding needs the tab bar: a folded tabset is only its tab bar.
	const canFold = (props.enableCollapse ?? true) && enableTabbar
	const rootId = props.rootId ?? 'dynamix-layout-root'

	const layout = useDynamixLayout({
		tabIds: initialTabs.map(([id]) => id),
		layoutTree: props.layoutTree,
		updateJSON: props.updateJSON,
		enableTabbar,
		tabHeadHeight,
		bondWidth: props.bondWidth ?? DEFAULT_BOND,
		minTabHeight: props.minTabHeight ?? DEFAULT_SIZE,
		minTabWidth: props.minTabWidth ?? DEFAULT_SIZE,
		windowResizeTimeout: props.windowResizeTimeout ?? 2,
		disableResizeTimeout: props.disableResizeTimeout ?? true,
		keyboardShortcuts: props.keyboardShortcuts ?? true,
		enableDoubleClickMaximize: props.enableDoubleClickMaximize ?? true,
		getRoot: () => root,
		container: () => {
			const pad = props.pad ?? { t: 0, b: 0, l: 0, r: 0 }
			if (!root) return { x: pad.l, y: pad.t, width: 0, height: 0 }
			return {
				x: pad.l,
				y: pad.t,
				width: Math.max(0, root.clientWidth - pad.l - pad.r),
				height: Math.max(0, root.clientHeight - pad.t - pad.b),
			}
		},
	})
	const WrapTabPanel = props.WrapTabPanel ?? DefaultWrapTabPanel
	const WrapTabHead = props.WrapTabHead ?? DefaultWrapTabHead
	const WrapTabLabel = props.WrapTabLabel ?? DefaultWrapTabLabel
	const WrapTabBody = props.WrapTabBody ?? DefaultWrapTabBody
	const SliderElement = props.SliderElement ?? DefaultSliderElement
	const HoverElement = props.HoverElement ?? DefaultHoverElement
	const TabsetToolbar = props.TabsetToolbar ?? DefaultTabsetToolbar
	/* eslint-enable solid/reactivity */

	const { snapshot, dragging } = layout
	const tabsetIds = createMemo(() => [...snapshot().tabsets.keys()], [], {
		equals: sameIds,
	})
	const splitterIds = createMemo(() => [...snapshot().splitters.keys()], [], {
		equals: sameIds,
	})
	const entry = (tabId: string) => props.tabs.find(([id]) => id === tabId)
	const title = (tabId: string) =>
		entry(tabId)?.[2]?.title ?? props.tabNames?.get(tabId) ?? tabId

	// `tabs` is reactive: push new or removed ids into the same engine.
	createEffect(
		on(
			() => props.tabs.map(([id]) => id).join('\u0000'),
			() => layout.engine.setTabs(props.tabs.map(([id]) => ({ id }))),
			{ defer: true }
		)
	)
	onMount(() => props.onReady?.(layout.engine))

	return (
		<div
			id={rootId}
			ref={root}
			{...props}
			data-testid={rootId}
			class={dragging() ? 'is-dragging' : ''}
			onPointerDown={(e) => layout.onRootPointerDown(e)}
			onDragOver={(e) => layout.onDragOver(e)}
			onDrop={(e) => layout.onDrop(e)}
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				...(props.style as object),
			}}
		>
			<For each={tabsetIds()}>
				{(tabsetId) => {
					const state = () => snapshot().tabsets.get(tabsetId)
					const rect = () => snapshot().rects.tabsets.get(tabsetId)
					const placement = () => {
						const s = state()
						const r = rect()
						return s && r
							? getTabBarPlacement(r, s, tabHeadHeight)
							: undefined
					}
					const showMaximize = () =>
						enableMaximize && !!state()?.canMaximize
					const showFold = () =>
						canFold && !!state()?.canFold && !state()?.isMaximized
					const hasToolbar = () => showMaximize() || showFold()

					return (
						<>
							<WrapTabPanel
								data-uid={tabsetId}
								data-type="tabset"
								class={
									'hide-scrollbar DefaultWrapTabPanel ' +
									(props.tabPanelElementClass || '')
								}
								style={{
									position: 'absolute',
									...(props.tabPanelElementStyles as object),
									...position(rect()),
									'background-color': 'transparent',
									// Over the tab bodies while dragging, so iframes can't swallow dragover.
									'z-index': dragging() ? 95 : 0,
									display: dragging() ? 'block' : 'none',
								}}
							/>
							<Show when={enableTabbar}>
								<WrapTabHead
									draggable={true}
									data-uid={tabsetId}
									data-type="tabset"
									data-tabbar=""
									data-folded={
										state()?.isFolded ? '' : undefined
									}
									data-maximized={
										state()?.isMaximized ? '' : undefined
									}
									data-dx-hidden={
										state()?.isHidden ? '' : undefined
									}
									data-rotated={
										placement()?.isRotated ? '' : undefined
									}
									onDblClick={() =>
										layout.onTabbarDoubleClick(tabsetId)
									}
									onDragStart={(e) =>
										layout.onDragStart(e, {
											type: 'tabset',
											tabsetId,
										})
									}
									onDragEnd={() => layout.onDragEnd()}
									class={
										'hide-scrollbar ' +
										(props.tabHeadElementClass || '')
									}
									style={{
										...(props.tabHeadElementStyles as object),
										position: 'absolute',
										'z-index': 99,
										...position(placement()?.rect),
										'transform-origin': '0 0',
										...(placement()?.isRotated
											? { transform: 'rotate(90deg)' }
											: {}),
										...(hasToolbar()
											? { 'padding-right': '64px' }
											: {}),
										cursor: 'pointer',
									}}
								>
									<For each={state()?.tabIds ?? []}>
										{(tabId) => (
											<WrapTabLabel
												data-uid={tabId}
												data-type="tab"
												draggable={true}
												onDragStart={(e) =>
													layout.onDragStart(e, {
														type: 'tab',
														tabId,
													})
												}
												onDragEnd={() =>
													layout.onDragEnd()
												}
												active={
													snapshot().tabs.get(tabId)
														?.isActive ?? false
												}
												class={
													'hide-scrollbar ' +
													(props.tabLabelElementClass ||
														'')
												}
												style={{
													cursor: 'pointer',
													...(props.tabLabelElementStyles as object),
												}}
												onClick={() =>
													layout.selectTab(tabId)
												}
											>
												{title(tabId)}
												<Show
													when={
														entry(tabId)?.[2]
															?.closable
													}
												>
													<button
														type="button"
														class="DefaultTabClose"
														aria-label={`Close ${tabId}`}
														draggable={false}
														onMouseDown={(e) =>
															e.stopPropagation()
														}
														onClick={(e) => {
															e.stopPropagation()
															props.onTabClose?.(
																tabId
															)
														}}
													>
														×
													</button>
												</Show>
											</WrapTabLabel>
										)}
									</For>
									<Show when={hasToolbar()}>
										<TabsetToolbar
											maximized={!!state()?.isMaximized}
											folded={!!state()?.isFolded}
											rotated={!!placement()?.isRotated}
											rowIsHorizontal={
												state()?.parentDirection ===
												'horizontal'
											}
											showMaximize={showMaximize()}
											showFold={showFold()}
											onToggleMaximize={() =>
												layout.toggleMaximize(tabsetId)
											}
											onToggleFold={() =>
												layout.toggleFold(tabsetId)
											}
										/>
									</Show>
								</WrapTabHead>
							</Show>
						</>
					)
				}}
			</For>

			<For each={props.tabs}>
				{([tabId, content]) => {
					const tab = () => snapshot().tabs.get(tabId)
					const body = () => {
						const tabsetRect =
							tab() &&
							snapshot().rects.tabsets.get(tab()!.tabsetId)
						return (
							tabsetRect &&
							getTabContentRect(
								tabsetRect,
								enableTabbar ? tabHeadHeight : 0
							)
						)
					}
					const visible = () =>
						!!tab()?.isVisible && (body()?.height ?? 0) > 0
					return (
						<WrapTabBody
							data-uid={tabId}
							draggable={false}
							data-dx-hidden={visible() ? undefined : ''}
							class={
								'hide-scrollbar ' +
								(props.tabBodyElementClass || '')
							}
							style={{
								position: 'absolute',
								'z-index': 90,
								'overscroll-behavior': 'contain',
								...(props.tabBodyElementStyles as object),
								...position(body()),
							}}
						>
							{content}
						</WrapTabBody>
					)
				}}
			</For>

			<For each={splitterIds()}>
				{(splitterId) => {
					const splitter = () => snapshot().splitters.get(splitterId)
					return (
						<SliderElement
							data-uid={splitterId}
							data-dx-hidden={
								splitter()?.isHidden ? '' : undefined
							}
							direction={splitter()?.direction === 'vertical'}
							onPointerDown={(e) =>
								layout.onSliderPointerDown(e, splitterId)
							}
							class={
								'hide-scrollbar ' +
								(props.sliderElementClass || '')
							}
							style={{
								...position(
									snapshot().rects.splitters.get(splitterId)
								),
								cursor:
									splitter()?.direction === 'vertical'
										? 'ns-resize'
										: 'ew-resize',
								...(splitter()?.isLocked
									? { 'pointer-events': 'none' }
									: {}),
								...(props.sliderElementStyles as object),
							}}
						/>
					)
				}}
			</For>

			<HoverElement
				class={'hide-scrollbar ' + (props.hoverElementClass || '')}
				style={{
					...(props.hoverElementStyles as object),
					...position(snapshot().drag?.indicator ?? undefined),
					display: snapshot().drag?.indicator ? 'block' : 'none',
					'z-index': 100,
				}}
			/>

			<For each={SIDES}>
				{(side) => (
					<RootSplitterHoverEl
						data-uid={rootId}
						data-area={side}
						class={
							'hide-scrollbar ' +
							(props.RootSplitterHoverElClass || '')
						}
						style={{
							...(props.RootSplitterHoverElStyles as object),
							...(snapshot().drag &&
							snapshot().drag!.source.type !== 'splitter'
								? { display: 'block', 'z-index': 99 }
								: {}),
						}}
						area={side}
						size={{ h: '25%', w: '8px' }}
					/>
				)}
			</For>
		</div>
	)
}
