(() => {
  'use strict';

  const getSlideshow = () => document.querySelector('.unpatched-home-page .shopify-section--slideshow slide-show');
  const getAnnouncementBar = () => document.querySelector('.shopify-section--announcement-bar announcement-bar');

  function finishAnimations(root) {
    if (!root) return;

    const animations = root.getAnimations?.({ subtree: true }) || [];
    animations.forEach((animation) => {
      try {
        animation.finish();
      } catch (_) {
        animation.cancel();
      }
    });
  }

  function settleSlideshow(restart = true) {
    const slideshow = getSlideshow();
    if (!slideshow) return;

    slideshow.pausePlayer?.();
    finishAnimations(slideshow);
    slideshow.isTransitioning = false;

    let selectedIndex = Number(slideshow.selectedIndex);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
      selectedIndex = Number(slideshow.pageDots?.selectedIndex);
    }
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) selectedIndex = 0;

    const items = Array.isArray(slideshow.items)
      ? slideshow.items
      : Array.from(slideshow.querySelectorAll('slide-show-item'));

    items.forEach((item, index) => {
      item.style.removeProperty('opacity');
      item.style.removeProperty('transform');

      if (index === selectedIndex) item.removeAttribute('hidden');
      else item.setAttribute('hidden', '');
    });

    const dots = Array.from(slideshow.querySelectorAll('.slideshow__progress-bar'));
    dots.forEach((dot) => dot.removeAttribute('aria-current'));

    if (slideshow.pageDots && 'selectedIndex' in slideshow.pageDots) {
      slideshow.pageDots.selectedIndex = selectedIndex;
    } else if (dots[selectedIndex]) {
      dots[selectedIndex].setAttribute('aria-current', 'true');
    }

    if (restart) {
      requestAnimationFrame(() => {
        void slideshow.offsetWidth;
        requestAnimationFrame(() => slideshow.startPlayer?.());
      });
    }
  }

  function settleAnnouncementBar(restart = true) {
    const announcement = getAnnouncementBar();
    if (!announcement) return;

    clearInterval(announcement._interval);
    finishAnimations(announcement);
    announcement.hasPendingTransition = false;

    const items = Array.isArray(announcement.items)
      ? announcement.items
      : Array.from(announcement.querySelectorAll('announcement-bar-item'));

    if (!items.length) return;

    let selectedIndex = Number(announcement.selectedIndex);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
      selectedIndex = items.findIndex((item) => !item.hasAttribute('hidden'));
    }
    if (selectedIndex < 0) selectedIndex = 0;

    items.forEach((item, index) => {
      item.style.removeProperty('opacity');
      item.style.removeProperty('transform');

      if (index === selectedIndex) item.removeAttribute('hidden');
      else item.setAttribute('hidden', '');
    });

    if (restart && announcement.hasAttribute('auto-play')) {
      const cycleSpeed = parseInt(announcement.getAttribute('cycle-speed'), 10);
      if (Number.isFinite(cycleSpeed) && cycleSpeed > 0) {
        announcement._interval = setInterval(() => announcement.next?.(), cycleSpeed * 1000);
      }
    }
  }

  function settleLoadingBar() {
    const loadingBar = document.querySelector('loading-bar');
    if (!loadingBar) return;

    finishAnimations(loadingBar);
    loadingBar.classList.remove('is-visible');
    loadingBar.style.removeProperty('transform');
    loadingBar.style.removeProperty('opacity');
  }

  function settlePage(restart = true) {
    settleSlideshow(restart);
    settleAnnouncementBar(restart);
    settleLoadingBar();
  }

  window.addEventListener('pagehide', () => {
    // Normalize animated UI before Safari/Chrome stores the page in the
    // back-forward cache so the restored snapshot is never mid-transition.
    settlePage(false);
  });

  window.addEventListener('pageshow', (event) => {
    const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
    const isHistoryRestore = event.persisted || navigationEntry?.type === 'back_forward';
    if (isHistoryRestore) settlePage(true);
  });
})();
