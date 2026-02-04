const form = document.getElementById('forgotForm');
const message = document.getElementById('message');
const linkWrap = document.getElementById('linkWrap');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = '';
    linkWrap.innerHTML = '';

    const email = document.getElementById('email').value.trim();

    try {
        const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (!res.ok) {
            message.textContent = data.error || 'Something went wrong.';
            return;
        }

        message.textContent = data.message;

        // For demo: show reset link if provided
        if (data.resetUrl) {
            const a = document.createElement('a');
            a.href = data.resetUrl;
            a.textContent = 'Click here to reset your password';
            a.className = 'helpText';
            a.style.textDecoration = 'underline';
            linkWrap.appendChild(a);
        }

        form.reset();
    } catch (err) {
        console.error(err);
        message.textContent = 'Network error.';
    }
});
