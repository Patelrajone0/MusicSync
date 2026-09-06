/**
 * Global Tactile Button Ripple & Spring Feedback
 * Dynamically creates smooth, luminous click ripples at pointer coordinates
 * on every interactive button across the MusicSync application.
 */
export function initRippleEffect() {
  if (typeof window === 'undefined') return;

  const handlePointerDown = (e: PointerEvent) => {
    // Check if clicked element or its parent is a button
    const target = (e.target as HTMLElement)?.closest('button, [role="button"], .btn-interactive') as HTMLElement | null;
    if (!target || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') {
      return;
    }

    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple-wave';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;

    // Ensure button has relative position and clipped overflow
    target.classList.add('ripple-container');
    target.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 650);
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
}
