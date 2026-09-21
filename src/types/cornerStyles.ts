export type CurvedCornerStyle =
  | 'liquid-squircle'
  | 'neon-kinetic'
  | 'titanium-chamfer'
  | 'organic-capsule';

export interface CornerStyleDefinition {
  id: CurvedCornerStyle;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  radiusLabel: string;
  outerRadiusClass: string;
  searchBarRadiusClass: string;
  queueCardRadiusClass: string;
  searchContainerClass: string;
  queueCardContainerClass: string;
  outerBoxClass: string;
  accentHighlights: string;
}

export const CURVED_CORNER_STYLES: CornerStyleDefinition[] = [
  {
    id: 'liquid-squircle',
    name: 'Liquid Squircle & Ambient Halo',
    badge: 'RECOMMENDED · VISION OS',
    badgeColor: 'border-blue-400/40 bg-blue-500/15 text-blue-300',
    description:
      'Continuous Apple superellipse squircle curvature with mathematically concentric nesting and 4 soft ambient radial corner glows that catch specular light.',
    radiusLabel: 'Concentric Squircles (R: 28px / 22px / 16px)',
    outerRadiusClass: 'rounded-[28px]',
    searchBarRadiusClass: 'rounded-[16px]',
    queueCardRadiusClass: 'rounded-[22px]',
    outerBoxClass:
      'rounded-[28px] border border-white/[0.12] bg-[#0c0e12]/90 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden',
    searchContainerClass:
      'rounded-[16px] bg-[#12151b]/95 border border-white/[0.1] hover:border-white/25 focus-within:border-white/40 focus-within:shadow-[0_0_24px_rgba(255,255,255,0.08)] shadow-sm transition-all duration-200',
    queueCardContainerClass:
      'rounded-[22px] bg-[#0d0f14]/95 backdrop-blur-2xl border border-white/[0.1] hover:border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] relative overflow-hidden transition-all duration-200',
    accentHighlights: 'ambient-halo',
  },
  {
    id: 'neon-kinetic',
    name: 'Neon Kinetic & Corner Bloom',
    badge: 'AUDIOPHILE NEON',
    badgeColor: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    description:
      'Deep smooth curves with animated breathing emerald and cyan corner blooms, micro-LED corner beacon points, and soft orbital ambient glows.',
    radiusLabel: 'Kinetic Neon Curves (R: 32px / 26px / Pill)',
    outerRadiusClass: 'rounded-[32px]',
    searchBarRadiusClass: 'rounded-full',
    queueCardRadiusClass: 'rounded-[28px]',
    outerBoxClass:
      'rounded-[32px] border border-emerald-500/25 bg-[#080b0f]/95 backdrop-blur-2xl shadow-[0_0_35px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(52,211,153,0.2)] relative overflow-hidden',
    searchContainerClass:
      'rounded-full bg-[#0d1217]/95 border border-emerald-500/20 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:shadow-[0_0_25px_rgba(52,211,153,0.25)] shadow-sm transition-all duration-200',
    queueCardContainerClass:
      'rounded-[28px] bg-[#090d12]/95 backdrop-blur-2xl border border-emerald-500/25 hover:border-emerald-400/40 shadow-[0_0_35px_rgba(16,185,129,0.18),inset_0_1px_1px_rgba(52,211,153,0.3)] relative overflow-hidden transition-all duration-200',
    accentHighlights: 'neon-beacons',
  },
  {
    id: 'titanium-chamfer',
    name: 'Milled Titanium Chamfer & Bezel',
    badge: 'TE STUDIO HARDWARE',
    badgeColor: 'border-zinc-400/40 bg-zinc-500/15 text-zinc-200',
    description:
      'High-end machined titanium aesthetic featuring double-hairline beveled rims, metallic corner alignment ticks, and laser-precise corner curvature.',
    radiusLabel: 'Milled Beveled Chamfer (R: 24px / 18px / 14px)',
    outerRadiusClass: 'rounded-[24px]',
    searchBarRadiusClass: 'rounded-[14px]',
    queueCardRadiusClass: 'rounded-[18px]',
    outerBoxClass:
      'rounded-[24px] border border-zinc-700/80 ring-1 ring-white/[0.08] bg-[#0d0f14] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1.5px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.9)] relative overflow-hidden',
    searchContainerClass:
      'rounded-[14px] bg-[#12141a] border border-zinc-700/80 ring-1 ring-white/[0.05] hover:border-zinc-500 focus-within:border-zinc-300 focus-within:shadow-[0_0_20px_rgba(255,255,255,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200',
    queueCardContainerClass:
      'rounded-[18px] bg-[#0e1116] border border-zinc-700/80 ring-1 ring-white/[0.08] hover:border-zinc-500 shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_0_1.5px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.8)] relative overflow-hidden transition-all duration-200',
    accentHighlights: 'titanium-ticks',
  },
  {
    id: 'organic-capsule',
    name: 'Pill-Fluted Organic Capsule',
    badge: 'ORGANIC FLOW',
    badgeColor: 'border-purple-400/40 bg-purple-500/15 text-purple-300',
    description:
      'Maximum continuous organic curvature with deep nested floating pill geometry, ultra-soft frosted elevation, and tactile velvety touch borders.',
    radiusLabel: 'Ultra-Curved Organic (R: 38px / 30px / Pill)',
    outerRadiusClass: 'rounded-[38px]',
    searchBarRadiusClass: 'rounded-full',
    queueCardRadiusClass: 'rounded-[30px]',
    outerBoxClass:
      'rounded-[38px] border border-white/[0.14] bg-[#0b0c11]/90 backdrop-blur-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.18)] relative overflow-hidden',
    searchContainerClass:
      'rounded-full bg-[#11131a]/95 border border-white/[0.12] hover:border-purple-400/40 focus-within:border-purple-400/70 focus-within:shadow-[0_0_25px_rgba(168,85,247,0.2)] shadow-md transition-all duration-200',
    queueCardContainerClass:
      'rounded-[30px] bg-[#0d0f16]/95 backdrop-blur-2xl border border-white/[0.12] hover:border-white/25 shadow-[0_16px_48px_rgba(0,0,0,0.85),inset_0_1.5px_2px_rgba(255,255,255,0.16)] relative overflow-hidden transition-all duration-200',
    accentHighlights: 'organic-glow',
  },
];

const CORNER_STORAGE_KEY = 'musicsync_curved_corner_style';

export function getStoredCornerStyle(): CurvedCornerStyle {
  try {
    const saved = localStorage.getItem(CORNER_STORAGE_KEY);
    if (
      saved === 'liquid-squircle' ||
      saved === 'neon-kinetic' ||
      saved === 'titanium-chamfer' ||
      saved === 'organic-capsule'
    ) {
      return saved as CurvedCornerStyle;
    }
  } catch {}
  return 'liquid-squircle';
}

export function saveStoredCornerStyle(style: CurvedCornerStyle) {
  try {
    localStorage.setItem(CORNER_STORAGE_KEY, style);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('musicsync_corner_style_changed', { detail: style }));
    }
  } catch {}
}
