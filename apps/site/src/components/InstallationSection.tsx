import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check, Package, Zap, Code2 } from 'lucide-react'
import { useState } from 'react'
import { CodeBlock } from './CodeBlock'

const InstallationSection = () => {
	const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

	const copyToClipboard = (text: string, command: string) => {
		navigator.clipboard.writeText(text)
		setCopiedCommand(command)
		setTimeout(() => setCopiedCommand(null), 2000)
	}

	const installCommandsReact = {
		npm: 'npm install @dynamix-layout/react @dynamix-layout/core',
		yarn: 'yarn add @dynamix-layout/react @dynamix-layout/core',
		pnpm: 'pnpm add @dynamix-layout/react @dynamix-layout/core',
	}

	const installCommandsSolidJS = {
		npm: 'npm install @dynamix-layout/solid @dynamix-layout/core',
		yarn: 'yarn add @dynamix-layout/solid @dynamix-layout/core',
		pnpm: 'pnpm add @dynamix-layout/solid @dynamix-layout/core',
	}


	const basicExampleReact = `import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/style.css'

function App() {

	const tabList = [
		['editor', <div style={{ background: '#c0ca33', height: '100%' }}>Editor</div>],
		['preview', <div style={{ background: '#66bb6a', height: '100%' }}>Preview</div>],
		['terminal', <div style={{ background: '#ffc400', height: '100%' }}>Terminal</div>],
	]

	return (
		<DynamixLayout tabs={tabList} style={{ height: '100vh', width: '100vw' }} />
	)
}

export default App`


	const basicExampleSolid = `import { DynamixLayout } from '@dynamix-layout/solid'
import '@dynamix-layout/solid/style.css'

function App() {

	const tabList = [
		['editor', <div style={{ background: '#c0ca33', height: '100%' }}>Editor</div>],
		['preview', <div style={{ background: '#66bb6a', height: '100%' }}>Preview</div>],
		['terminal', <div style={{ background: '#ffc400', height: '100%' }}>Terminal</div>],
	]

	return (
		<DynamixLayout tabs={tabList} style={{ height: '100vh', width: '100vw' }} />
	)
}

export default App`


	return (
		<section className="py-20 px-6">
			<div className="max-w-6xl mx-auto">
				{/* Section Header */}
				<div className="text-center mb-16">
					<Badge className="bg-green-500/10 text-green-400 border-green-500/20 mb-4">
						<Package className="w-4 h-4 mr-2" />
						Quick Start
					</Badge>
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						Get Started in Minutes
					</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Install Dynamix Layout and start building complex
						layouts with just a few lines of code.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
					{/* Installation */}
					<Card className="p-8 bg-card/50 border-primary/20">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
								<Package className="w-5 h-5 text-green-400" />
							</div>
							<h3 className="text-xl font-semibold">
								Installation
							</h3>
						</div>

						<Tabs defaultValue="solid" className="w-full">
							<TabsList className="grid w-full grid-cols-2 mb-4">
								<TabsTrigger value="solid">SolidJS</TabsTrigger>
								<TabsTrigger value="react">React</TabsTrigger>
							</TabsList>
							<TabsContent value="solid">
								<Tabs defaultValue="npm" className="w-full">
									<TabsList className="grid w-full grid-cols-3 mb-4">
										<TabsTrigger value="npm">npm</TabsTrigger>
										<TabsTrigger value="yarn">yarn</TabsTrigger>
										<TabsTrigger value="pnpm">pnpm</TabsTrigger>
									</TabsList>

									{Object.entries(installCommandsSolidJS).map(
										([manager, command]) => (
											<TabsContent key={manager} value={manager}>
												<div className="relative">
													<CodeBlock className="code-block pr-12 text-sm scrollbar" language='bash' code={command} />
													<Button
														variant="ghost"
														size="sm"
														className="absolute right-3 top-3 h-8 w-8 p-0 z-10 bg-background/80 hover:bg-background/90"
														onClick={() =>
															copyToClipboard(
																command,
																manager
															)
														}
													>
														{copiedCommand === manager ? (
															<Check className="w-4 h-4 text-green-400" />
														) : (
															<Copy className="w-4 h-4" />
														)}
													</Button>
												</div>
											</TabsContent>
										)
									)}
								</Tabs>

								<div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
									<p className="text-sm text-muted-foreground mb-2">
										<strong>Note:</strong> You need both packages:
									</p>
									<ul className="text-sm text-muted-foreground space-y-1">
										<li>
											•{' '}
											<code className="text-primary">
												@dynamix-layout/core
											</code>{' '}
											- Framework-agnostic engine
										</li>
										<li>
											•{' '}
											<code className="text-primary">
												@dynamix-layout/solid
											</code>{' '}
											- SolidJS components
										</li>
									</ul>
								</div>
							</TabsContent>
							<TabsContent value="react">
								<Tabs defaultValue="npm" className="w-full">
									<TabsList className="grid w-full grid-cols-3 mb-4">
										<TabsTrigger value="npm">npm</TabsTrigger>
										<TabsTrigger value="yarn">yarn</TabsTrigger>
										<TabsTrigger value="pnpm">pnpm</TabsTrigger>
									</TabsList>

									{Object.entries(installCommandsReact).map(
										([manager, command]) => (
											<TabsContent key={manager} value={manager}>
												<div className="relative">
													<CodeBlock className="code-block pr-12 text-sm scrollbar" language='bash' code={command} />
													<Button
														variant="ghost"
														size="sm"
														className="absolute right-3 top-3 h-8 w-8 p-0 z-10 bg-background/80 hover:bg-background/90"
														onClick={() =>
															copyToClipboard(
																command,
																manager
															)
														}
													>
														{copiedCommand === manager ? (
															<Check className="w-4 h-4 text-green-400" />
														) : (
															<Copy className="w-4 h-4" />
														)}
													</Button>
												</div>
											</TabsContent>
										)
									)}
								</Tabs>

								<div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
									<p className="text-sm text-muted-foreground mb-2">
										<strong>Note:</strong> You need both packages:
									</p>
									<ul className="text-sm text-muted-foreground space-y-1">
										<li>
											•{' '}
											<code className="text-primary">
												@dynamix-layout/core
											</code>{' '}
											- Framework-agnostic engine
										</li>
										<li>
											•{' '}
											<code className="text-primary">
												@dynamix-layout/react
											</code>{' '}
											- React components
										</li>
									</ul>
								</div>
							</TabsContent>
						</Tabs>


					</Card>

					{/* Basic Usage */}
					<Card className="p-8 bg-card/50 border-primary/20">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
								<Code2 className="w-5 h-5 text-blue-400" />
							</div>
							<h3 className="text-xl font-semibold">
								Basic Usage
							</h3>
						</div>
						<Tabs defaultValue="solid" className="w-full">
							<TabsList className="grid w-full grid-cols-2 mb-4">
								<TabsTrigger value="solid">SolidJS</TabsTrigger>
								<TabsTrigger value="react">React</TabsTrigger>
							</TabsList>
							<TabsContent value="solid">
								<div className="relative">
									<CodeBlock className="code-block pr-12 text-xs overflow-x-auto scrollbar max-h-80" code={basicExampleSolid} />
									<Button
										variant="ghost"
										size="sm"
										className="absolute right-3 top-3 h-8 w-8 p-0 z-10 bg-background/80 hover:bg-background/90"
										onClick={() =>
											copyToClipboard(basicExampleSolid, 'example')
										}
									>
										{copiedCommand === 'example' ? (
											<Check className="w-4 h-4 text-green-400" />
										) : (
											<Copy className="w-4 h-4" />
										)}
									</Button>
								</div>
							</TabsContent>
							<TabsContent value="react">
								<div className="relative">
									<CodeBlock className="code-block pr-12 text-xs overflow-x-auto scrollbar max-h-80" code={basicExampleReact} />
									<Button
										variant="ghost"
										size="sm"
										className="absolute right-3 top-3 h-8 w-8 p-0 z-10 bg-background/80 hover:bg-background/90"
										onClick={() =>
											copyToClipboard(basicExampleReact, 'example')
										}
									>
										{copiedCommand === 'example' ? (
											<Check className="w-4 h-4 text-green-400" />
										) : (
											<Copy className="w-4 h-4" />
										)}
									</Button>
								</div>
							</TabsContent>
						</Tabs>

					</Card>
				</div>

				{/* Next Steps */}
				<Card className="p-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
					<div className="text-center">
						<div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
							<Zap className="w-8 h-8 text-primary" />
						</div>

						<h3 className="text-2xl font-bold mb-4">
							Ready to Build?
						</h3>
						<p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
							Explore the full documentation, check out advanced
							examples, and join our community of developers.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button
								className="bg-gradient-primary hover:shadow-primary"
								asChild
							>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/blob/main/README.md"
									target="_blank"
									rel="noopener noreferrer"
								>
									View Documentation
								</a>
							</Button>
							<Button
								variant="outline"
								className="border-primary/30 hover:bg-primary/10"
								asChild
							>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/tree/main/examples"
									target="_blank"
									rel="noopener noreferrer"
								>
									Browse Examples
								</a>
							</Button>
							{/* <Button variant="ghost" className="hover:bg-primary/10" asChild>
                <a href="https://github.com/xcode-studio/dynamix-layout/issues" target="_blank" rel="noopener noreferrer">
                  Join Discord
                </a>
              </Button> */}
						</div>
					</div>
				</Card>
			</div>
		</section>
	)
}

export default InstallationSection
