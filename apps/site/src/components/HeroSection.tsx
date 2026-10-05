import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Github, ExternalLink, Star, Download } from 'lucide-react'

const HeroSection = () => {
	return (
		<section className="relative py-20 px-6 text-center overflow-hidden">
			{/* Background decorative elements */}
			<div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
			<div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
			<div
				className="absolute bottom-20 right-1/4 w-64 h-64 bg-primary-glow/10 rounded-full blur-3xl animate-float"
				style={{ animationDelay: '2s' }}
			/>

			<div className="relative max-w-6xl mx-auto">
				{/* Badge */}
				<Badge className="hero-badge mb-6 animate-slide-up">
					<Star className="w-4 h-4 mr-2" />
					Open Source Layout Engine
				</Badge>

				{/* Main heading */}
				<h1
					className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up"
					style={{ animationDelay: '0.1s' }}
				>
					<span className="text-gradient">Dynamix Layout</span>
				</h1>

				{/* Subtitle */}
				<h2
					className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto animate-slide-up"
					style={{ animationDelay: '0.2s' }}
				>
					Create dynamic, dockable 🧩, and resizable layouts with ease
					🚀, similar to editors like VS Code
				</h2>

				{/* Description */}
				<p
					className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up"
					style={{ animationDelay: '0.3s' }}
				>
					A powerful JavaScript library designed to help you build
					complex, multi-panel user interfaces. Framework-agnostic
					core with official React & Solid wrapper for seamless integration.
				</p>

				{/* CTA Buttons */}
				<div
					className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-slide-up"
					style={{ animationDelay: '0.4s' }}
				>
					<Button
						size="lg"
						className="bg-gradient-primary hover:shadow-primary shadow-primary transition-all duration-300 group"
						asChild
					>
						<a
							href="http://github.com/xcode-studio/dynamix-layout"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Github className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
							View on GitHub
						</a>
					</Button>

					<Button
						variant="outline"
						size="lg"
						className="border-primary/30 hover:bg-primary/10 hover:border-primary transition-all duration-300 group"
						asChild
					>
						<a
							href="https://www.npmjs.com/org/dynamix-layout"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Download className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
							Get Started
						</a>
					</Button>

					<Button
						variant="ghost"
						size="lg"
						className="hover:bg-primary/10 transition-all duration-300 group"
						asChild
					>
						<a href="#demo">
							<ExternalLink className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
							Live Demo
						</a>
					</Button>
				</div>

				{/* Stats */}
				<div
					className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground animate-slide-up"
					style={{ animationDelay: '0.5s' }}
				>
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
						Zero Dependencies
					</div>
					<div className="flex items-center gap-2">
						<div
							className="w-2 h-2 bg-primary rounded-full animate-pulse-glow"
							style={{ animationDelay: '0.5s' }}
						/>
						TypeScript First
					</div>
					<div className="flex items-center gap-2">
						<div
							className="w-2 h-2 bg-primary rounded-full animate-pulse-glow"
							style={{ animationDelay: '1s' }}
						/>
						Framework Agnostic
					</div>
					<div className="flex items-center gap-2">
						<div
							className="w-2 h-2 bg-primary rounded-full animate-pulse-glow"
							style={{ animationDelay: '1.5s' }}
						/>
						MIT Licensed
					</div>
				</div>
			</div>
		</section>
	)
}

export default HeroSection
