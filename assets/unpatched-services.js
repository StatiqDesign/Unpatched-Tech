/* ==========================================================================
   UNPATCHED TECH — MAIL-IN SERVICES INTERACTIONS / LITE
   Accordion behavior only. No scroll observers, reveal animation, resize loops,
   mouse tracking, or continuous animation.
   ========================================================================== */

(() => {
  'use strict';

  function initSection(section) {
    if (!section || section.dataset.unpatchedServicesReady === 'true') return;
    section.dataset.unpatchedServicesReady = 'true';

    section.querySelectorAll('[data-service-toggle]').forEach((button) => {
      if (button.dataset.unpatchedToggleReady === 'true') return;
      button.dataset.unpatchedToggleReady = 'true';

      const card = button.closest('[data-service-card]');
      const details = card?.querySelector('[data-service-details]');
      if (!card || !details) return;

      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        details.setAttribute('aria-hidden', open ? 'false' : 'true');
        card.classList.toggle('is-open', open);
      });
    });
  }

  function init(root = document) {
    root.querySelectorAll?.('[data-unpatched-services]').forEach(initSection);
    if (root.matches?.('[data-unpatched-services]')) initSection(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document), { once: true });
  } else {
    init(document);
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
