'use client'

import { Eye, FolderTree, Upload } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload',
    description:
      'Drag and drop your 3D models — STL, OBJ, 3MF, PLY supported out of the box.',
    visual: UploadVisual,
  },
  {
    number: '02',
    icon: FolderTree,
    title: 'Organize',
    description:
      'Tag, categorize, and version your models. Find anything in seconds.',
    visual: OrganizeVisual,
  },
  {
    number: '03',
    icon: Eye,
    title: 'Preview & Share',
    description:
      'View models in 3D, download files, or share with your workflow.',
    visual: PreviewVisual,
  },
]

function UploadVisual() {
  return (
    <div className="relative h-24 w-full flex items-center justify-center">
      {/* Upload zone */}
      <div className="relative">
        {/* Dashed border box */}
        <div className="h-16 w-20 rounded-lg border-2 border-dashed border-orange-500/40 bg-orange-500/5 flex items-center justify-center group-hover:border-orange-500/70 group-hover:bg-orange-500/10 transition-all duration-300">
          {/* Animated upload arrow */}
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 text-orange-500/60 group-hover:text-orange-400 transition-colors"
          >
            <path
              d="M12 16V4m0 0l-4 4m4-4l4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="animate-upload-bounce"
            />
            <path
              d="M20 16v4H4v-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Floating file badges */}
        <div
          className="absolute -top-2 -right-3 px-1.5 py-0.5 rounded text-[8px] font-mono bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-float"
          style={{ animationDelay: '0s' }}
        >
          .stl
        </div>
        <div
          className="absolute -bottom-1 -left-4 px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-float"
          style={{ animationDelay: '0.5s' }}
        >
          .3mf
        </div>
      </div>
    </div>
  )
}

function OrganizeVisual() {
  return (
    <div className="relative h-24 w-full flex items-center justify-center">
      {/* Folder tree visualization */}
      <div className="relative flex items-start gap-1">
        {/* Main folder */}
        <div className="relative">
          <div className="h-10 w-12 rounded-t-md bg-gradient-to-b from-orange-500/30 to-orange-500/20 border border-orange-500/40" />
          <div className="h-6 w-14 -mt-1 rounded-b-md bg-gradient-to-b from-orange-500/25 to-orange-500/15 border border-orange-500/40 border-t-0" />

          {/* Connecting lines to subfolders */}
          <svg
            className="absolute -right-6 top-4 h-12 w-6"
            viewBox="0 0 24 48"
          >
            <path
              d="M 0 8 L 12 8 L 12 16 L 24 16"
              stroke="rgb(249, 115, 22)"
              strokeWidth="1"
              fill="none"
              strokeOpacity="0.4"
            />
            <path
              d="M 12 8 L 12 32 L 24 32"
              stroke="rgb(249, 115, 22)"
              strokeWidth="1"
              fill="none"
              strokeOpacity="0.4"
            />
          </svg>
        </div>

        {/* Subfolders */}
        <div className="flex flex-col gap-2 ml-6">
          <div
            className="h-5 w-8 rounded bg-purple-500/20 border border-purple-500/30 animate-pulse-soft"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="h-5 w-8 rounded bg-emerald-500/20 border border-emerald-500/30 animate-pulse-soft"
            style={{ animationDelay: '0.3s' }}
          />
        </div>

        {/* Floating tags */}
        <div className="absolute -top-2 right-0 flex gap-1">
          <span className="px-1 py-0.5 rounded text-[7px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
            v2.1
          </span>
        </div>
      </div>
    </div>
  )
}

function PreviewVisual() {
  return (
    <div className="relative h-24 w-full flex items-center justify-center">
      {/* 3D Preview wireframe */}
      <div className="relative">
        <svg viewBox="0 0 60 50" className="h-16 w-20">
          {/* Wireframe cube */}
          <g
            className="animate-rotate-slow-y"
            style={{ transformOrigin: '30px 25px' }}
          >
            {/* Front face */}
            <polygon
              points="15,15 45,15 45,40 15,40"
              fill="none"
              stroke="rgb(249, 115, 22)"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            {/* Back face */}
            <polygon
              points="22,8 52,8 52,33 22,33"
              fill="none"
              stroke="rgb(249, 115, 22)"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
            {/* Connecting edges */}
            <line
              x1="15"
              y1="15"
              x2="22"
              y2="8"
              stroke="rgb(249, 115, 22)"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <line
              x1="45"
              y1="15"
              x2="52"
              y2="8"
              stroke="rgb(249, 115, 22)"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <line
              x1="45"
              y1="40"
              x2="52"
              y2="33"
              stroke="rgb(249, 115, 22)"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
          </g>
        </svg>

        {/* Share indicator */}
        <div className="absolute -bottom-1 -right-2 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-400">
            <path
              d="M18 8A3 3 0 1 0 18 2a3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section className="relative py-24 overflow-hidden bg-muted/30">
      {/* Technical blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Corner markers - blueprint style */}
      <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-orange-500/20" />
      <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-orange-500/20" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-orange-500/20" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-orange-500/20" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="animate-fade-in-up text-center mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
            How It Works
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Simple as{' '}
            <span className="relative">
              <span className="text-orange-500">1, 2, 3</span>
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
            </span>
          </h2>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Progress line connecting all cards */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px">
            <div className="relative h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/30 to-orange-500/0" />
              {/* Animated pulse traveling along the line */}
              <div className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-orange-500/60 to-transparent animate-travel" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="animate-fade-in-up relative group"
                style={{ animationDelay: `${0.1 + index * 0.15}s` }}
              >
                <div className="relative h-full p-6 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] overflow-hidden">
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:via-transparent group-hover:to-orange-500/5 transition-all duration-500" />

                  {/* Large step number background */}
                  <div className="absolute -top-4 -right-2 font-mono text-[80px] font-bold leading-none text-orange-500/[0.07] select-none group-hover:text-orange-500/[0.12] transition-colors duration-500">
                    {step.number}
                  </div>

                  {/* Step number badge */}
                  <div className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-orange-500/40 bg-orange-500/10 mb-4 group-hover:border-orange-500/60 group-hover:bg-orange-500/20 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all duration-300">
                    <span className="font-mono text-sm font-bold text-orange-500">
                      {step.number}
                    </span>
                  </div>

                  {/* Visual illustration */}
                  <step.visual />

                  {/* Content */}
                  <div className="relative mt-4">
                    <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                      {step.title}
                      <step.icon className="w-4 h-4 text-orange-500/50" />
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/0 to-transparent group-hover:via-orange-500/40 transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes upload-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes rotate-slow-y {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes travel {
          0% { left: -20%; }
          100% { left: 100%; }
        }
        .animate-upload-bounce { animation: upload-bounce 1.5s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
        .animate-rotate-slow-y { animation: rotate-slow-y 8s linear infinite; }
        .animate-travel { animation: travel 3s linear infinite; }
      `}</style>
    </section>
  )
}
