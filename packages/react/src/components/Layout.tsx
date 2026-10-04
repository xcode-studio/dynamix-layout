import React, {
	ForwardRefExoticComponent,
	RefAttributes,
	useCallback,
	useMemo,
	useRef,
} from 'react'
import { useDynamixLayout } from '../hooks/useLayout'
import {
	DynamixLayoutCore,
	NodeOptions,
	getTabbarPlacement,
} from '@dynamix-layout/core'
import { LayoutProps, TabEntry, TabInput, TabOutput } from '../types'
import {
	DefaultHoverElement,
	DefaultWrapTabLabel,
	DefaultWrapTabPanel,
	DefaultWrapTabHead,
	DefaultSliderElement,
	DefaultWrapTabBody,
	DefaultTabsetToolbar,
	RootSplitterHoverEl,
} from './Default'
import './layout.css'

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

export const DynamixLayout: ForwardRefExoticComponent<
	LayoutProps & RefAttributes<HTMLDivElement>
> = React.forwardRef(
	(
		{
			tabs,
			bondWidth = DynamixLayoutCore._bond,
			minTabHeight = DynamixLayoutCore._minH,
			minTabWidth = DynamixLayoutCore._minW,
			updateJSON,
			sliderUpdateTimeout = 2,
			windowResizeTimeout = 2,
			disableSliderTimeout = true,
			disableResizeTimeout = true,
			HoverElement = DefaultHoverElement,
			enableTabbar = true,
			WrapTabLabel = DefaultWrapTabLabel,
			WrapTabPanel = DefaultWrapTabPanel,
			WrapTabHead = DefaultWrapTabHead,
			WrapTabBody = DefaultWrapTabBody,
			SliderElement = DefaultSliderElement,
			tabHeadHeight = DynamixLayoutCore._minH,
			tabNames = new Map(),
			layoutTree,
			pad = {
				t: 0,
				b: 0,
				l: 0,
				r: 0,
			},
			rootId = 'dynamix-layout-root',
			hoverElementStyles,
			sliderElementStyles,
			tabPanelElementStyles,
			tabBodyElementStyles,
			tabHeadElementStyles,
			tabLabelElementStyles,
			RootSplitterHoverElStyles,
			hoverElementClass,
			sliderElementClass,
			tabPanelElementClass,
			tabBodyElementClass,
			tabHeadElementClass,
			tabLabelElementClass,
			RootSplitterHoverElClass,
			enableMaximize = true,
			enableCollapse = true,
			enableDoubleClickMaximize = true,
			keyboardShortcuts = true,
			TabsetToolbar = DefaultTabsetToolbar,
			...props
		}: LayoutProps,
		ref?
	) => {
		const tabOutput = useMemo(() => getTabOutput(tabs), [tabs])
		const ownRef = useRef<HTMLDivElement>(null)
		const resolvedRef = typeof ref === 'function' ? ownRef : ref || ownRef

		const dimensions = useCallback(() => {
			const el = resolvedRef.current
			if (!el) return { w: 0, h: 0, x: 0, y: 0 }
			const rect = el.getBoundingClientRect()
			return {
				w: rect.width - (pad.l + pad.r),
				h: rect.height - (pad.t + pad.b),
				x: rect.left + pad.l,
				y: rect.top + pad.t,
			}
		}, [resolvedRef, pad.l, pad.r, pad.t, pad.b])

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
			tabOutput,
			rootId,
			updateJSON,
			enableTabbar,
			layoutTree,
			tabHeadHeight,
			dimensions,
			sliderUpdateTimeout,
			windowResizeTimeout,
			bondWidth,
			minTabHeight,
			minTabWidth,
			disableSliderTimeout,
			disableResizeTimeout,
			hoverElementStyles,
			keyboardShortcuts,
			enableDoubleClickMaximize,
		})

		// Folding needs the tab bar: a folded tabset is only its tab bar.
		const canFold = enableCollapse && enableTabbar

		return (
			<div
				id={rootId}
				ref={resolvedRef}
				{...props}
				data-testid={rootId}
				className={dragging ? 'is-dragging' : ''}
				onPointerDownCapture={onRootPointerDown}
				style={{
					position: 'relative',
					width: '100%',
					height: '100%',
					overflow: 'hidden',
					...props.style,
				}}
			>
				{enableTabbar &&
					tabsets &&
					Array.from(tabsets.values()).map((tabset) => {
						const placement = getTabbarPlacement(
							tabset,
							tabHeadHeight
						)
						const showMaximize =
							enableMaximize && !!tabset.nodMaximizable
						const showFold =
							canFold && !!tabset.nodFoldable && !tabset.nodMaxd
						const hasToolbar = showMaximize || showFold

						return (
							<React.Fragment key={tabset.uidNode}>
								<WrapTabPanel
									ref={(el) => {
										const id = tabset.uidNode
										if (el) panelsRef.current.set(id, el)
										else panelsRef.current.delete(id)
									}}
									onDragEnd={onDragEnd}
									onDragOver={onDragOver}
									onDragEnter={onDragEnter}
									onDragLeave={onDragLeave}
									onDrop={onDrop}
									data-uid={tabset.uidNode}
									data-type={tabset.typNode}
									className={
										'hide-scrollbar DefaultWrapTabPanel ' +
										(tabPanelElementClass || '')
									}
									style={{
										position: 'absolute',
										...tabPanelElementStyles,
										width: `${tabset.nodDims.w}px`,
										height: `${tabset.nodDims.h}px`,
										left: `${tabset.nodDims.x}px`,
										top: `${tabset.nodDims.y}px`,
										backgroundColor: 'transparent',
									}}
								/>

								<WrapTabHead
									draggable={!isUpdating}
									data-uid={tabset.uidNode}
									data-type={'tabset'}
									data-tabbar=""
									data-folded={
										tabset.nodFold ? '' : undefined
									}
									data-maximized={
										tabset.nodMaxd ? '' : undefined
									}
									data-dx-hidden={
										tabset.nodHidden ? '' : undefined
									}
									data-rotated={
										placement.rotated ? '' : undefined
									}
									onDoubleClick={onTabbarDoubleClick}
									onDragOver={handleNavbarDragOver}
									onDragStart={onDragStart}
									onDragEnd={onDragEnd}
									onDragEnter={onDragEnter}
									onDragLeave={onDragLeave}
									onDrop={onDrop}
									ref={(el) => {
										const id = tabset.uidNode
										if (el) tabsetsRef.current.set(id, el)
										else tabsetsRef.current.delete(id)
									}}
									className={
										'hide-scrollbar ' +
										(tabHeadElementClass || '')
									}
									style={{
										...tabHeadElementStyles,
										position: 'absolute',
										zIndex: 99,
										width: `${placement.rect.w}px`,
										height: `${placement.rect.h}px`,
										left: `${placement.rect.x}px`,
										top: `${placement.rect.y}px`,
										transformOrigin: '0 0',
										// Only add keys when needed: an explicit `undefined`
										// would wipe the tab bar component's own value.
										...(placement.rotated
											? { transform: 'rotate(90deg)' }
											: {}),
										...(hasToolbar
											? { paddingRight: '64px' }
											: {}),
										cursor: isUpdating ? 'wait' : 'pointer',
									}}
								>
									{tabset.nodKids &&
										tabset.nodKids.map(
											(tab: NodeOptions) => (
												<WrapTabLabel
													key={tab.uidNode}
													data-uid={tab.uidNode}
													data-type={'tab'}
													onDragStart={onDragStart}
													onDragEnd={onDragEnd}
													draggable={!isUpdating}
													active={
														tab.nodOpen as boolean
													}
													className={
														'hide-scrollbar ' +
														(tabLabelElementClass ||
															'')
													}
													style={{
														cursor: isUpdating
															? 'wait'
															: 'pointer',
														...tabLabelElementStyles,
													}}
													onClick={updateActiveTab}
												>
													{tabNames.get(
														tab.nodName
													) || tab.nodName}
												</WrapTabLabel>
											)
										)}
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
							</React.Fragment>
						)
					})}

				{tabOutput.keys.map((key) => {
					const tabId = tabOutput.maps.get(key)?.uqid
					return (
						<WrapTabBody
							key={key}
							id={tabId}
							draggable={false}
							data-uid={tabId}
							className={
								'hide-scrollbar ' + (tabBodyElementClass || '')
							}
							style={{
								position: 'absolute',
								zIndex: 90,
								overscrollBehavior: 'contain',
								...tabBodyElementStyles,
							}}
							ref={(el) => {
								if (tabId) {
									if (el) tabsRef.current.set(tabId, el)
									else tabsRef.current.delete(tabId)
								}
							}}
						>
							{tabOutput.maps.get(key)?.node || (
								<div className="flex items-center justify-center h-full">
									<span className="text-gray-500">
										No content
									</span>
								</div>
							)}
						</WrapTabBody>
					)
				})}

				{sliders &&
					Array.from(sliders.values()).map((slider) => (
						<SliderElement
							key={slider.uidNode}
							id={slider.uidNode}
							data-uid={slider.uidNode}
							data-dx-hidden={slider.nodHidden ? '' : undefined}
							direction={slider.nodeDir}
							onPointerDown={onPointerDown}
							className={
								'hide-scrollbar ' + (sliderElementClass || '')
							}
							ref={(el) => {
								const id = slider.uidNode
								if (el) slidersRef.current.set(id, el)
								else slidersRef.current.delete(id)
							}}
							style={{
								width: `${slider.nodDims.w}px`,
								height: `${slider.nodDims.h}px`,
								left: `${slider.nodDims.x}px`,
								top: `${slider.nodDims.y}px`,
								cursor: slider.nodeDir
									? 'ns-resize'
									: 'ew-resize',
								...(slider.nodLocked
									? { pointerEvents: 'none' as const }
									: {}),
								...sliderElementStyles,
							}}
						/>
					))}

				<HoverElement
					className={'hide-scrollbar ' + (hoverElementClass || '')}
					style={{ ...hoverElementStyles }}
					ref={hoverElementRef}
				/>

				{(['left', 'right', 'top', 'bottom'] as const).map(
					(area, index) => (
						<RootSplitterHoverEl
							onDragOver={handleRootSplit}
							onDragEnd={onDragEnd}
							onDragEnter={onDragEnter}
							onDragLeave={onDragLeave}
							onDrop={onDrop}
							data-uid={rootId}
							data-area={area}
							className={
								'hide-scrollbar ' +
								(RootSplitterHoverElClass || '')
							}
							ref={(el: HTMLDivElement) => {
								if (el) rootSplitHoverEl.current[index] = el
							}}
							style={{ ...RootSplitterHoverElStyles }}
							key={area}
							area={area}
							size={{ h: '25%', w: '8px' }}
						/>
					)
				)}
			</div>
		)
	}
)

DynamixLayout.displayName = 'DynamixLayout'
