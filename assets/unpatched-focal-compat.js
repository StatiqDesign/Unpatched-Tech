(() => {
  'use strict';

  /*
   * UNPATCHED TECH — FOCAL 13 COMPATIBILITY LAYER
   *
   * Keep all deliberate hooks into Focal custom-element methods here. These
   * integrations depend on theme internals and should be regression-tested
   * whenever the underlying Focal version changes.
   */

  const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobileHeroViewport = window.matchMedia('(max-width: 749px)');

  function tuneMobileHeroFade(item) {
    if (!mobileHeroViewport.matches || !item.closest('.unpatched-home-page .shopify-section--slideshow')) return;

    requestAnimationFrame(() => {
      item.getAnimations().forEach((animation) => {
        const effect = animation.effect;
        if (!effect || effect.target !== item || !effect.getKeyframes || !effect.updateTiming) return;

        const keyframes = effect.getKeyframes();
        const timing = effect.getTiming?.();
        const fadesOpacity = keyframes.some((frame) => frame.opacity !== undefined);

        if (!fadesOpacity || Number(timing?.duration) !== 250) return;

        effect.updateTiming({
          duration: 420,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        });
      });
    });
  }

  async function installMobileHeroFadeTuning() {
    if (!document.querySelector('.unpatched-home-page .shopify-section--slideshow')) return;

    await customElements.whenDefined('slide-show-item');

    const SlideShowItem = customElements.get('slide-show-item');
    const prototype = SlideShowItem?.prototype;
    if (!prototype || prototype.__unpatchedMobileFadeTuned) return;

    const originalEnter = prototype.transitionToEnter;
    const originalLeave = prototype.transitionToLeave;
    if (typeof originalEnter !== 'function' || typeof originalLeave !== 'function') return;

    prototype.transitionToEnter = function (...args) {
      const result = originalEnter.apply(this, args);
      if (args[0] === 'fade') tuneMobileHeroFade(this);
      return result;
    };

    prototype.transitionToLeave = function (...args) {
      const result = originalLeave.apply(this, args);
      if (args[0] === 'fade') tuneMobileHeroFade(this);
      return result;
    };

    prototype.__unpatchedMobileFadeTuned = true;
  }

  function initDesktopNavigation(root = document) {
    const nav = root.matches?.('desktop-navigation') ? root : root.querySelector?.('desktop-navigation');
    if (!nav || nav.dataset.unpatchedTwoClick === 'true') return;

    nav.dataset.unpatchedTwoClick = 'true';

    const originalCloseDropdown = nav.closeDropdown?.bind(nav);
    if (!originalCloseDropdown || typeof nav.openDropdown !== 'function') return;

    let lockedLink = null;
    let lockedParent = null;

    nav.closeDropdown = function (parent) {
      if (lockedParent && parent === lockedParent) return;
      return originalCloseDropdown(parent);
    };

    const unlock = (close = true) => {
      if (!lockedParent) return;

      const parentToClose = lockedParent;
      if (lockedLink) delete lockedLink.dataset.unpatchedLocked;
      lockedLink = null;
      lockedParent = null;

      if (close) originalCloseDropdown(parentToClose);
    };

    nav.addEventListener(
      'click',
      (event) => {
        if (!desktopPointer.matches) return;

        const link = event.target.closest('.header__linklist-link[aria-controls]');
        if (!link || !nav.contains(link)) return;

        if (lockedLink === link) {
          unlock(false);
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (lockedParent) unlock(true);

        lockedLink = link;
        lockedParent = link.parentElement;
        link.dataset.unpatchedLocked = 'true';
        nav.openDropdown(lockedParent);
      },
      true
    );

    document.addEventListener(
      'click',
      (event) => {
        if (lockedParent && !lockedParent.contains(event.target)) unlock(true);
      },
      true
    );
  }

  function initialize(root = document) {
    initDesktopNavigation(root);
  }

  installMobileHeroFadeTuning();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialize(), { once: true });
  } else {
    initialize();
  }

  if (window.Shopify?.designMode) {
    document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  }
})();
