import Editor from './components/Editor'
import { Terminal } from './components/Terminal'
import {
	DynamixLayout,
	type LayoutTreeV1,
	type TabItem,
} from '@dynamix-layout/react'
import { IframePreview } from './components/IframePreview'
import '@dynamix-layout/react/styles.css'
import './App.css'

import { classNames, components } from './components/layout-config'
import { Slider } from './components/ui/slider'
import { cn } from './lib/utils'
import { Card } from './components/ui/card'
import { useState } from 'react'

const dummyTsCode = `
// TypeScript Dummy Code Example
type User = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
};

const users: User[] = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: \`User\${i + 1}\`,
  email: \`user\${i + 1}@example.com\`,
  isActive: i % 2 === 0,
}));

function getActiveUsers(users: User[]): User[] {
  return users.filter(u => u.isActive);
}

function printUsers(users: User[]): void {
  users.forEach(u => {
	console.log(\`ID: \${u.id}, Name: \${u.name}, Email: \${u.email}, Active: \${u.isActive}\`);
  });
}

printUsers(getActiveUsers(users));
`

const dummyHtmlCode = `
<!-- Large Dummy HTML Example -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Dummy HTML</title>
  <style>
	body { font-family: Arial, sans-serif; background: #f9f9f9; }
	.container { max-width: 800px; margin: 2rem auto; padding: 2rem; background: #fff; border-radius: 8px; }
	.item { margin-bottom: 1rem; padding: 1rem; border: 1px solid #eee; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
	<h1>Dummy HTML Content</h1>
	<ul>
	  ${Array.from({ length: 50 }, (_, i) => `<li class="item">Item ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>`).join('\n')}
	</ul>
  </div>
</body>
</html>
`

