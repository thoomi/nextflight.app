// Year in footer
document.getElementById('year').textContent = new Date().getFullYear().toString();

// Email form handling
const form = document.getElementById('early-access-form');
const emailInput = document.getElementById('email');
const statusEl = document.getElementById('form-status');
const helpEl = document.getElementById('form-help');

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = 'mt-2 text-sm ' + (type === 'error' ? 'text-red-600' : 'text-green-700');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';

  const email = emailInput.value.trim();
  if (!email) {
    setStatus('Please enter your email.', 'error');
    emailInput.focus();
    return;
  }

  // Basic email pattern
  const emailPattern = /.+@.+\..+/;
  if (!emailPattern.test(email)) {
    setStatus('Please enter a valid email address.', 'error');
    emailInput.focus();
    return;
  }

  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to submit. Please try again.');
    }

    setStatus('Thanks! We’ll be in touch soon.', 'success');
    helpEl.textContent = '';
    form.reset();
  } catch (err) {
    setStatus(err.message || 'Something went wrong. Please try again.', 'error');
  }
});


