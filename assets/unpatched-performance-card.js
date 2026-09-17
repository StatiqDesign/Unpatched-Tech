(() => {
  'use strict';

  const mobileQuery = window.matchMedia('(max-width: 740px)');
  const watchedRerenders = new WeakSet();

  function updatePerformanceCard(card, resolution) {
    card.querySelectorAll('[data-up-fps]').forEach((value) => {
      const next = value.getAttribute(`data-fps-${resolution}`);
      if (next) value.textContent = next;
    });

    card.querySelectorAll('[data-up-resolution]').forEach((button) => {
      const selected = button.getAttribute('data-up-resolution') === resolution;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function getRerender(card) {
    const rerender = card.closest('product-rerender');
    if (rerender) return rerender;

    const productId = card.getAttribute('data-product-id');
    return productId
      ? document.querySelector(`product-rerender[id^="product-info-${productId}-"]`)
      : null;
  }

  function getMobileShell(card, rerender) {
    const productId = card.getAttribute('data-product-id');
    if (!productId) return null;

    const selector = `[data-up-performance-mobile-shell="${productId}"]`;
    const shells = Array.from(document.querySelectorAll(selector));
    const shell = shells.shift();

    shells.forEach((duplicate) => duplicate.remove());
    if (shell) return shell;

    const productSection = rerender.closest('section');
    if (!productSection?.parentNode) return null;

    const nextShell = document.createElement('div');
    nextShell.className = 'container up-performance-mobile-shell';
    nextShell.setAttribute('data-up-performance-mobile-shell', productId);
    productSection.insertAdjacentElement('afterend', nextShell);
    return nextShell;
  }

  function removeStaleCards(card) {
    const productId = card.getAttribute('data-product-id');
    if (!productId) return;

    document.querySelectorAll('[data-up-performance-card]').forEach((existing) => {
      if (existing !== card && existing.getAttribute('data-product-id') === productId) {
        existing.remove();
      }
    });

    document.querySelectorAll('[data-up-performance-mobile-shell]').forEach((shell) => {
      if (
        shell.getAttribute('data-up-performance-mobile-shell') === productId &&
        !shell.querySelector('[data-up-performance-card]')
      ) {
        shell.remove();
      }
    });
  }

  function placeCard(card) {
    if (!card?.isConnected) return;

    const sourceBlock = card.closest('[data-block-type="liquid"]');
    const rerender = getRerender(card);
    if (!rerender) return;

    const media = rerender.querySelector('product-media.product__media');

    if (sourceBlock) {
      removeStaleCards(card);
      sourceBlock.style.display = 'none';
      sourceBlock.setAttribute('aria-hidden', 'true');
    }

    if (mobileQuery.matches) {
      const shell = getMobileShell(card, rerender);
      if (shell && card.parentElement !== shell) shell.appendChild(card);
      return;
    }

    if (media && card.parentElement !== media) media.appendChild(card);

    const productId = card.getAttribute('data-product-id');
    const shell = productId
      ? document.querySelector(`[data-up-performance-mobile-shell="${productId}"]`)
      : null;

    if (shell && shell.children.length === 0) shell.remove();
  }

  function placePerformanceCards(root = document) {
    if (root.matches?.('[data-up-performance-card]')) placeCard(root);
    root.querySelectorAll?.('[data-up-performance-card]').forEach(placeCard);
  }

  function mutationContainsPerformanceCard(mutation) {
    return Array.from(mutation.addedNodes).some((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      return node.matches?.('[data-up-performance-card]') || node.querySelector?.('[data-up-performance-card]');
    });
  }

  function watchRerender(rerender) {
    if (!rerender || watchedRerenders.has(rerender)) return;

    const observer = new MutationObserver((mutations) => {
      if (mutations.some(mutationContainsPerformanceCard)) {
        placePerformanceCards(rerender);
      }
    });

    observer.observe(rerender, { childList: true, subtree: true });
    watchedRerenders.add(rerender);
  }

  function initialize(root = document) {
    if (root.matches?.('product-rerender')) watchRerender(root);
    root.querySelectorAll?.('product-rerender').forEach(watchRerender);
    placePerformanceCards(root);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-up-resolution]');
    if (!button) return;

    const card = button.closest('[data-up-performance-card]');
    if (!card) return;

    updatePerformanceCard(card, button.getAttribute('data-up-resolution'));
  });

  const handleViewportChange = () => placePerformanceCards(document);
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', handleViewportChange);
  else mobileQuery.addListener(handleViewportChange);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialize(), { once: true });
  } else {
    initialize();
  }

  if (window.Shopify?.designMode) {
    document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  }
})();