const dummyCssCode = `
/* Large Dummy CSS Example */
body {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  color: #333;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.container {
  margin: 40px auto;
  max-width: 900px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  padding: 32px;
}
${Array.from({ length: 30 }, (_, i) => `.box${i + 1} { width: ${100 + i * 5}px; height: 40px; background: #${((Math.random() * 0xffffff) << 0).toString(16)}; margin-bottom: 8px; border-radius: 4px; }`).join('\n')}
`

/** A layout saved by v1; v2 migrates it on load. */
const savedV1Layout: LayoutTreeV1 = {
	typNode: 'row',
	nodPart: 100,
	nodName: 'dynamix-layout-root',
	uidNode: 'dynamix-layout-root',
	nodKids: [
		{
			typNode: 'row',
			nodPart: 95.13923576423574,
			nodName: '',
			uidNode: 'ad18bbee-2260-4172-bcbe-bead8ab919cf',
			nodOpen: 'preview',
			nodKids: [
				{
					typNode: 'row',
					nodPart: 253.63885510746962,
					nodName: '',
					uidNode: 'e4917519-3c9c-4ab9-adea-3a608fa8d45e',
					nodOpen: 'TS',
					nodKids: [
						{
							typNode: 'tabset',
							nodPart: 95.68121135993162,
							nodName: '',
							uidNode: '4c880a2e-df03-4183-9043-9d0cbc25d1a9',
							nodOpen: 'TS',
							nodKids: [
								{
									typNode: 'tab',
									nodPart: 100,
									nodName: 'TS',
									uidNode:
										'9c5b720f-63b4-480b-ba80-717000b4f6df',
								},
							],
						},
						{
							typNode: 'tabset',
							nodPart: 102.46562527840646,
							nodName: '',
							uidNode: '94a19aba-384a-4a4f-977a-2b3e5cf45453',
							nodOpen: 'preview',
							nodKids: [
								{
									typNode: 'tab',
									nodPart: 100,
									nodName: 'preview',
									uidNode:
										'84932e7f-9efe-4437-b27e-242db949b47d',
								},
							],
						},
						{
							typNode: 'row',
							nodPart: 101.85316336166194,
							nodName: '',
							uidNode: 'd06eb31a-ca54-4c17-ab58-ccc55c5a25e4',
							nodOpen: 'css',
							nodKids: [
								{
									typNode: 'tabset',
									nodPart: 100,
									nodName: '',
									uidNode:
										'f4fb69bf-d5ee-426c-b420-867ecc111f25',
									nodOpen: 'css',
									nodKids: [
										{
											typNode: 'tab',
											nodPart: 100,
											nodName: 'css',
											uidNode:
												'595562f3-908e-4002-b107-1f86fd2f621a',
										},
									],
								},
								{
									typNode: 'tabset',
									nodPart: 100,
									nodName: '',
									uidNode:
										'f6453908-1037-4d62-9a8d-cb8684ef311c',
									nodOpen: 'Html',
									nodKids: [
										{
											typNode: 'tab',
											nodPart: 100,
											nodName: 'Html',
											uidNode:
												'd19f9840-85b4-4a98-ba7d-dd2445c26500',
										},
									],
								},
							],
						},
					],
				},
				{
					typNode: 'tabset',
					nodPart: 97.75714553534206,
					nodName: '',
					uidNode: 'f2b421d9-b10d-41db-a410-df41f6b01e8a',
					nodOpen: 'terminal',
					nodKids: [
						{
							typNode: 'tab',
							nodPart: 100,
							nodName: 'terminal',
							uidNode: '0c9bce4c-2bc5-4f68-95e5-1db51d143b9c',
						},
					],
				},
			],
		},
	],
}

const tabs: TabItem[] = [
	{ id: 'TS', content: <Editor language="typescript" value={dummyTsCode} /> },
	{ id: 'Html', content: <Editor language="html" value={dummyHtmlCode} /> },
	{ id: 'preview', title: 'Preview', content: <IframePreview /> },
	{
		id: 'css',
		title: 'CSS',
		content: <Editor language="css" value={dummyCssCode} />,
	},
	{ id: 'terminal', title: 'Terminal', content: <Terminal /> },
]

function App() {
	const [minTabHeight, setMinTabHeight] = useState(40)
	const [minTabWidth, setMinTabWidth] = useState(40)
	const [bondWidth, setBondWidth] = useState(10)

	return (
		<div className="h-screen w-screen bg-background text-foreground relative overflow-auto">
			{
				<DynamixLayout
					defaultLayout={savedV1Layout}
					onLayoutChange={(layout, { reason }) =>
						console.log(reason, layout)
					}
					components={components}
					classNames={classNames}
					minPanelSize={{ width: minTabWidth, height: minTabHeight }}
					tabBarHeight={40}
					splitterSize={bondWidth}
					tabs={tabs}
				/>
			}
			<div className="absolute top-10 right-10 w-[300px] min-h-max z-[100] rounded-lg">
				<Card
					className={cn(
						'w-full min-h-max gap-3 py-8 px-3',
						'bg-background text-foreground border-2 border-border'
					)}
				>
					<div className="w-full flex flex-col items-center gap-2">
						<label className="text-xs font-medium mb-1 w-full text-center">
							Min Tab Height
						</label>
						<Slider
							value={[minTabHeight]}
							onValueChange={([val]) => setMinTabHeight(val)}
							min={1}
							max={800}
							step={1}
							className={cn('w-[60%]')}
						/>
					</div>
					<div className="w-full flex flex-col items-center gap-2">
						<label className="text-xs font-medium mb-1 w-full text-center">
							Bond Width
						</label>
						<Slider
							value={[bondWidth]}
							onValueChange={([val]) => setBondWidth(val)}
							min={1}
							max={100}
							step={1}
							className={cn('w-[60%]')}
						/>
					</div>
					<div className="w-full flex flex-col items-center gap-2">
						<label className="text-xs font-medium mb-1 w-full text-center">
							Min Tab Width
						</label>
						<Slider
							value={[minTabWidth]}
							onValueChange={([val]) => setMinTabWidth(val)}
							min={1}
							max={1400}
							step={1}
							className={cn('w-[60%]')}
						/>
					</div>
				</Card>
			</div>
		</div>
	)
}

export default App
