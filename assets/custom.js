(() => {
  'use strict';

  const MOBILE_DRAWER = '#mobile-menu-drawer';
  const isIOSSafari = /iP(ad|hone|od)/.test(navigator.userAgent) && /WebKit/.test(navigator.userAgent) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/.test(navigator.userAgent);
  const NAVIGATION_RECOVERY_KEY = 'unpatched-navigation-recovery';

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

  function resetMobileNavigationState({ forDeparture = false } = {}) {
    const drawer = document.querySelector(MOBILE_DRAWER);
    if (!drawer) return;

    if (forDeparture) {
      drawer.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());
      drawer.style.visibility = 'hidden';
      drawer.style.pointerEvents = 'none';
    }

    drawer.classList.remove('unpatched-submenu-open');

    drawer.querySelectorAll('.mobile-nav__item[data-level="1"].unpatched-submenu-active').forEach((item) => {
      const toggle = item.querySelector(':scope > button[aria-controls]');
      const panel = toggle ? document.getElementById(toggle.getAttribute('aria-controls')) : null;

      toggle?.setAttribute('aria-expanded', 'false');
      item.classList.remove('unpatched-submenu-active');

      if (forDeparture && panel) {
        panel.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());
        panel.hidden = true;
        panel.style.display = 'none';
        panel.style.height = '0px';
        panel.style.overflow = 'hidden';
      }
    });

    drawer.querySelectorAll('button[aria-expanded="true"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
  }

  function restoreMobileNavigationAfterHistory() {
    const drawer = document.querySelector(MOBILE_DRAWER);
    if (!drawer) return;

    drawer.style.removeProperty('visibility');
    drawer.style.removeProperty('pointer-events');

    drawer.querySelectorAll('.mobile-nav__item[data-level="1"] > collapsible-content').forEach((panel) => {
      panel.style.removeProperty('display');
      panel.style.removeProperty('height');
      panel.style.removeProperty('overflow');
    });
  }

  function installMobileNavigation() {
    document.addEventListener('click', (event) => {
      const openButton = event.target.closest(`${MOBILE_DRAWER} .mobile-nav__item[data-level="1"] > button[aria-controls]`);

      if (openButton) {
        const item = openButton.closest('.mobile-nav__item[data-level="1"]');
        const drawer = openButton.closest(MOBILE_DRAWER);
        const panel = document.getElementById(openButton.getAttribute('aria-controls'));

        if (item && drawer && panel) {
          panel.hidden = false;
          panel.style.removeProperty('display');
          panel.style.removeProperty('height');
          panel.style.removeProperty('overflow');

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

    /* Focal uses this list when swapping product-card images. Guard the write
       so the customization remains harmless if the implementation changes. */
    if (Array.isArray(productItem.primaryImageList)) {
      productItem.primaryImageList.push(image);
    }

    return image;
  }

  function installDemandLoadedProductCardMedia() {
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

  function recoverBlankIOSPage() {
    if (!isIOSSafari || document.visibilityState === 'hidden') return;

    const main = document.getElementById('main');
    const hasVisiblePage = main && main.childElementCount > 0 && main.getBoundingClientRect().height > 24;
    if (hasVisiblePage) {
      sessionStorage.removeItem(NAVIGATION_RECOVERY_KEY);
      return;
    }

    const previousRecovery = sessionStorage.getItem(NAVIGATION_RECOVERY_KEY);
    const recoveryToken = `${window.location.pathname}${window.location.search}`;
    if (previousRecovery === recoveryToken) return;

    sessionStorage.setItem(NAVIGATION_RECOVERY_KEY, recoveryToken);
    window.location.reload();
  }

  function installIOSNavigationSafety() {
    if (!isIOSSafari) return;

    document.addEventListener(
      'click',
      (event) => {
        const link = event.target.closest?.('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.hasAttribute('download') || link.target === '_blank') return;

        let destination;
        try {
          destination = new URL(link.href, window.location.href);
        } catch (_) {
          return;
        }

        if (destination.origin !== window.location.origin) return;
        if (destination.href === window.location.href || (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash)) return;

        const expectedHref = destination.href;
        window.setTimeout(() => {
          if (document.visibilityState !== 'visible') return;

          if (window.location.href !== expectedHref) {
            window.location.assign(expectedHref);
            return;
          }

          recoverBlankIOSPage();
        }, 1800);
      },
      true
    );

    window.addEventListener('pagehide', () => {
      resetMobileNavigationState({ forDeparture: true });
    });

    window.addEventListener('pageshow', () => {
      restoreMobileNavigationAfterHistory();
      requestAnimationFrame(() => requestAnimationFrame(recoverBlankIOSPage));
    });
  }

  installMobileNavigation();
  installCollectionSort();
  installDemandLoadedProductCardMedia();
  installSlideshowControls();
  installIOSNavigationSafety();
})();
