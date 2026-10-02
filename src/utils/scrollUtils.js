const HEADER_GAP = 8;

// The sticky header shrinks to a "slim" layout once the page scrolls, which shifts
// the content below it. Measure the slim height up front (transitions disabled) so
// scroll targets can account for it before the header actually shrinks.
export function measureSlimHeaderHeight() {
  const header = document.querySelector('.app-header');
  if (!header) return 0;
  let h;
  if (header.classList.contains('app-header--slim')) {
    h = header.getBoundingClientRect().height;
  } else {
    header.classList.add('app-header--measuring', 'app-header--slim');
    h = header.getBoundingClientRect().height;
    header.classList.remove('app-header--slim');
    header.getBoundingClientRect(); // flush layout before transitions come back
    header.classList.remove('app-header--measuring');
  }
  document.documentElement.style.setProperty('--slim-header-height', `${h}px`);
  return h;
}

// Scrolls so `el` lands just below the slim header, whether or not the header is
// currently slim.
export function scrollToElement(el, behavior = 'smooth') {
  const header = document.querySelector('.app-header');
  if (!el || !header) return;
  const slimH = parseFloat(document.documentElement.style.getPropertyValue('--slim-header-height')) || measureSlimHeaderHeight();
  const isSlim = header.classList.contains('app-header--slim');
  const shift = isSlim ? 0 : header.getBoundingClientRect().height - slimH;
  const top = el.getBoundingClientRect().top + window.scrollY - shift - slimH - HEADER_GAP;
  window.scrollTo({ top: Math.max(0, top), behavior });
}
