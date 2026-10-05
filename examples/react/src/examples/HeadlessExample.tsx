import {
	DynamixLayoutProvider,
	useDynamixLayout,
	useSplitter,
	useTab,
	useTabset,
	type HeadlessTabItem,
} from '@dynamix-layout/react'

const tabs: HeadlessTabItem[] = [
	{ id: 'one', title: 'One' },
	{ id: 'two', title: 'Two' },
	{ id: 'three', title: 'Three' },
]

function Tab({ tabId }: { tabId: string }) {
	const { getTabProps, isActive, item } = useTab(tabId)
	return (
		<button
			{...getTabProps({
				style: {
					border: 0,
					padding: '4px 10px',
					borderRadius: 6,
					background: isActive ? '#111' : 'transparent',
					color: isActive ? '#fff' : '#333',
				},
			})}
		>
			{item?.title}
		</button>
	)
}

function Tabset({ tabsetId }: { tabsetId: string }) {
	const { tabset, getPanelProps, getTabBarProps } = useTabset(tabsetId)
	if (!tabset) return null
	return (
		<>
			<div
				{...getPanelProps({
					style: { background: '#f4f4f5', borderRadius: 8 },
				})}
			/>
			<div
				{...getTabBarProps({
					style: {
						display: 'flex',
						gap: 4,
						padding: 6,
						alignItems: 'center',
					},
				})}
			>
				{tabset.tabIds.map((id) => (
					<Tab key={id} tabId={id} />
				))}
			</div>
		</>
	)
}

function Content({ tabId }: { tabId: string }) {
	const { getTabContentProps, item } = useTab(tabId)
	return (
		<div {...getTabContentProps({ style: { padding: 16 } })}>
			Content of <b>{item?.title}</b>
		</div>
	)
}

function Splitter({ splitterId }: { splitterId: string }) {
	const { getSplitterProps, isDragging } = useSplitter(splitterId)
	return (
		<div
			{...getSplitterProps({
				style: { background: isDragging ? '#6366f1' : '#e4e4e7' },
			})}
		/>
	)
}

/** Level 2: no default components or styles, only hooks and prop getters. */
export default function HeadlessExample() {
	const {
		controller,
		getRootProps,
		tabsets,
		splitters,
		tabIds,
		dropIndicator,
	} = useDynamixLayout({
		tabs,
		tabBarHeight: 36,
		splitterSize: 6,
		padding: 8,
	})
	return (
		<DynamixLayoutProvider controller={controller}>
			<div
				{...getRootProps({
					style: {
						position: 'relative',
						width: '100%',
						height: '100%',
					},
				})}
			>
				{tabsets.map((tabset) => (
					<Tabset key={tabset.id} tabsetId={tabset.id} />
				))}
				{tabIds.map((id) => (
					<Content key={id} tabId={id} />
				))}
				{splitters.map((splitter) => (
					<Splitter key={splitter.id} splitterId={splitter.id} />
				))}
				{dropIndicator && (
					<div
						{...dropIndicator.props}
						style={{
							...dropIndicator.props.style,
							background: 'rgba(99,102,241,.25)',
							outline: '2px solid #6366f1',
						}}
					/>
				)}
			</div>
		</DynamixLayoutProvider>
	)
}
