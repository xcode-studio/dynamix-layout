import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Github, Coffee, Mail, ExternalLink } from 'lucide-react'

const Footer = () => {
	return (
		<footer className="bg-gradient-to-t from-muted/20 to-background border-t border-border/50">
			<div className="max-w-7xl mx-auto px-6 py-16">
				{/* Main Footer Content */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
					{/* Brand */}
					<div className="md:col-span-2">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-primary">
								<span className="text-white font-bold text-lg">
									D
								</span>
							</div>
							<div>
								<h3 className="text-xl font-bold text-gradient">
									Dynamix Layout
								</h3>
								<p className="text-sm text-muted-foreground">
									Open Source Layout Engine
								</p>
							</div>
						</div>

						<p className="text-muted-foreground mb-6 max-w-md">
							Create dynamic, dockable, and resizable layouts with
							ease. Framework-agnostic core with official React
							wrapper for modern web applications.
						</p>

						<div className="flex flex-wrap gap-2 mb-6">
							<Badge
								variant="secondary"
								className="bg-secondary/50"
							>
								Zero Dependencies
							</Badge>
							<Badge
								variant="secondary"
								className="bg-secondary/50"
							>
								TypeScript
							</Badge>
							<Badge
								variant="secondary"
								className="bg-secondary/50"
							>
								MIT Licensed
							</Badge>
						</div>
					</div>

					{/* Quick Links */}
					<div>
						<h4 className="font-semibold mb-4">Resources</h4>
						<ul className="space-y-3 text-sm">
							<li>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/blob/main/README.md"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									Documentation
								</a>
							</li>
							<li>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/tree/main/examples"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									Examples
								</a>
							</li>
							<li>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/blob/main/packages/core/README.md"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									API Reference
								</a>
							</li>
							<li>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/blob/main/packages/react/README.md"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									Migration Guide
								</a>
							</li>
						</ul>
					</div>

					{/* Community */}
					<div>
						<h4 className="font-semibold mb-4">Community</h4>
						<ul className="space-y-3 text-sm">
							<li>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/issues"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									GitHub Issues
								</a>
							</li>
							<li>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/discussions/44"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									Discussions
								</a>
							</li>
							{/* <li>
                <a href="https://github.com/xcode-studio/dynamix-layout/issues" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  Discord
                </a>
              </li> */}
							<li>
								<a
									href="https://github.com/xcode-studio/dynamix-layout/blob/main/CONTRIBUTING.md"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									Contributing
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Support Section */}
				<div className="bg-card/30 rounded-xl p-8 mb-12 border border-border/50">
					<div className="text-center">
						<h3 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
							<Heart className="w-5 h-5 text-red-500" />
							Support the Project
						</h3>
						<p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
							Dynamix Layout is open source and free to use. If
							you find it helpful, consider supporting the
							development to keep it growing.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button
								className="bg-gradient-to-r from-pink-500 to-violet-500 hover:shadow-primary"
								asChild
							>
								<a
									href="https://www.patreon.com/akashaman"
									target="_blank"
									rel="noopener noreferrer"
								>
									<Heart className="w-4 h-4 mr-2" />
									Sponsor on Patreon
								</a>
							</Button>
							<Button
								variant="outline"
								className="border-yellow-500/30 hover:bg-yellow-500/10"
								asChild
							>
								<a
									href="https://www.buymeacoffee.com/akashaman"
									target="_blank"
									rel="noopener noreferrer"
								>
									<Coffee className="w-4 h-4 mr-2" />
									Buy Me a Coffee
								</a>
							</Button>
							<Button
								variant="ghost"
								className="hover:bg-primary/10"
								asChild
							>
								<a
									href="mailto:sir.akashaman@gmail.com"
									target="_blank"
									rel="noopener noreferrer"
								>
									<Mail className="w-4 h-4 mr-2" />
									Hire Me
								</a>
							</Button>
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50">
					<div className="flex items-center gap-6 mb-4 md:mb-0">
						<p className="text-sm text-muted-foreground">
							Made with{' '}
							<Heart className="w-4 h-4 inline text-red-500" /> by{' '}
							<a
								href="https://linktr.ee/akash_aman"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								Akash Aman
							</a>
						</p>
					</div>

					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							className="hover:bg-primary/10"
							asChild
						>
							<a
								href="http://github.com/xcode-studio/dynamix-layout"
								target="_blank"
								rel="noopener noreferrer"
								title="GitHub Repository"
							>
								<Github className="w-4 h-4" />
							</a>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="hover:bg-primary/10"
							asChild
						>
							<a
								href="https://www.npmjs.com/org/dynamix-layout"
								target="_blank"
								rel="noopener noreferrer"
								title="NPM Organization"
							>
								<ExternalLink className="w-4 h-4" />
							</a>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="hover:bg-primary/10"
							asChild
						>
							<a
								href="mailto:sir.akashaman@gmail.com"
								target="_blank"
								rel="noopener noreferrer"
								title="Contact via Email"
							>
								<Mail className="w-4 h-4" />
							</a>
						</Button>
					</div>
				</div>

				{/* Copyright */}
				<div className="text-center pt-8">
					<p className="text-xs text-muted-foreground">
						© {new Date().getFullYear()} Dynamix Layout. All rights
						reserved. Licensed under MIT.
					</p>
				</div>
			</div>
		</footer>
	)
}

export default Footer
