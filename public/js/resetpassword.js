const form = document.getElementById('resetForm');
const message = document.getElementById('message');

function getToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = '';

    const token = getToken();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    if (!token) {
        message.textContent = 'Missing reset token.';
        return;
    }

    if (password.length < 6) {
        message.textContent = 'Password must be at least 6 characters.';
        return;
    }

    if (password !== confirm) {
        message.textContent = 'Passwords do not match.';
        return;
    }

    try {
        const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });

        const data = await res.json();

        if (!res.ok) {
            message.textContent = data.error || 'Reset failed.';
            return;
        }

        message.textContent = data.message;
        form.reset();
    } catch (err) {
        console.error(err);
        message.textContent = 'Network error.';
    }
});
