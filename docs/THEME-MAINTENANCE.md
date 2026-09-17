# Unpatched Tech Theme Maintenance

This theme is based on Focal 13.0.0 and includes an Unpatched Tech customization layer. The goal of the customization layer is to keep merchant-editable content in Shopify while making custom code predictable to maintain and safe to extend.

## Production workflow

- `main` is the production source branch.
- Develop substantial code changes on a branch and merge them through a pull request.
- `.github/workflows/theme-check.yml` runs Shopify Theme Check for pull requests and pushes to `main`.
- Configure the GitHub repository rules for `main` so the `Shopify Theme Check` status is required before normal code changes can merge.
- Shopify Theme Editor generated JSON such as `config/settings_data.json` and JSON templates can still change from Shopify. Avoid putting essential CSS or JavaScript inside those generated JSON files.

## Code ownership

### Liquid

Liquid owns markup, Shopify data access, schema settings, and small dynamic CSS custom-property values. Avoid embedding reusable static `<style>` or `<script>` blocks inside snippets, sections, or JSON custom-Liquid settings.

### CSS

Reusable styles live under `assets/` and are loaded by the component or by `snippets/unpatched-style-loader.liquid` for page-level styles.

Product-page responsibilities are split into:

- `unpatched-product.css` — base product presentation and controls.
- `unpatched-product-components.css` — reusable product components such as the PC selector, performance card, and product banners.
- `unpatched-product-mobile.css` — mobile interaction-specific rules.
- `unpatched-product-final.css` — the final product-page surface and spacing contract.
- `unpatched-disclosure-sync.css` — disclosure/accordion component behavior.

Do not add new `*-cleanup.css`, `*-fix.css`, or one-off override layers. Update the owning asset instead.

### JavaScript

- `custom.js` contains general storefront behavior that does not intentionally replace Focal internals.
- `unpatched-focal-compat.js` contains deliberate compatibility hooks into Focal custom elements. Review this file whenever Focal is upgraded.
- `unpatched-history-restore.js` is a homepage back/forward-cache recovery workaround and also depends on Focal component state. Regression-test it on Focal upgrades.
- Component-specific behavior should live in its own asset, such as `unpatched-performance-card.js`.

Prefer event delegation and component-scoped observers. Avoid document-wide `MutationObserver` instances unless there is no narrower lifecycle available.

## Gaming PC data

The Gaming PC system selector supports an optional `custom.pc_systems` product-list metafield. When present, that list controls the systems shown. Each linked product can optionally use `custom.pc_tier_label` for the button label. The current Entry/Mid/High products remain as a backward-compatible fallback.

The Performance card supports `custom.performance_preset` with `entry`, `mid`, or `high` values. Individual FPS metafields continue to override preset defaults. Keep benchmark values in product data whenever a system differs from the fallback presets.

## Product and policy copy

Operational details that may change without a theme release should not be hardcoded into templates. Shipping fallbacks are carrier-neutral so Shopify Markets and shipping-rate configuration remain the source of truth. Product-level metafields can override disclosure copy when needed.

## Order tracking

The storefront tracker is account-based. Shopify authenticates the customer before the theme can expose their recent orders. The order number is matched against the recent orders available to Liquid, and the customer can use the full account order history for older orders. Do not describe this flow as direct email/order-number verification unless a server-side lookup service is added.

## Before merging theme changes

Check at minimum:

- Shopify Theme Check passes.
- Desktop and mobile navigation open, close, and return correctly.
- Collection sort/filter behavior works on mobile and desktop.
- Standard product variants, color swatches, add-to-cart, cart drawer, and sticky mobile purchase controls work.
- Gaming PC selector, specs, performance resolution buttons, and product banners work at desktop and mobile widths.
- Product Details, Judge.me reviews, related products, and disclosures retain their intended layout.
- About, Services, Support, FAQ, tracking, and reusable Theme Editor sections retain their styling when moved to another supported template.
- Safari/iOS back-forward navigation does not restore a blank or half-animated page.

Keep this checklist focused on behavior. Visual one-off fixes should be made in the owning component stylesheet rather than added as a new override layer.
