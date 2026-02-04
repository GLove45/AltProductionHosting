import {
  startRegistration,
  startAuthentication,
} from 'https://unpkg.com/@simplewebauthn/browser@9.0.1/dist/bundle/index.es2015.js';

const packagesContainer = document.getElementById('packages');
const authMessage = document.getElementById('authMessage');
const sessionStatus = document.getElementById('sessionStatus');
const logoutButton = document.getElementById('logoutButton');

const setMessage = (message, isError = false) => {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#fca5a5' : '';
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
};

const renderPackages = (packages = []) => {
  packagesContainer.innerHTML = '';
  if (!packages.length) {
    packagesContainer.innerHTML = '<p class="hint">No packages loaded yet.</p>';
    return;
  }

  packages.forEach((pkg) => {
    const card = document.createElement('div');
    card.className = 'package';
    card.innerHTML = `
      <div>
        <h3>${pkg.name}</h3>
        <p>Version: ${pkg.version}</p>
      </div>
      <div class="package__actions">
        <button class="button" data-action="install">Install</button>
        <button class="button button--secondary" data-action="update">Update</button>
        <button class="button button--secondary" data-action="restart">Restart</button>
        <button class="button button--ghost" data-action="remove">Remove</button>
      </div>
    `;

    card.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', async () => {
        setMessage('Sending command...');
        try {
          const result = await fetchJson(`/api/packages/${pkg.name}/action`, {
            method: 'POST',
            body: JSON.stringify({ action: button.dataset.action }),
          });
          setMessage(result.message || `Command queued: ${result.command}`);
        } catch (error) {
          setMessage(error.message, true);
        }
      });
    });

    packagesContainer.appendChild(card);
  });
};

const loadPackages = async () => {
  try {
    const data = await fetchJson('/api/packages');
    renderPackages(data.packages);
  } catch (error) {
    renderPackages([]);
  }
};

const updateSessionStatus = async () => {
  try {
    const session = await fetchJson('/api/session');
    if (session.authenticated) {
      sessionStatus.textContent = `Signed in as ${session.user.displayName}`;
      logoutButton.disabled = false;
      await loadPackages();
      return;
    }
    sessionStatus.textContent = 'Not signed in';
    logoutButton.disabled = true;
  } catch (error) {
    sessionStatus.textContent = 'Session unavailable';
    logoutButton.disabled = true;
  }
};

document.getElementById('registerButton').addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const displayName = document.getElementById('displayName').value.trim() || username;
  if (!username) {
    setMessage('Enter a username to register.', true);
    return;
  }
  try {
    setMessage('Preparing registration...');
    const options = await fetchJson('/api/register/options', {
      method: 'POST',
      body: JSON.stringify({ username, displayName }),
    });
    const attestation = await startRegistration(options);
    await fetchJson('/api/register/verify', {
      method: 'POST',
      body: JSON.stringify(attestation),
    });
    setMessage('Registration complete. You are signed in.');
    await updateSessionStatus();
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('loginButton').addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  if (!username) {
    setMessage('Enter your username to sign in.', true);
    return;
  }
  try {
    setMessage('Preparing login...');
    const options = await fetchJson('/api/login/options', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    const assertion = await startAuthentication(options);
    await fetchJson('/api/login/verify', {
      method: 'POST',
      body: JSON.stringify(assertion),
    });
    setMessage('Authentication successful.');
    await updateSessionStatus();
  } catch (error) {
    setMessage(error.message, true);
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    await fetchJson('/api/logout', { method: 'POST' });
    setMessage('Signed out.');
  } catch (error) {
    setMessage(error.message, true);
  }
  await updateSessionStatus();
  renderPackages([]);
});

const searchInput = document.getElementById('packageSearch');
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  const cards = packagesContainer.querySelectorAll('.package');
  cards.forEach((card) => {
    const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
    card.style.display = name.includes(query) ? '' : 'none';
  });
});

updateSessionStatus();
