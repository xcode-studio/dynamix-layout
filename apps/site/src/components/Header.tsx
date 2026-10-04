import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Github, Star, ExternalLink, Menu } from 'lucide-react'
import { useState } from 'react'

const Header = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
			<div className="max-w-7xl mx-auto px-6 py-4">
				<div className="flex items-center justify-between">
					{/* Logo */}
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-primary">
							<span className="text-white font-bold text-lg">
								D
							</span>
						</div>
						<div>
							<h1 className="text-xl font-bold text-gradient">
								Dynamix Layout
							</h1>
							<p className="text-xs text-muted-foreground">
								Layout Engine
							</p>
						</div>
					</div>

					{/* Desktop Navigation */}
					<nav className="hidden md:flex items-center gap-8">
						<a
							href="#features"
							className="text-muted-foreground hover:text-primary transition-colors"
						>
							Features
						</a>
						<a
							href="#demo"
							className="text-muted-foreground hover:text-primary transition-colors"
						>
							Demo
						</a>
						<a
							href="https://github.com/xcode-studio/dynamix-layout/blob/main/README.md"
							target="_blank"
							rel="noopener noreferrer"
							className="text-muted-foreground hover:text-primary transition-colors"
						>
							Docs
						</a>
						<a
							href="https://github.com/xcode-studio/dynamix-layout/discussions/44"
							target="_blank"
							rel="noopener noreferrer"
							className="text-muted-foreground hover:text-primary transition-colors"
						>
							Community
						</a>
					</nav>

					{/* Actions */}
					<div className="flex items-center gap-3">
						<a
							href="https://raw.githubusercontent.com/xcode-studio/dynamix-layout/refs/heads/main/LICENSE"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Badge
								variant="secondary"
								className="hidden lg:flex bg-secondary/50"
							>
								<Star className="w-3 h-3 mr-1" />
								MIT Licensed
							</Badge>
						</a>

						<Button
							variant="ghost"
							size="sm"
							className="hidden sm:flex hover:bg-primary/10"
							asChild
						>
							<a href="#demo" title="Go to Demo section">
								<ExternalLink className="w-4 h-4" />
							</a>
						</Button>

						<Button
							variant="outline"
							size="sm"
							className="hidden sm:flex border-primary/30 hover:bg-primary/10"
							asChild
						>
							<a
								href="http://github.com/xcode-studio/dynamix-layout"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Github className="w-4 h-4 mr-2" />
								GitHub
							</a>
						</Button>

						{/* Mobile menu button */}
						<Button
							variant="ghost"
							size="sm"
							className="md:hidden"
							onClick={() => setIsMenuOpen(!isMenuOpen)}
						>
							<Menu className="w-4 h-4" />
						</Button>
					</div>
				</div>

				{/* Mobile Navigation */}
				{isMenuOpen && (
					<nav className="md:hidden mt-4 pt-4 border-t border-border/50">
						<div className="flex flex-col gap-4">
							<a
								href="#features"
								className="text-muted-foreground hover:text-primary transition-colors"
								onClick={() => setIsMenuOpen(false)}
							>
								Features
							</a>
							<a
								href="#demo"
								className="text-muted-foreground hover:text-primary transition-colors"
								onClick={() => setIsMenuOpen(false)}
							>
								Demo
							</a>
							<a
								href="https://github.com/xcode-studio/dynamix-layout/blob/main/README.md"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-primary transition-colors"
							>
								Installation
							</a>
							<a
								href="https://github.com/xcode-studio/dynamix-layout/issues"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-primary transition-colors"
							>
								Community
							</a>
							<div className="flex gap-2 pt-2">
								<Button
									variant="outline"
									size="sm"
									className="flex-1"
									asChild
								>
									<a
										href="http://github.com/xcode-studio/dynamix-layout"
										target="_blank"
										rel="noopener noreferrer"
									>
										<Github className="w-4 h-4 mr-2" />
										GitHub
									</a>
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="flex-1"
									asChild
								>
									<a
										href="https://dynamix-layout-shadcn.vercel.app"
										target="_blank"
										rel="noopener noreferrer"
									>
										<ExternalLink className="w-4 h-4 mr-2" />
										Demo
									</a>
								</Button>
							</div>
						</div>
					</nav>
				)}
			</div>
		</header>
	)
}

export default Header
