/**
 * Basementen Aegis - UI Primitives
 * Modal management (Escape/overlay dismiss, focus trap, focus restore),
 * toasts, and the styled confirmation dialog.
 */

import { elements } from './dom.js';

/* ==========================================================================
   MODAL HELPERS
   Central open/close so every modal gets Escape-to-dismiss, overlay-click
   dismiss, a Tab focus trap, and focus restored to the triggering element.
   ========================================================================== */

// overlay element -> dismiss function (what Escape / overlay click should do).
// This is a STATIC registry: each of the app's modals registers exactly once
// at startup, and entries deliberately survive open/close cycles (opening and
// closing only toggles the 'hidden' class). Its size is the fixed number of
// modals, so lookups are constant-time — do NOT "clean up" entries on close,
// or Escape/overlay dismissal would break the next time that modal opens.
// Insertion order doubles as stacking priority for topVisibleModal().
const modalRegistry = new Map();

// Focus to restore when each open modal closes (stack: log modal can open
// the reveal modal on top of itself).
const modalFocusStack = [];

export function openModal(overlay) {
    modalFocusStack.push(document.activeElement);
    overlay.classList.remove('hidden');
}

export function closeModal(overlay) {
    overlay.classList.add('hidden');
    const previous = modalFocusStack.pop();
    if (previous && document.contains(previous) && typeof previous.focus === 'function') {
        previous.focus();
    }
}

export function registerModal(overlay, dismiss) {
    modalRegistry.set(overlay, dismiss);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) dismiss();
    });
}

// Topmost visible modal = last visible one in registration order
// (registration order puts stacked-on-top modals later).
function topVisibleModal() {
    let top = null;
    for (const overlay of modalRegistry.keys()) {
        if (!overlay.classList.contains('hidden')) top = overlay;
    }
    return top;
}

/* ==========================================================================
   TOASTS & CONFIRMATION DIALOG
   Non-blocking replacements for alert()/confirm(): notifications become
   toasts; destructive actions go through a styled confirm modal that can
   require typing a phrase before the confirm button unlocks.
   ========================================================================== */

export function showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast glass toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        // Remove after the fade-out transition (fallback timer in case
        // transitions are disabled, e.g. prefers-reduced-motion).
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 600);
    }, duration);
}

/**
 * Styled confirmation dialog. Resolves true if confirmed, false otherwise.
 * With `typePhrase` set, the confirm button stays disabled until the user
 * types the phrase exactly — used for irreversible wipe actions.
 */
export function showConfirm({ title, message, confirmLabel = 'Confirm', danger = false, typePhrase = null }) {
    return new Promise((resolve) => {
        elements.confirmModalTitle.textContent = title;
        elements.confirmModalMessage.textContent = message;
        elements.confirmModalOk.textContent = confirmLabel;
        elements.confirmModalOk.classList.toggle('btn-danger', danger);
        elements.confirmModalOk.classList.toggle('btn-primary', !danger);

        if (typePhrase) {
            elements.confirmModalTypeGroup.classList.remove('hidden');
            elements.confirmModalTypeLabel.textContent = `Type ${typePhrase} to confirm:`;
            elements.confirmModalTypeInput.value = '';
            elements.confirmModalOk.disabled = true;
            elements.confirmModalTypeInput.oninput = () => {
                elements.confirmModalOk.disabled = elements.confirmModalTypeInput.value !== typePhrase;
            };
            elements.confirmModalTypeInput.onkeydown = (e) => {
                if (e.key === 'Enter' && !elements.confirmModalOk.disabled) {
                    e.preventDefault();
                    elements.confirmModalOk.click();
                }
            };
        } else {
            elements.confirmModalTypeGroup.classList.add('hidden');
            elements.confirmModalOk.disabled = false;
        }

        const finish = (value) => {
            closeModal(elements.confirmModal);
            elements.confirmModalOk.onclick = null;
            elements.confirmModalCancel.onclick = null;
            elements.confirmModalTypeInput.oninput = null;
            elements.confirmModalTypeInput.onkeydown = null;
            resolve(value);
        };

        elements.confirmModalOk.onclick = () => finish(true);
        elements.confirmModalCancel.onclick = () => finish(false);

        openModal(elements.confirmModal);
        if (typePhrase) {
            elements.confirmModalTypeInput.focus();
        } else {
            elements.confirmModalCancel.focus();
        }
    });
}

document.addEventListener('keydown', (e) => {
    const overlay = topVisibleModal();
    if (!overlay) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        modalRegistry.get(overlay)();
    } else if (e.key === 'Tab') {
        // Keep Tab cycling inside the open modal
        const focusables = Array.from(
            overlay.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled && el.offsetParent !== null);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});
