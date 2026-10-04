import { useEffect, useRef } from 'react'
import { Terminal as Xterm } from 'xterm'
import 'xterm/css/xterm.css'

export function Terminal() {
	const termRef = useRef<HTMLDivElement>(null)
	const isInitialized = useRef(false)
	const history = useRef<string[]>([])
	const historyIndex = useRef<number>(-1)

	useEffect(() => {
		if (termRef.current && !isInitialized.current) {
			const term = new Xterm({
				theme: {
					background: '#f8fafc',
					foreground: '#22223b',
					cursor: '#3a86ff',
					black: '#22223b',
					red: '#ff006e',
					green: '#06d6a0',
					yellow: '#ffd166',
					blue: '#3a86ff',
					magenta: '#8338ec',
					cyan: '#00b4d8',
					white: '#f8fafc',
					brightBlack: '#adb5bd',
					brightRed: '#ff006e',
					brightGreen: '#06d6a0',
					brightYellow: '#ffd166',
					brightBlue: '#3a86ff',
					brightMagenta: '#8338ec',
					brightCyan: '#00b4d8',
					brightWhite: '#ffffff',
				},
				cursorBlink: true,
				fontFamily:
					'Menlo, Monaco, "Fira Mono", "Liberation Mono", "Consolas", monospace',
				fontSize: 14,
				fontWeight: 'bold',
				allowProposedApi: true,
			})
			term.open(termRef.current)
			const prompt = () => term.write('\x1b[1;32m$ \x1b[0m')
			let input = ''

			// Dummy output for pnpm run vite and pnpm run dev
			term.write('\x1b[1;36m❯ pnpm run dev\x1b[0m\r\n\r\n')
			term.write('\x1b[1;35m> shadcn@0.0.0 dev \x1b[0m\r\n')
			term.write('\x1b[1;35m> vite\x1b[0m\r\n\r\n')
			term.write(
				'\x1b[1;33mPort 5173 is in use, trying another one...\x1b[0m\r\n\r\n'
			)
			term.write(
				'\x1b[1;32m  VITE v7.0.3  ready in 347 ms\x1b[0m\r\n\r\n'
			)
			term.write(
				'\x1b[1;36m  ➜  Local:   http://localhost:5174/\x1b[0m\r\n'
			)
			term.write(
				'\x1b[1;36m  ➜  Network: use --host to expose\x1b[0m\r\n'
			)
			term.write(
				'\x1b[1;36m  ➜  press h + enter to show help\x1b[0m\r\n\r\n\r\n\r\n'
			)

			prompt()

			term.onKey((e) => {
				const { key, domEvent } = e

				// Ctrl+L: clear terminal
				if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'l') {
					term.clear()
					prompt()
					input = ''
					return
				}

				// Ctrl+C: cancel input
				if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') {
					term.write('^C\r\n')
					prompt()
					input = ''
					return
				}

				// Arrow Up: previous command
				if (domEvent.key === 'ArrowUp') {
					if (history.current.length > 0) {
						if (historyIndex.current < history.current.length - 1) {
							historyIndex.current++
						}
						const cmd =
							history.current[
								history.current.length -
									1 -
									historyIndex.current
							]
						// Clear current input
						while (input.length > 0) {
							term.write('\b \b')
							input = input.slice(0, -1)
						}
						term.write(cmd)
						input = cmd
					}
					return
				}

				// Arrow Down: next command
				if (domEvent.key === 'ArrowDown') {
					if (
						history.current.length > 0 &&
						historyIndex.current > 0
					) {
						historyIndex.current--
						const cmd =
							history.current[
								history.current.length -
									1 -
									historyIndex.current
							]
						while (input.length > 0) {
							term.write('\b \b')
							input = input.slice(0, -1)
						}
						term.write(cmd)
						input = cmd
					} else if (historyIndex.current === 0) {
						historyIndex.current--
						while (input.length > 0) {
							term.write('\b \b')
							input = input.slice(0, -1)
						}
						input = ''
					}
					return
				}

				// Tab: autocomplete (stub)
				if (domEvent.key === 'Tab') {
					term.write('\x1b[1;34m<tab-autocomplete>\x1b[0m')
					return
				}

				if (domEvent.key === 'Enter') {
					term.write(
						'\r\n\x1b[1;33mYou typed:\x1b[0m ' + input + '\r\n'
					)
					if (input.trim()) {
						history.current.push(input)
					}
					historyIndex.current = -1
					prompt()
					input = ''
				} else if (domEvent.key === 'Backspace') {
					if (input.length > 0) {
						term.write('\b \b')
						input = input.slice(0, -1)
					}
				} else if (
					domEvent.key.length === 1 &&
					!domEvent.ctrlKey &&
					!domEvent.metaKey
				) {
					term.write(key)
					input += key
				}
			})

			isInitialized.current = true

			// xterm registers global listeners; dispose it so an unmounted
			// terminal (and the layout around it) can be garbage collected.
			return () => {
				term.dispose()
				isInitialized.current = false
			}
		}
	}, [])

	return (
		<div
			ref={termRef}
			className="w-full h-full p-0 hide-scrollbar rounded-b-lg border-2 shadow-lg"
			style={{
				background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
				overflow: 'hidden',
			}}
		/>
	)
}
