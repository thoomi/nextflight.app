// Year in footer
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear().toString();
}

// Email form handling
const form = document.getElementById('early-access-form');
const emailInput = document.getElementById('email');
const statusEl = document.getElementById('form-status');
const helpEl = document.getElementById('form-help');

if (
  form instanceof HTMLFormElement &&
  emailInput instanceof HTMLInputElement &&
  statusEl instanceof HTMLElement &&
  helpEl instanceof HTMLElement
) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (!(submitButton instanceof HTMLButtonElement)) {
    console.warn('Early access submit button is missing.');
  } else {
    const defaultHelpText = helpEl.textContent;

    const resetStatus = () => {
      statusEl.textContent = '';
      statusEl.className = 'form-status';
    };

    const setStatus = (message, type) => {
      statusEl.textContent = message;
      statusEl.className = 'form-status';
      if (type === 'error') {
        statusEl.classList.add('form-status--error');
      }
      if (type === 'success') {
        statusEl.classList.add('form-status--success');
      }
    };

    const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetStatus();

      const email = emailInput.value.trim();
      if (!email) {
        setStatus('Please enter your email.', 'error');
        emailInput.focus();
        return;
      }

      if (!validateEmail(email)) {
        setStatus('Please enter a valid email address.', 'error');
        emailInput.focus();
        return;
      }

      if (!navigator.onLine) {
        setStatus('You appear to be offline. Try again when you’re connected.', 'error');
        return;
      }

      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');

      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Failed to submit. Please try again.');
        }

        setStatus('Thanks! We’ll be in touch soon.', 'success');
        helpEl.textContent = '';
        form.reset();
      } catch (err) {
        const fallbackMessage = 'Something went wrong. Please try again.';
        const message = err instanceof Error && err.message ? err.message : fallbackMessage;
        setStatus(message, 'error');
        helpEl.textContent = defaultHelpText ?? '';
      } finally {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
      }
    });
  }
} else {
  console.warn('Early access form is missing expected elements.');
}

// Mobile menu toggle
const menuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => {
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!isExpanded));
    mobileMenu.classList.toggle('hidden');
  });

  // Close menu when clicking a link
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuBtn.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.add('hidden');
    });
  });
}
