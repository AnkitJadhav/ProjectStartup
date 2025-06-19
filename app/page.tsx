'use client'

import { ModeToggle } from "@/components/mode-toggle"
import PdfQA from "@/components/PdfQA"
import ParticlesBackground from "@/components/ParticlesBackground"
import { Brain, Github } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen">
      <ParticlesBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b glass-effect">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">AI PDF Assistant</h1>
              <p className="text-sm text-muted-foreground">Powered by AI & RAG</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/yourusername/pdf-assistant"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-5 w-5" />
              <span className="hidden sm:inline">View on GitHub</span>
            </a>
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container flex flex-col items-center text-center mb-12">
            <div className="animate-float space-y-4">
              <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl gradient-text">
                Chat with Your PDFs
              </h2>
              <p className="mx-auto max-w-[700px] text-lg text-muted-foreground">
                Upload any PDF and ask questions naturally. Our AI assistant will help you understand and analyze the content instantly.
              </p>
            </div>
          </div>
          <PdfQA />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t glass-effect">
        <div className="container flex h-16 items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Built with Next.js, Flask, and AI
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#docs"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Documentation
            </a>
            <a
              href="#about"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              About
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
