export const toneStyles = {
  primary: { text: 'text-primary', soft: 'bg-primary/12', ring: 'hover:border-primary/50', solid: 'bg-primary' },
  cyan: { text: 'text-cyan', soft: 'bg-cyan/12', ring: 'hover:border-cyan/50', solid: 'bg-cyan' },
  pink: { text: 'text-pink', soft: 'bg-pink/12', ring: 'hover:border-pink/50', solid: 'bg-pink' },
  yellow: { text: 'text-yellow', soft: 'bg-yellow/12', ring: 'hover:border-yellow/50', solid: 'bg-yellow' },
  success: { text: 'text-success', soft: 'bg-success/12', ring: 'hover:border-success/50', solid: 'bg-success' },
} as const

export type ToneName = keyof typeof toneStyles
