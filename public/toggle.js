document.addEventListener('DOMContentLoaded', () => {
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    passwordInputs.forEach((input) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';

        const parent = input.parentNode;
        parent.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'toggle-password';
        toggleButton.setAttribute('aria-label', 'Show password');
        toggleButton.innerHTML = '👁️';
        toggleButton.style.position = 'absolute';
        toggleButton.style.right = '10px';
        toggleButton.style.border = 'none';
        toggleButton.style.background = 'transparent';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontSize = '1rem';
        wrapper.appendChild(toggleButton);

        input.style.paddingRight = '42px';
        input.style.width = '100%';

        toggleButton.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggleButton.textContent = isPassword ? '🙈' : '👁️';
            toggleButton.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    });

    const form = document.querySelector('form');
    const messageBox = document.getElementById('form-message');

    if (form && messageBox) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            messageBox.textContent = '';

            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
                });

                const data = await response.json().catch(() => ({ message: 'Request failed' }));
                messageBox.textContent = data.message || 'Something went wrong';

                if (response.ok && data.redirect) {
                  window.location.href = data.redirect;
                  return;
                }
            } catch (error) {
                messageBox.textContent = 'Unable to reach the server';
            }
        });
    }
});
