export type BackgroundThemeId =
  | 'midnight-obsidian'
  | 'pure-light'
  | 'pure-oled-black'
  | 'cosmic-abyss'
  | 'cyber-nebula'
  | 'titanium-slate'
  | 'aurora-emerald'
  | 'sunset-ember';

export interface BackgroundThemeDefinition {
  id: BackgroundThemeId;
  name: string;
  tag: string;
  badgeColor: string;
  description: string;
  hexPrimary: string;
  hexSecondary: string;
  hexCard: string;
  hexElevated: string;
  hexBorder: string;
  glowColor1: string;
  glowColor2: string;
  radialGradient: string;
  meshGradient: string;
  previewSwatches: [string, string, string];
  accentHex: string;
  accentText: string;
}

export const BACKGROUND_THEMES: BackgroundThemeDefinition[] = [
  {
    id: 'midnight-obsidian',
    name: 'Midnight Obsidian',
    tag: 'OLED TRUE BLACK · DEFAULT',
    badgeColor: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
    description:
      'Pure infinite contrast black optimized for OLED displays with zero backlight bleed, crystal-sharp white typography, and subtle cyan-violet specular starlight.',
    hexPrimary: '#020204',
    hexSecondary: '#08080d',
    hexCard: 'rgba(14, 14, 20, 0.85)',
    hexElevated: 'rgba(22, 22, 30, 0.92)',
    hexBorder: 'rgba(255, 255, 255, 0.10)',
    glowColor1: 'rgba(0, 240, 255, 0.18)',
    glowColor2: 'rgba(99, 102, 241, 0.15)',
    radialGradient:
      'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(120, 119, 198, 0.18), rgba(0, 0, 0, 0))',
    meshGradient:
      'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(0, 240, 255, 0.10) 0px, transparent 50%)',
    previewSwatches: ['#020204', '#14141e', '#00f0ff'],
    accentHex: '#00f0ff',
    accentText: 'text-cyan-400',
  },
  {
    id: 'pure-light',
    name: 'Pure Porcelain Light',
    tag: 'ALMOST WHITE · CLEAN LIGHT',
    badgeColor: 'border-blue-400/40 bg-blue-500/15 text-blue-600',
    description:
      'Immaculate porcelain daylight with ultra-clean almost white aesthetics, frosted glass panels, and crisp contrast engineered for light theme lovers.',
    hexPrimary: '#f8fafc',
    hexSecondary: '#f1f5f9',
    hexCard: 'rgba(255, 255, 255, 0.90)',
    hexElevated: 'rgba(255, 255, 255, 0.98)',
    hexBorder: 'rgba(15, 23, 42, 0.10)',
    glowColor1: 'rgba(59, 130, 246, 0.10)',
    glowColor2: 'rgba(99, 102, 241, 0.08)',
    radialGradient:
      'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(226, 232, 240, 0.8), rgba(248, 250, 252, 0))',
    meshGradient:
      'radial-gradient(at 0% 0%, rgba(241, 245, 249, 0.95) 0px, transparent 60%), radial-gradient(at 100% 100%, rgba(226, 232, 240, 0.7) 0px, transparent 60%)',
    previewSwatches: ['#ffffff', '#f1f5f9', '#2563eb'],
    accentHex: '#2563eb',
    accentText: 'text-blue-600',
  },
  {
    id: 'pure-oled-black',
    name: 'True OLED Pure Black',
    tag: '100% PURE BLACK · TRUE OLED',
    badgeColor: 'border-zinc-400/40 bg-zinc-500/15 text-zinc-100',
    description:
      'Absolute 100% pitch-black (#000000) with 0% pixel luminance. Shuts off OLED pixels completely for zero backlight bleed, infinite contrast, and maximum battery efficiency.',
    hexPrimary: '#000000',
    hexSecondary: '#000000',
    hexCard: 'rgba(0, 0, 0, 0.98)',
    hexElevated: '#050505',
    hexBorder: 'rgba(255, 255, 255, 0.14)',
    glowColor1: 'rgba(0, 0, 0, 0)',
    glowColor2: 'rgba(0, 0, 0, 0)',
    radialGradient: 'none',
    meshGradient: 'none',
    previewSwatches: ['#000000', '#0a0a0a', '#ffffff'],
    accentHex: '#ffffff',
    accentText: 'text-white',
  },
  {
    id: 'cosmic-abyss',
    name: 'Deep Cosmic Abyss',
    tag: 'SAPPHIRE HI-FI',
    badgeColor: 'border-blue-400/40 bg-blue-500/15 text-blue-300',
    description:
      'Vivid nocturnal midnight sapphire and galactic navy blue with luminous cobalt flares, translucent blue glass panels, and cyan ambient halos.',
    hexPrimary: '#07152b',
    hexSecondary: '#0d2244',
    hexCard: 'rgba(13, 29, 56, 0.78)',
    hexElevated: 'rgba(20, 44, 84, 0.90)',
    hexBorder: 'rgba(96, 165, 250, 0.32)',
    glowColor1: 'rgba(37, 99, 235, 0.45)',
    glowColor2: 'rgba(56, 189, 248, 0.35)',
    radialGradient:
      'radial-gradient(ellipse 90% 80% at 50% -10%, rgba(37, 99, 235, 0.42), rgba(0, 0, 0, 0)), radial-gradient(ellipse 70% 60% at 100% 100%, rgba(14, 165, 233, 0.30), rgba(0, 0, 0, 0))',
    meshGradient:
      'radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.30) 0px, transparent 60%), radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.25) 0px, transparent 60%)',
    previewSwatches: ['#07152b', '#132c54', '#38bdf8'],
    accentHex: '#38bdf8',
    accentText: 'text-blue-400',
  },
  {
    id: 'cyber-nebula',
    name: 'Cyber Nebula',
    tag: 'SYNTH AMETHYST',
    badgeColor: 'border-purple-400/40 bg-purple-500/15 text-purple-300',
    description:
      'Intoxicating deep velvet violet and dark plum with warm electric magenta and violet glows. Gives the entire studio a futuristic synthwave lounge atmosphere.',
    hexPrimary: '#170b2b',
    hexSecondary: '#261245',
    hexCard: 'rgba(34, 16, 62, 0.78)',
    hexElevated: 'rgba(52, 25, 94, 0.90)',
    hexBorder: 'rgba(192, 132, 252, 0.32)',
    glowColor1: 'rgba(168, 85, 247, 0.45)',
    glowColor2: 'rgba(236, 72, 153, 0.35)',
    radialGradient:
      'radial-gradient(ellipse 90% 80% at 50% -10%, rgba(168, 85, 247, 0.42), rgba(0, 0, 0, 0)), radial-gradient(ellipse 70% 60% at 0% 100%, rgba(236, 72, 153, 0.30), rgba(0, 0, 0, 0))',
    meshGradient:
      'radial-gradient(at 0% 0%, rgba(168, 85, 247, 0.30) 0px, transparent 60%), radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.25) 0px, transparent 60%)',
    previewSwatches: ['#170b2b', '#301657', '#c084fc'],
    accentHex: '#c084fc',
    accentText: 'text-purple-400',
  },
  {
    id: 'aurora-emerald',
    name: 'Aurora Emerald',
    tag: 'BIO-LUMINESCENT',
    badgeColor: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    description:
      'Luminous nocturnal emerald forest depth with bio-luminescent mint corner halos, emerald tinted glass containers, and energizing audio reactive lighting.',
    hexPrimary: '#052016',
    hexSecondary: '#0c3525',
    hexCard: 'rgba(10, 48, 34, 0.78)',
    hexElevated: 'rgba(16, 74, 52, 0.90)',
    hexBorder: 'rgba(52, 211, 153, 0.32)',
    glowColor1: 'rgba(16, 185, 129, 0.45)',
    glowColor2: 'rgba(52, 211, 153, 0.35)',
    radialGradient:
      'radial-gradient(ellipse 90% 80% at 50% -10%, rgba(16, 185, 129, 0.42), rgba(0, 0, 0, 0)), radial-gradient(ellipse 70% 60% at 100% 100%, rgba(52, 211, 153, 0.30), rgba(0, 0, 0, 0))',
    meshGradient:
      'radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.30) 0px, transparent 60%), radial-gradient(at 100% 100%, rgba(52, 211, 153, 0.25) 0px, transparent 60%)',
    previewSwatches: ['#052016', '#0f4430', '#34d399'],
    accentHex: '#34d399',
    accentText: 'text-emerald-400',
  },
  {
    id: 'sunset-ember',
    name: 'Sunset Ember',
    tag: 'ACOUSTIC WARMTH',
    badgeColor: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    description:
      'Smoky warm roasted charcoal with glowing molten amber, burnt orange, and copper dusk tones. Gives an intimate, cozy vinyl fireside warmth to your music.',
    hexPrimary: '#221008',
    hexSecondary: '#381a0e',
    hexCard: 'rgba(52, 25, 14, 0.78)',
    hexElevated: 'rgba(78, 38, 20, 0.90)',
    hexBorder: 'rgba(251, 191, 36, 0.32)',
    glowColor1: 'rgba(245, 158, 11, 0.45)',
    glowColor2: 'rgba(249, 115, 22, 0.35)',
    radialGradient:
      'radial-gradient(ellipse 90% 80% at 50% -10%, rgba(245, 158, 11, 0.42), rgba(0, 0, 0, 0)), radial-gradient(ellipse 70% 60% at 0% 100%, rgba(239, 68, 68, 0.30), rgba(0, 0, 0, 0))',
    meshGradient:
      'radial-gradient(at 0% 0%, rgba(245, 158, 11, 0.30) 0px, transparent 60%), radial-gradient(at 100% 100%, rgba(249, 115, 22, 0.25) 0px, transparent 60%)',
    previewSwatches: ['#221008', '#441f10', '#fbbf24'],
    accentHex: '#fbbf24',
    accentText: 'text-amber-400',
  },
  {
    id: 'titanium-slate',
    name: 'Titanium Studio Slate',
    tag: 'TE STUDIO HARDWARE',
    badgeColor: 'border-zinc-400/40 bg-zinc-500/15 text-zinc-200',
    description:
      'Machined cool titanium and neutral studio graphite. Inspired by Teenage Engineering hardware, Apple Pro Display precision, and surgical brushed steel.',
    hexPrimary: '#11151f',
    hexSecondary: '#1a202e',
    hexCard: 'rgba(24, 30, 44, 0.80)',
    hexElevated: 'rgba(34, 43, 62, 0.92)',
    hexBorder: 'rgba(203, 213, 225, 0.25)',
    glowColor1: 'rgba(148, 163, 184, 0.28)',
    glowColor2: 'rgba(203, 213, 225, 0.20)',
    radialGradient:
      'radial-gradient(ellipse 90% 80% at 50% -10%, rgba(148, 163, 184, 0.28), rgba(0, 0, 0, 0)), radial-gradient(ellipse 70% 60% at 100% 100%, rgba(203, 213, 225, 0.18), rgba(0, 0, 0, 0))',
    meshGradient:
      'radial-gradient(at 0% 0%, rgba(148, 163, 184, 0.20) 0px, transparent 60%), radial-gradient(at 100% 100%, rgba(203, 213, 225, 0.15) 0px, transparent 60%)',
    previewSwatches: ['#11151f', '#21293a', '#cbd5e1'],
    accentHex: '#cbd5e1',
    accentText: 'text-zinc-300',
  },
];

