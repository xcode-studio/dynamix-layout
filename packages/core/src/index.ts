import { DynamixLayoutCore } from './app/dynamix'

/**
 * Self-executing function to log a message to the console when the module is imported.
 * This provides information and a link back to the project for developers.
 */
declare const __LICENSE__: string
;(() => {
	if (typeof window === 'undefined') return

	const titleStyle = `color: #03A9F4; font-weight: bold; line-height: 1.2;`
	const textStyle = 'color: #E0E0E0; font-size: 12px;'
	const linkStyle = 'color: #42a5f5; font-size: 12px;'
	const licenseStyle = 'color: #9E9E9E; font-size: 10px;'

	const asciiArt = `
██████╗ ██╗   ██╗ ███╗   ██╗  █████╗  ███╗   ███╗ ██████╗ ██╗  ██╗
██╔══██╗╚██╗ ██╔╝ ████╗  ██║ ██╔══██╗ ████╗ ████║ ╚═██╔═╝ ╚██╗██╔╝
██║  ██║ ╚████╔╝  ██╔██╗ ██║ ███████║ ██╔████╔██║   ██║    ╚███╔╝ 
██║  ██║  ╚██╔╝   ██║╚██╗██║ ██╔══██║ ██║╚██╔╝██║   ██║    ██╔██╗ 
██████╔╝   ██║    ██║ ╚████║ ██║  ██║ ██║ ╚═╝ ██║ ██████╗ ██╔╝ ██╗
╚═════╝    ╚═╝    ╚═╝  ╚═══╝ ╚═╝  ╚═╝ ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝
██╗       █████╗  ██╗   ██╗  ██████╗  ██╗   ██╗████████╗
██║      ██╔══██╗ ╚██╗ ██╔╝ ██╔═══██╗ ██║   ██║╚══██╔══╝
██║      ███████║  ╚████╔╝  ██║   ██║ ██║   ██║   ██║   
██║      ██╔══██║   ╚██╔╝   ██║   ██║ ██║   ██║   ██║       
███████╗ ██║  ██║    ██║    ╚██████╔╝ ╚█████╔╝    ██║   
╚══════╝ ╚═╝  ╚═╝    ╚═╝     ╚═════╝   ╚════╝     ╚═╝   
    `

	console.groupCollapsed(
		`%cDYNAMIX LAYOUT (click to expand)`,
		'color: #03A9F4; font-weight: bold; font-size: 14px;'
	)
	console.log(`%c${asciiArt}`, titleStyle)
	console.log('%c A powerful, dynamic layout system 🚀', textStyle)
	console.log(
		'%c ⚡ For docs and more info, \n ⚡ visit: https://github.com/akash-aman/dynamix-layout',
		linkStyle
	)
	console.log(`%c${__LICENSE__}`, licenseStyle)
	console.groupEnd()

	if (typeof window !== 'undefined') {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(window as any).__DYNAMIX_LAYOUT__ = {
			__LICENSE__: __LICENSE__,
			__LAYOUT__: DynamixLayoutCore,
		}
	}
})()

export * from './app/index'
export type * from './type'
export * from './v2'
