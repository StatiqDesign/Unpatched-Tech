(() => {
  'use strict';

  const getSlideshow = () => document.querySelector('.unpatched-home-page .shopify-section--slideshow slide-show');

  function pauseSlideshow() {
    getSlideshow()?.pausePlayer?.();
  }

  function settleSlideshow() {
    const slideshow = getSlideshow();
    if (!slideshow) return;

    slideshow.pausePlayer?.();

    slideshow.querySelectorAll('slide-show-item').forEach((item) => {
      const animations = item.getAnimations?.({ subtree: true }) || [];
      animations.forEach((animation) => {
        try {
          animation.finish();
        } catch (_) {
          animation.cancel();
        }
      });
    });

    slideshow.isTransitioning = false;

    let selectedIndex = Number(slideshow.selectedIndex);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
      selectedIndex = Number(slideshow.pageDots?.selectedIndex);
    }
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) selectedIndex = 0;

    if (Array.isArray(slideshow.items)) {
      slideshow.items.forEach((item, index) => {
        if (index === selectedIndex) item.removeAttribute('hidden');
        else item.setAttribute('hidden', '');
      });
    }

    const dots = Array.from(slideshow.querySelectorAll('.slideshow__progress-bar'));
    dots.forEach((dot) => dot.removeAttribute('aria-current'));

    requestAnimationFrame(() => {
      void slideshow.offsetWidth;

      if (slideshow.pageDots && 'selectedIndex' in slideshow.pageDots) {
        slideshow.pageDots.selectedIndex = selectedIndex;
      } else if (dots[selectedIndex]) {
        dots[selectedIndex].setAttribute('aria-current', 'true');
      }

      requestAnimationFrame(() => slideshow.startPlayer?.());
    });
  }

  window.addEventListener('pagehide', pauseSlideshow);
  window.addEventListener('pageshow', (event) => {
    const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
    const isHistoryRestore = event.persisted || navigationEntry?.type === 'back_forward';
    if (isHistoryRestore) settleSlideshow();
  });
})();