const THEME_STORAGE_KEY = 'musicsync_bg_theme';

export function getStoredBackgroundTheme(): BackgroundThemeId {
  try {
    if (typeof window !== 'undefined') {
      const param =
        new URLSearchParams(window.location.search).get('bg') ||
        new URLSearchParams(window.location.search).get('theme');
      if (param && BACKGROUND_THEMES.some((t) => t.id === param)) {
        return param as BackgroundThemeId;
      }
    }
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && BACKGROUND_THEMES.some((t) => t.id === saved)) {
      return saved as BackgroundThemeId;
    }
  } catch {}
  return 'midnight-obsidian';
}

export function applyBackgroundTheme(themeId: BackgroundThemeId) {
  const theme = BACKGROUND_THEMES.find((t) => t.id === themeId) || BACKGROUND_THEMES[0];
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--bg-primary', theme.hexPrimary);
  root.style.setProperty('--bg-secondary', theme.hexSecondary);
  root.style.setProperty('--bg-surface', theme.hexCard);
  root.style.setProperty('--bg-card', theme.hexCard);
  root.style.setProperty('--bg-elevated', theme.hexElevated);
  root.style.setProperty('--bg-surface-elevated', theme.hexElevated);
  root.style.setProperty('--bg-border', theme.hexBorder);
  root.style.setProperty('--bg-glow-1', theme.glowColor1);
  root.style.setProperty('--bg-glow-2', theme.glowColor2);
  root.style.setProperty('--bg-radial', theme.radialGradient);
  root.style.setProperty('--bg-mesh', theme.meshGradient);
  root.style.setProperty('--theme-accent', theme.accentHex);

  if (theme.id === 'pure-light') {
    root.style.setProperty('--text-primary', '#0f172a');
    root.style.setProperty('--text-secondary', '#334155');
    root.style.setProperty('--text-muted', '#64748b');
    root.style.colorScheme = 'light';
    document.body.style.color = '#0f172a';
  } else {
    root.style.setProperty('--text-primary', '#f8fafc');
    root.style.setProperty('--text-secondary', '#cbd5e1');
    root.style.setProperty('--text-muted', '#94a3b8');
    root.style.colorScheme = 'dark';
    document.body.style.color = '#f1f5f9';
  }

  // Apply to body and root elements
  document.body.style.backgroundColor = theme.hexPrimary;
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.style.backgroundColor = theme.hexPrimary;
  }

  // Update theme-color meta tag for mobile browsers (status bar)
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme.hexPrimary);
  }

  // Set data-theme attribute on root
  root.setAttribute('data-bg-theme', theme.id);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {}

  // Dispatch custom event for reactive subscribers
  window.dispatchEvent(
    new CustomEvent('musicsync_bg_theme_changed', { detail: { themeId: theme.id, theme } })
  );
}

export function saveStoredBackgroundTheme(themeId: BackgroundThemeId) {
  applyBackgroundTheme(themeId);
}

export function initBackgroundTheme(): BackgroundThemeId {
  const theme = getStoredBackgroundTheme();
  applyBackgroundTheme(theme);
  return theme;
}
