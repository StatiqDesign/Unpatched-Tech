(() => {
  'use strict';

  const STORAGE_KEY = 'unpatched-order-lookup';

  const normalizeOrderNumber = (value) =>
    String(value || '')
      .trim()
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase();

  const parseOrders = (root) => {
    const data = root.querySelector('[data-order-tracker-orders]');
    if (!data) return [];

    try {
      const parsed = JSON.parse(data.textContent || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('[Unpatched] Unable to read customer order data.', error);
      return [];
    }
  };

  const savePendingLookup = (orderNumber, email) => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ orderNumber, email, createdAt: Date.now() })
      );
    } catch (_) {}
  };

  const readPendingLookup = () => {
    try {
      const value = sessionStorage.getItem(STORAGE_KEY);
      if (!value) return null;

      const parsed = JSON.parse(value);
      const age = Date.now() - Number(parsed.createdAt || 0);

      if (!parsed.orderNumber || !parsed.email || age > 30 * 60 * 1000) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed;
    } catch (_) {
      return null;
    }
  };

  const clearPendingLookup = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  };

  const initializeTracker = (root) => {
    if (!root || root.dataset.trackerInitialized === 'true' || root.dataset.mode !== 'shopify') return;
    root.dataset.trackerInitialized = 'true';

    const form = root.querySelector('[data-order-tracker-form]');
    const orderInput = root.querySelector('[data-order-number]');
    const emailInput = root.querySelector('[data-order-email]');
    const submitButton = root.querySelector('[data-track-submit]');
    const message = root.querySelector('[data-order-message]');
    const ordersLink = root.querySelector('[data-orders-link]');

    if (!form || !orderInput || !emailInput || !submitButton || !message) return;

    const isAuthenticated = root.dataset.authenticated === 'true';
    const accountsEnabled = root.dataset.accountsEnabled === 'true';
    const orders = parseOrders(root);

    const setBusy = (busy) => {
      submitButton.setAttribute('aria-busy', busy ? 'true' : 'false');
      submitButton.disabled = busy;
    };

    const setMessage = (text, tone = 'info') => {
      message.textContent = text;
      message.dataset.tone = tone;
      message.hidden = !text;
    };

    const clearValidation = () => {
      orderInput.removeAttribute('aria-invalid');
      emailInput.removeAttribute('aria-invalid');
      setMessage('');
      if (ordersLink) ordersLink.hidden = true;
    };

    const validate = () => {
      clearValidation();

      let valid = true;
      const orderNumber = orderInput.value.trim();
      const email = emailInput.value.trim();

      if (!orderNumber) {
        orderInput.setAttribute('aria-invalid', 'true');
        valid = false;
      }

      if (!email || !emailInput.validity.valid) {
        emailInput.setAttribute('aria-invalid', 'true');
        valid = false;
      }

      if (!valid) {
        setMessage(root.dataset.messageValidation, 'error');
      }

      return valid;
    };

    const findOrder = (orderNumber) => {
      const normalized = normalizeOrderNumber(orderNumber);
      return orders.find((order) => normalizeOrderNumber(order.number) === normalized);
    };

    const openOrder = (orderNumber) => {
      const order = findOrder(orderNumber);

      if (order?.url) {
        clearPendingLookup();
        setBusy(true);
        window.location.assign(order.url);
        return true;
      }

      setBusy(false);
      setMessage(root.dataset.messageNotFound, 'error');
      if (ordersLink) ordersLink.hidden = false;
      return false;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!validate()) return;

      const orderNumber = orderInput.value.trim();
      const email = emailInput.value.trim();

      if (!accountsEnabled) {
        setMessage(root.dataset.messageAccountsDisabled, 'error');
        return;
      }

      if (isAuthenticated) {
        setBusy(true);
        window.setTimeout(() => openOrder(orderNumber), 180);
        return;
      }

      savePendingLookup(orderNumber, email);
      setBusy(true);
      setMessage(root.dataset.messageVerifying);

      const loginUrl = root.dataset.loginUrl;
      if (!loginUrl) {
        setBusy(false);
        setMessage(root.dataset.messageLoginError, 'error');
        return;
      }

      const separator = loginUrl.includes('?') ? '&' : '?';
      window.location.assign(`${loginUrl}${separator}login_hint=${encodeURIComponent(email)}`);
    });

    [orderInput, emailInput].forEach((input) => {
      input.addEventListener('input', () => {
        input.removeAttribute('aria-invalid');
        if (!message.hidden) setMessage('');
        if (ordersLink) ordersLink.hidden = true;
      });
    });

    if (isAuthenticated) {
      const pending = readPendingLookup();

      if (pending) {
        orderInput.value = pending.orderNumber;
        emailInput.value = pending.email;
        setMessage(root.dataset.messageOpening);
        setBusy(true);
        window.setTimeout(() => openOrder(pending.orderNumber), 260);
      }
    }
  };

  const initializeAll = (scope = document) => {
    scope.querySelectorAll?.('[data-order-tracker]').forEach(initializeTracker);
    if (scope.matches?.('[data-order-tracker]')) initializeTracker(scope);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeAll(), { once: true });
  } else {
    initializeAll();
  }

  document.addEventListener('shopify:section:load', (event) => initializeAll(event.target));
})();
