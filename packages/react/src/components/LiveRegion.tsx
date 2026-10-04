import { useEffect, useState, type ReactElement } from 'react'
import { useLayoutContext } from '../context/layout-context'

/** Polite live region for screen-reader announcements (keyboard move mode). */
export function LiveRegion(): ReactElement {
	const { core } = useLayoutContext('LiveRegion')
	const [message, setMessage] = useState('')
	useEffect(() => core.onAnnounce(setMessage), [core])
	return (
		<div
			id={core.ids.live}
			className="dx-visually-hidden"
			role="status"
			aria-live="polite"
			aria-atomic="true"
		>
			{message}
		</div>
	)
}
