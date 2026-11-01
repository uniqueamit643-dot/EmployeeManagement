const form = document.querySelector('#login-form');
const errorText = document.querySelector('#login-error');

fetch('/api/admin/session', { credentials: 'same-origin' }).then((response) => {
  if (response.ok) window.location.replace('/admin');
}).catch(() => {});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorText.textContent = '';
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.innerHTML = 'Checking…';
  const formData = new FormData(form);
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: formData.get('username'), password: formData.get('password') })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Sign in failed.');
    window.location.replace('/admin');
  } catch (error) {
    errorText.textContent = error.message || 'Could not reach the sign-in service. Please try again.';
    button.disabled = false;
    button.innerHTML = 'Sign in securely <span>↗</span>';
  }
});
