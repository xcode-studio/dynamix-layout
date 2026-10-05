import {
	DynamixLayoutCore,
	NodeOptions,
	getTabbarPlacement,
} from '@dynamix-layout/core'
import { createMemo, For, ParentComponent } from 'solid-js'
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
import { LayoutProps, TabEntry, TabInput, TabOutput } from '../types'

export const getTabOutput = (input: TabInput): TabOutput => {
	const keys: string[] = []
	const maps: Map<string, TabEntry> = new Map<string, TabEntry>()
	const name: Map<string, string> = new Map<string, string>()

	for (const [label, node] of input) {
		const key = crypto.randomUUID()
		keys.push(label)
		maps.set(label, {
			uqid: key,
			name: label,
			node,
		} as TabEntry)
		name.set(label, key)
	}

	return {
		keys,
		maps,
		name,
	}
}

export const DynamixLayout: ParentComponent<LayoutProps> = (props) => {
	const tabOutput = createMemo(() => getTabOutput(props.tabs))
	let resolvedRef: HTMLDivElement | undefined

	const dimensions = () => {
		const el = resolvedRef
		if (!el) return { w: 0, h: 0, x: 0, y: 0 }
		const rect = el.getBoundingClientRect()
		const pad = props.pad || { t: 0, b: 0, l: 0, r: 0 }
		return {
			w: rect.width - (pad.l + pad.r),
			h: rect.height - (pad.t + pad.b),
			x: rect.left + pad.l,
			y: rect.top + pad.t,
		}
	}

	/* eslint-disable solid/reactivity */
	const {
		tabsetsRef,
		slidersRef,
		sliders,
		tabsets,
		hoverElementRef,
		onDragEnd,
		onDragOver,
		onDragStart,
		onDragEnter,
		onDragLeave,

		onDrop,
		dragging,
		panelsRef,
		onPointerDown,
		handleNavbarDragOver,
		updateActiveTab,
		rootSplitHoverEl,
		handleRootSplit,
		tabsRef,
		isUpdating,
		toggleMaximize,
		toggleCollapse,
		onRootPointerDown,
		onTabbarDoubleClick,
	} = useDynamixLayout({
		tabOutput: tabOutput(),
		rootId: props.rootId || 'dynamix-layout-root',
		updateJSON: props.updateJSON,
		enableTabbar:
			props.enableTabbar === undefined ? true : props.enableTabbar,
		layoutTree: props.layoutTree,
		tabHeadHeight: props.tabHeadHeight || DynamixLayoutCore._minH,
		dimensions,
		sliderUpdateTimeout: props.sliderUpdateTimeout || 2,
		windowResizeTimeout: props.windowResizeTimeout || 2,
		bondWidth: props.bondWidth || DynamixLayoutCore._bond,
		minTabHeight: props.minTabHeight || DynamixLayoutCore._minH,
		minTabWidth: props.minTabWidth || DynamixLayoutCore._minW,
		disableSliderTimeout:
			props.disableSliderTimeout === undefined
				? true
				: props.disableSliderTimeout,
		disableResizeTimeout:
			props.disableResizeTimeout === undefined
				? true
				: props.disableResizeTimeout,
		hoverElementStyles: props.hoverElementStyles,
		keyboardShortcuts: props.keyboardShortcuts ?? true,
		enableDoubleClickMaximize: props.enableDoubleClickMaximize ?? true,
	})
	/* eslint-disable solid/reactivity */
	const WrapTabPanel = props.WrapTabPanel || DefaultWrapTabPanel
	const WrapTabHead = props.WrapTabHead || DefaultWrapTabHead
	const WrapTabLabel = props.WrapTabLabel || DefaultWrapTabLabel
	const WrapTabBody = props.WrapTabBody || DefaultWrapTabBody
	const SliderElement = props.SliderElement || DefaultSliderElement
	const HoverElement = props.HoverElement || DefaultHoverElement
	const TabsetToolbar = props.TabsetToolbar || DefaultTabsetToolbar
	const tabHeadHeight = props.tabHeadHeight || DynamixLayoutCore._minH
	const enableTabbar = props.enableTabbar ?? true
	const enableMaximize = props.enableMaximize ?? true
	// Folding needs the tab bar: a folded tabset is only its tab bar.
	const canFold = (props.enableCollapse ?? true) && enableTabbar

	return (
		<div
			id={props.rootId || 'dynamix-layout-root'}
			ref={resolvedRef}
			{...props}
			data-testid={props.rootId || 'dynamix-layout-root'}
			class={dragging() ? 'is-dragging' : ''}
			onPointerDown={onRootPointerDown}
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				...(props.style as object),
			}}
		>
			<For each={Array.from(tabsets().values())}>
				{(tabset) => {
					const placement = getTabbarPlacement(tabset, tabHeadHeight)
					const showMaximize =
						enableMaximize && !!tabset.nodMaximizable
					const showFold =
						canFold && !!tabset.nodFoldable && !tabset.nodMaxd
					const hasToolbar = showMaximize || showFold

					return (
						<>
							<WrapTabPanel
								ref={(el: HTMLDivElement) => {
									const id = tabset.uidNode
									if (el) panelsRef.set(id, el)
									else panelsRef.delete(id)
								}}
								onDragEnd={onDragEnd}
								onDragOver={onDragOver}
								onDragEnter={onDragEnter}
								onDragLeave={onDragLeave}
								onDrop={onDrop}
								data-uid={tabset.uidNode}
								data-type={tabset.typNode}
								class={
									'hide-scrollbar DefaultWrapTabPanel ' +
									(props.tabPanelElementClass || '')
								}
								style={{
									position: 'absolute',
									...(props.tabPanelElementStyles as object),
									width: `${tabset.nodDims.w}px`,
									height: `${tabset.nodDims.h}px`,
									left: `${tabset.nodDims.x}px`,
									top: `${tabset.nodDims.y}px`,
									'background-color': 'transparent',
								}}
							/>

							<WrapTabHead
								draggable={!isUpdating()}
								data-uid={tabset.uidNode}
								data-type={'tabset'}
								data-tabbar=""
								data-folded={tabset.nodFold ? '' : undefined}
								data-maximized={tabset.nodMaxd ? '' : undefined}
								data-dx-hidden={
									tabset.nodHidden ? '' : undefined
								}
								data-rotated={
									placement.rotated ? '' : undefined
								}
								onDblClick={onTabbarDoubleClick}
								onDragOver={handleNavbarDragOver}
								onDragStart={onDragStart}
								onDragEnd={onDragEnd}
								onDragEnter={onDragEnter}
								onDragLeave={onDragLeave}
								onDrop={onDrop}
								ref={(el: HTMLDivElement) => {
									const id = tabset.uidNode
									if (el) tabsetsRef.set(id, el)
									else tabsetsRef.delete(id)
								}}
								class={
									'hide-scrollbar ' +
									(props.tabHeadElementClass || '')
								}
								style={{
									...(props.tabHeadElementStyles as object),
									position: 'absolute',
									'z-index': 99,
									width: `${placement.rect.w}px`,
									height: `${placement.rect.h}px`,
									left: `${placement.rect.x}px`,
									top: `${placement.rect.y}px`,
									'transform-origin': '0 0',
									// Only add keys when needed so the tab bar
									// component keeps its own values.
									...(placement.rotated
										? { transform: 'rotate(90deg)' }
										: {}),
									...(hasToolbar
										? { 'padding-right': '64px' }
										: {}),
									cursor: isUpdating() ? 'wait' : 'pointer',
								}}
							>
								<For each={tabset.nodKids}>
									{(tab: NodeOptions) => (
										<WrapTabLabel
											data-uid={tab.uidNode}
											data-type={'tab'}
											onDragStart={onDragStart}
											onDragEnd={onDragEnd}
											draggable={!isUpdating()}
											active={tab.nodOpen ? true : false}
											class={
												'hide-scrollbar ' +
												(props.tabLabelElementClass ||
													'')
											}
											style={{
												cursor: isUpdating()
													? 'wait'
													: 'pointer',
												...(props.tabLabelElementStyles as object),
											}}
											onClick={updateActiveTab}
										>
											{(props.tabNames &&
												props.tabNames.get(
													tab.nodName
												)) ||
												tab.nodName}
										</WrapTabLabel>
									)}
								</For>
								{hasToolbar && (
									<TabsetToolbar
										maximized={!!tabset.nodMaxd}
										folded={!!tabset.nodFold}
										rotated={placement.rotated}
										rowIsHorizontal={
											tabset.nodeDir === false
										}
										showMaximize={showMaximize}
										showFold={showFold}
										onToggleMaximize={() =>
											toggleMaximize(tabset.uidNode)
										}
										onToggleFold={() =>
											toggleCollapse(tabset.uidNode)
										}
									/>
								)}
							</WrapTabHead>
						</>
					)
				}}
			</For>

			<For each={tabOutput().keys}>
				{(key) => {
					const tabId = tabOutput().maps.get(key)?.uqid
					return (
						<WrapTabBody
							id={tabId}
							draggable={false}
							data-uid={tabId}
							class={
								'hide-scrollbar ' +
								(props.tabBodyElementClass || '')
							}
							style={{
								position: 'absolute',
								'z-index': 90,
								'overscroll-behavior': 'contain',
								...(props.tabBodyElementStyles as object),
							}}
							ref={(el: HTMLDivElement) => {
								if (tabId) {
									if (el) tabsRef.set(tabId, el)
									else tabsRef.delete(tabId)
								}
							}}
						>
							{tabOutput().maps.get(key)?.node || (
								<div class="flex items-center justify-center h-full">
									<span class="text-gray-500">
										No content
									</span>
								</div>
							)}
						</WrapTabBody>
					)
				}}
			</For>

			<For each={Array.from(sliders().values())}>
				{(slider) => (
					<SliderElement
						id={slider.uidNode}
						data-uid={slider.uidNode}
						data-dx-hidden={slider.nodHidden ? '' : undefined}
						direction={slider.nodeDir}
						onPointerDown={onPointerDown}
						class={
							'hide-scrollbar ' + (props.sliderElementClass || '')
						}
						ref={(el: HTMLDivElement) => {
							const id = slider.uidNode
							if (el) slidersRef.set(id, el)
							else slidersRef.delete(id)
						}}
						style={{
							width: `${slider.nodDims.w}px`,
							height: `${slider.nodDims.h}px`,
							left: `${slider.nodDims.x}px`,
							top: `${slider.nodDims.y}px`,
							cursor: slider.nodeDir ? 'ns-resize' : 'ew-resize',
							...(slider.nodLocked
								? { 'pointer-events': 'none' }
								: {}),
							...(props.sliderElementStyles as object),
						}}
					/>
				)}
			</For>

			<HoverElement
				class={'hide-scrollbar ' + (props.hoverElementClass || '')}
				style={{ ...(props.hoverElementStyles as object) }}
				ref={(el) => (hoverElementRef.current = el)}
			/>

			<For each={['left', 'right', 'top', 'bottom'] as const}>
				{(area, index) => (
					<RootSplitterHoverEl
						onDragOver={handleRootSplit}
						onDragEnd={onDragEnd}
						onDragEnter={onDragEnter}
						onDragLeave={onDragLeave}
						onDrop={onDrop}
						data-uid={props.rootId || 'dynamix-layout-root'}
						data-area={area}
						class={
							'hide-scrollbar ' +
							(props.RootSplitterHoverElClass || '')
						}
						ref={(el: HTMLDivElement) => {
							if (el) rootSplitHoverEl[index()] = el
						}}
						style={{
							...(props.RootSplitterHoverElStyles as object),
						}}
						area={area}
						size={{ h: '25%', w: '8px' }}
					/>
				)}
			</For>
		</div>
	)
}
