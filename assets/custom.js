(() => {
  'use strict';

  const MOBILE_DRAWER = '#mobile-menu-drawer';
  const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobileHeroViewport = window.matchMedia('(max-width: 749px)');

  function finishPanelAnimation(panel) {
    if (!panel) return;

    requestAnimationFrame(() => {
      panel.getAnimations().forEach((animation) => {
        try {
          animation.finish();
        } catch (_) {
          animation.cancel();
        }
      });
    });
  }

  function closeMobileSubmenu(item) {
    if (!item) return;

    const drawer = item.closest(MOBILE_DRAWER);
    const toggle = item.querySelector(':scope > button[aria-controls]');
    const panel = toggle ? document.getElementById(toggle.getAttribute('aria-controls')) : null;

    toggle?.setAttribute('aria-expanded', 'false');
    finishPanelAnimation(panel);
    item.classList.remove('unpatched-submenu-active');

    if (drawer && !drawer.querySelector('.mobile-nav__item[data-level="1"].unpatched-submenu-active')) {
      drawer.classList.remove('unpatched-submenu-open');
    }
  }

  function installMobileNavigation() {
    if (!document.querySelector(MOBILE_DRAWER)) return;

    document.addEventListener('click', (event) => {
      const openButton = event.target.closest(`${MOBILE_DRAWER} .mobile-nav__item[data-level="1"] > button[aria-controls]`);

      if (openButton) {
        const item = openButton.closest('.mobile-nav__item[data-level="1"]');
        const drawer = openButton.closest(MOBILE_DRAWER);
        const panel = document.getElementById(openButton.getAttribute('aria-controls'));

        if (item && drawer && panel) {
          drawer
            .querySelectorAll('.mobile-nav__item[data-level="1"].unpatched-submenu-active')
            .forEach((activeItem) => {
              if (activeItem !== item) closeMobileSubmenu(activeItem);
            });

          item.classList.add('unpatched-submenu-active');
          drawer.classList.add('unpatched-submenu-open');
          finishPanelAnimation(panel);
        }
        return;
      }

      const backButton = event.target.closest(`${MOBILE_DRAWER} [data-mobile-menu-back]`);
      if (!backButton) return;

      event.preventDefault();
      event.stopPropagation();
      closeMobileSubmenu(backButton.closest('.mobile-nav__item[data-level="1"]'));
    });
  }

  function installCollectionSort() {
    if (!document.querySelector('[data-unpatched-mobile-sort]')) return;

    document.addEventListener('change', (event) => {
      const sortSelect = event.target.closest('[data-unpatched-mobile-sort]');
      if (!sortSelect) return;

      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      url.searchParams.delete('page');
      window.location.assign(url.toString());
    });
  }

  function ensureProductCardVariantImage(input) {
    if (!input?.dataset.variantFeaturedMedia || !input.dataset.variantImageSrc) return null;

    const productItem = input.closest('product-item');
    if (!productItem) return null;

    const mediaId = input.dataset.variantFeaturedMedia;
    const existingImage = Array.from(productItem.querySelectorAll('.product-item__primary-image')).find(
      (image) => image.dataset.mediaId === mediaId
    );
    if (existingImage) return existingImage;

    const primaryImage = productItem.querySelector('.product-item__primary-image');
    const mediaContainer = primaryImage?.parentElement;
    if (!primaryImage || !mediaContainer) return null;

    const image = document.createElement('img');
    image.className = primaryImage.className;
    image.alt = primaryImage.alt || '';
    image.decoding = 'async';
    image.loading = 'lazy';
    image.hidden = true;
    image.dataset.mediaId = mediaId;
    image.src = input.dataset.variantImageSrc;

    if (input.dataset.variantImageSrcset) image.srcset = input.dataset.variantImageSrcset;
    image.sizes = input.dataset.variantImageSizes || primaryImage.sizes || '100vw';

    const width = Number(input.dataset.variantImageWidth);
    const height = Number(input.dataset.variantImageHeight);
    if (Number.isFinite(width) && width > 0) image.width = width;
    if (Number.isFinite(height) && height > 0) image.height = height;

    mediaContainer.append(image);

    if (Array.isArray(productItem.primaryImageList)) {
      productItem.primaryImageList.push(image);
    }

    return image;
  }

  function installDemandLoadedProductCardMedia() {
    if (!document.querySelector('product-item [data-variant-image-src]')) return;

    document.addEventListener(
      'change',
      (event) => {
        const input = event.target.closest('product-item .product-item-meta__swatch-list .color-swatch__radio[data-variant-image-src]');
        if (input) ensureProductCardVariantImage(input);
      },
      true
    );

    document.addEventListener(
      'mouseenter',
      (event) => {
        const swatch = event.target.closest?.('product-item .product-item-meta__swatch-list .color-swatch__item');
        const input = swatch?.previousElementSibling;
        if (input?.matches?.('.color-swatch__radio[data-variant-image-src]')) {
          ensureProductCardVariantImage(input);
        }
      },
      true
    );
  }

  function installSlideshowControls() {
    if (!document.querySelector('[data-slideshow-direction]')) return;

    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-slideshow-direction]');
      if (!button) return;

      const slideshow = button.closest('slide-show');
      if (!slideshow) return;

      await customElements.whenDefined('slide-show');
      if (!slideshow.isConnected || slideshow.isTransitioning) return;

      if (button.dataset.slideshowDirection === 'previous') {
        slideshow.previous?.();
      } else if (button.dataset.slideshowDirection === 'next') {
        slideshow.next?.();
      }
    });
  }

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

    const originalCloseDropdown = nav.closeDropdown.bind(nav);
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
        nav.openDropdown?.(lockedParent);
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

  function init(root = document) {
    initDesktopNavigation(root);
  }

  installMobileNavigation();
  installCollectionSort();
  installDemandLoadedProductCardMedia();
  installSlideshowControls();
  installMobileHeroFadeTuning();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document), { once: true });
  } else {
    init(document);
  }

  if (window.Shopify?.designMode) {
    document.addEventListener('shopify:section:load', (event) => init(event.target));
  }
})();
