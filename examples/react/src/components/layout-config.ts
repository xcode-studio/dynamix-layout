import type { LayoutComponents, LayoutSlot } from '@dynamix-layout/react'
import { Splitter, Tab } from './wrapper'

export const components: Partial<LayoutComponents> = { Tab, Splitter }

export const classNames: Partial<Record<LayoutSlot, string>> = {
	tabBar: 'bg-gray-200 text-muted-foreground rounded-t-sm',
	tabContent: 'rounded-b-2 border border-b-2 shadow-lg bg-background',
}
