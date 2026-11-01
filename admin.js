async function confirmSession() {
  try {
    const response = await fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) window.location.replace('/login');
  } catch {
    document.querySelector('.admin-welcome > p').textContent = 'The sign-in service could not be reached. Please return to the login page and try again.';
  }
}
confirmSession();

document.querySelector('#logout-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    window.location.replace('/login');
  }
});
