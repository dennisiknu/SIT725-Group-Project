const form = document.getElementById('loginForm');
const message = document.getElementById('message');
const logoutBtn = document.getElementById('logoutBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            message.textContent = data.error || 'Login failed.';
            return;
        }

        message.textContent = 'Login successful!';
        form.reset();
    } catch (err) {
        console.error(err);
        message.textContent = 'Network error.';
    }
});

logoutBtn.addEventListener('click', async () => {
    message.textContent = '';

    try {
        const res = await fetch('/api/logout', {
            method: 'POST'
        });

        const data = await res.json();
        message.textContent = data.message;
    } catch (err) {
        console.error(err);
        message.textContent = 'Logout failed.';
    }
});