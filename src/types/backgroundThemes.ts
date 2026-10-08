export type BackgroundThemeId =
  | 'midnight-obsidian'
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
  previewSwatches: [string, string, string];
  accentText: string;
}

export const BACKGROUND_THEMES: BackgroundThemeDefinition[] = [
  {
    id: 'midnight-obsidian',
    name: 'Midnight Obsidian',
    tag: 'OLED TRUE BLACK · DEFAULT',
    badgeColor: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
    description:
      'Ultra-deep space true black optimized for OLED displays. Delivers infinite contrast, zero backlight bleed, and crisp crystalline white typography.',
    hexPrimary: '#050508',
    hexSecondary: '#0b0b10',
    hexCard: '#101017',
    hexElevated: '#171720',
    hexBorder: 'rgba(255, 255, 255, 0.08)',
    glowColor1: 'rgba(0, 240, 255, 0.08)',
    glowColor2: 'rgba(99, 102, 241, 0.09)',
    radialGradient:
      'radial-gradient(ellipse 80% 60% at 50% -15%, rgba(120, 119, 198, 0.09), rgba(0, 0, 0, 0))',
    previewSwatches: ['#050508', '#101017', '#00f0ff'],
    accentText: 'text-cyan-400',
  },
  {
    id: 'cosmic-abyss',
    name: 'Deep Cosmic Abyss',
    tag: 'SAPPHIRE HI-FI',
    badgeColor: 'border-blue-400/40 bg-blue-500/15 text-blue-300',
    description:
      'Deep galactic nocturnal navy blue inspired by deep-sea ocean trenches and cosmic starfields, accented with luminous sapphire and cyan flares.',
    hexPrimary: '#040814',
    hexSecondary: '#071024',
    hexCard: '#0c1933',
    hexElevated: '#112244',
    hexBorder: 'rgba(59, 130, 246, 0.18)',
    glowColor1: 'rgba(37, 99, 235, 0.20)',
    glowColor2: 'rgba(56, 189, 248, 0.14)',
    radialGradient:
      'radial-gradient(ellipse 80% 60% at 50% -15%, rgba(37, 99, 235, 0.18), rgba(0, 0, 0, 0))',
    previewSwatches: ['#040814', '#0c1933', '#38bdf8'],
    accentText: 'text-blue-400',
  },
  {
    id: 'cyber-nebula',
    name: 'Cyber Nebula',
    tag: 'SYNTH AMETHYST',
    badgeColor: 'border-purple-400/40 bg-purple-500/15 text-purple-300',
    description:
      'Dreamlike twilight velvet violet and dark plum with warm electric magenta and lavender glows. Evokes synthwave soundscapes and VIP listening lounges.',
    hexPrimary: '#0a0614',
    hexSecondary: '#120b24',
    hexCard: '#1a1033',
    hexElevated: '#241644',
    hexBorder: 'rgba(168, 85, 247, 0.18)',
    glowColor1: 'rgba(168, 85, 247, 0.20)',
    glowColor2: 'rgba(236, 72, 153, 0.14)',
    radialGradient:
      'radial-gradient(ellipse 80% 60% at 50% -15%, rgba(168, 85, 247, 0.18), rgba(0, 0, 0, 0))',
    previewSwatches: ['#0a0614', '#1a1033', '#c084fc'],
    accentText: 'text-purple-400',
  },
  {
    id: 'titanium-slate',
    name: 'Titanium Studio Slate',
    tag: 'TE STUDIO HARDWARE',
    badgeColor: 'border-zinc-400/40 bg-zinc-500/15 text-zinc-200',
    description:
      'Machined cool titanium and neutral studio graphite. Inspired by Teenage Engineering hardware, Apple Pro Display precision, and surgical brushed steel.',
    hexPrimary: '#0c0e12',
    hexSecondary: '#12161d',
    hexCard: '#191e28',
    hexElevated: '#212733',
    hexBorder: 'rgba(255, 255, 255, 0.13)',
    glowColor1: 'rgba(148, 163, 184, 0.14)',
    glowColor2: 'rgba(203, 213, 225, 0.09)',
    radialGradient:
      'radial-gradient(ellipse 80% 60% at 50% -15%, rgba(148, 163, 184, 0.12), rgba(0, 0, 0, 0))',
    previewSwatches: ['#0c0e12', '#191e28', '#cbd5e1'],
    accentText: 'text-zinc-300',
  },
  {
    id: 'aurora-emerald',
    name: 'Aurora Emerald',
    tag: 'BIO-LUMINESCENT',
    badgeColor: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    description:
      'Rich nocturnal evergreen depth with bio-luminescent mint and emerald corner auras. Crisp, energizing, and soothing for prolonged late-night listening.',
    hexPrimary: '#030f0a',
    hexSecondary: '#061a12',
    hexCard: '#0a261b',
    hexElevated: '#0e3324',
    hexBorder: 'rgba(16, 185, 129, 0.18)',
    glowColor1: 'rgba(16, 185, 129, 0.20)',
    glowColor2: 'rgba(52, 211, 153, 0.14)',
    radialGradient:
      'radial-gradient(ellipse 80% 60% at 50% -15%, rgba(16, 185, 129, 0.18), rgba(0, 0, 0, 0))',
    previewSwatches: ['#030f0a', '#0a261b', '#34d399'],
    accentText: 'text-emerald-400',
  },
  {
    id: 'sunset-ember',
    name: 'Sunset Ember',
    tag: 'ACOUSTIC WARMTH',
    badgeColor: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    description:
      'Smoky warm roasted charcoal with glowing molten amber, burnt orange, and copper dusk tones. Gives an intimate, cozy fireside warmth to your music.',
    hexPrimary: '#0f0906',
    hexSecondary: '#1a100a',
    hexCard: '#25170f',
    hexElevated: '#321f15',
    hexBorder: 'rgba(245, 158, 11, 0.18)',
    glowColor1: 'rgba(245, 158, 11, 0.20)',
    glowColor2: 'rgba(249, 115, 22, 0.14)',
    radialGradient:
      'radial-gradient(ellipse 80% 60% at 50% -15%, rgba(245, 158, 11, 0.18), rgba(0, 0, 0, 0))',
    previewSwatches: ['#0f0906', '#25170f', '#fbbf24'],
    accentText: 'text-amber-400',
  },
];

const THEME_STORAGE_KEY = 'musicsync_bg_theme';

export function getStoredBackgroundTheme(): BackgroundThemeId {
  try {
    // Check URL override first if testing
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('bg') || new URLSearchParams(window.location.search).get('theme');
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
  root.style.setProperty('--bg-card', theme.hexCard);
  root.style.setProperty('--bg-elevated', theme.hexElevated);
  root.style.setProperty('--bg-border', theme.hexBorder);
  root.style.setProperty('--bg-glow-1', theme.glowColor1);
  root.style.setProperty('--bg-glow-2', theme.glowColor2);
  root.style.setProperty('--bg-radial', theme.radialGradient);

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
