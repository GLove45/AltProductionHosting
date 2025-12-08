const STORAGE_KEY = "aph_static_portal_state_v1";
const packages = [
  { id: "starter", name: "Starter", storage: "10 GB", domains: 6, price: 8 },
  { id: "growth", name: "Growth", storage: "50 GB", domains: 15, price: 18 },
  { id: "pro", name: "Pro", storage: "200 GB", domains: "∞", price: 44 },
];

const state = loadState();

document.addEventListener("DOMContentLoaded", () => {
  wireHeroButtons();
  renderApp();
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { users: [], domains: [], currentUserId: null };
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Unable to load state", err);
    return { users: [], domains: [], currentUserId: null };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setCurrentUser(userId) {
  state.currentUserId = userId;
  persistState();
  renderApp();
}

function currentUser() {
  return state.users.find((u) => u.id === state.currentUserId) || null;
}

function renderApp() {
  const app = document.querySelector("#app");
  const user = currentUser();
  if (!app) return;

  updateHeroStats();
  renderIntegrationSignals();

  if (!user) {
    app.innerHTML = renderRegistration();
    bindRegistrationEvents();
    return;
  }

  app.innerHTML = renderDashboard(user);
  bindDashboardEvents();
}

function wireHeroButtons() {
  const openRegister = document.getElementById("open-register");
  const openDashboard = document.getElementById("open-dashboard");

  openRegister?.addEventListener("click", () => {
    document.querySelector("#app")?.scrollIntoView({ behavior: "smooth" });
    state.currentUserId = null;
    persistState();
    renderApp();
  });

  openDashboard?.addEventListener("click", () => {
    document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
    renderApp();
  });
}

function renderRegistration() {
  return `
    <div class="panel__header">
      <p class="pill pill--info">Register</p>
      <div>
        <h2>Create your control panel login</h2>
        <p class="muted">The request is submitted to our Python automation to provision DNS, SSL, and hosting space.</p>
      </div>
    </div>
    <form id="register-form" class="form">
      <label class="field">
        <span>Full name</span>
        <input name="name" type="text" required placeholder="Alex Admin" />
      </label>
      <label class="field">
        <span>Email</span>
        <input name="email" type="email" required placeholder="you@example.com" />
      </label>
      <label class="field">
        <span>Password</span>
        <input name="password" type="password" minlength="8" required placeholder="Create a strong password" />
      </label>
      <label class="checkbox">
        <input type="checkbox" name="allow-bots" /> Allow Google & Bing to crawl by default
      </label>
      <button class="btn primary" type="submit">Create account</button>
      <p class="fine-print">We return a JSON payload ready for your Python process; nothing is stored beyond this browser demo.</p>
    </form>
  `;
}

function bindRegistrationEvents() {
  const form = document.getElementById("register-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      id: crypto.randomUUID(),
      name: data.get("name"),
      email: data.get("email"),
      password: data.get("password"),
      allowBots: Boolean(data.get("allow-bots")),
      createdAt: new Date().toISOString(),
    };

    await simulateApi("/api/users", payload);
    state.users.push(payload);
    setCurrentUser(payload.id);
  });
}

function renderDashboard(user) {
  const userDomains = state.domains.filter((d) => d.userId === user.id);
  const usage = summarizeUsage(userDomains);
  return `
    <div id="dashboard" class="panel__header">
      <p class="pill pill--success">Dashboard</p>
      <div>
        <h2>Welcome back, ${user.name}</h2>
        <p class="muted">Track domains, assign packages, and request SSL/DNS automation.</p>
      </div>
      <button class="btn ghost" id="logout">Switch account</button>
    </div>

    <div class="insights">
      <div class="insight">
        <p class="muted">Domains</p>
        <h3>${usage.totalDomains}</h3>
        <p class="subtle">${usage.packageSpread}</p>
      </div>
      <div class="insight">
        <p class="muted">Storage allocated</p>
        <h3>${usage.storage}</h3>
        <p class="subtle">Based on selected packages</p>
      </div>
      <div class="insight">
        <p class="muted">Crawler policy</p>
        <h3>${usage.crawlerPolicy}</h3>
        <p class="subtle">Applied per domain</p>
      </div>
    </div>

    <form id="domain-form" class="form card">
      <div class="form__header">
        <div>
          <p class="pill">Add domain</p>
          <h3>Register a new domain to this account</h3>
          <p class="muted">Submit your domain and hosting package. We push JSON to the Python domain registrar.</p>
        </div>
        <button class="btn ghost" type="button" id="seed-demo">Seed demo data</button>
      </div>
      <div class="field-group">
        <label class="field">
          <span>Domain</span>
          <input name="domain" type="text" required placeholder="example.com" />
        </label>
        <label class="field">
          <span>Package</span>
          <select name="package" required>
            ${packages
              .map((pkg) => `<option value="${pkg.id}">${pkg.name} · ${pkg.storage} · £${pkg.price}/mo</option>`)
              .join("")}
          </select>
        </label>
      </div>
      <div class="field-group">
        <label class="checkbox"><input type="checkbox" name="allowGoogle" /> Allow Googlebot</label>
        <label class="checkbox"><input type="checkbox" name="allowBing" /> Allow Bingbot</label>
      </div>
      <button class="btn primary" type="submit">Register domain</button>
    </form>

    <div class="card domain-list">
      <div class="form__header">
        <div>
          <p class="pill pill--info">Portfolio</p>
          <h3>Your domains</h3>
          <p class="muted">Pending + active registrations with chosen packages.</p>
        </div>
        <span class="badge">${userDomains.length}</span>
      </div>
      <div class="domain-table">
        <div class="domain-table__head">
          <span>Domain</span>
          <span>Package</span>
          <span>Search bots</span>
          <span>Status</span>
          <span></span>
        </div>
        ${userDomains
          .map((domain) => {
            const pkg = packages.find((p) => p.id === domain.package);
            return `
              <div class="domain-row">
                <div>
                  <strong>${domain.domain}</strong>
                  <p class="subtle">Added ${new Date(domain.createdAt).toLocaleDateString()}</p>
                </div>
                <span class="badge">${pkg?.name ?? domain.package}</span>
                <span>${domain.allowGoogle ? "Google" : "No Google"} · ${domain.allowBing ? "Bing" : "No Bing"}</span>
                <span class="status ${domain.status}">${domain.status}</span>
                <button class="btn text" data-domain-id="${domain.id}">Remove</button>
              </div>
            `;
          })
          .join("") || '<p class="muted">No domains yet. Add your first domain above.</p>'}
      </div>
    </div>
  `;
}

function bindDashboardEvents() {
  const logout = document.getElementById("logout");
  logout?.addEventListener("click", () => {
    setCurrentUser(null);
  });

  const form = document.getElementById("domain-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      id: crypto.randomUUID(),
      userId: state.currentUserId,
      domain: data.get("domain"),
      package: data.get("package"),
      allowGoogle: Boolean(data.get("allowGoogle")),
      allowBing: Boolean(data.get("allowBing")),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await simulateApi("/api/domains", payload);
    state.domains.push(payload);
    persistState();
    renderApp();
  });

  document.querySelectorAll(".domain-row .btn.text").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const domainId = event.currentTarget.getAttribute("data-domain-id");
      state.domains = state.domains.filter((d) => d.id !== domainId);
      persistState();
      renderApp();
    });
  });

  const seedButton = document.getElementById("seed-demo");
  seedButton?.addEventListener("click", () => seedDemo());
}

function summarizeUsage(domains) {
  const totalDomains = domains.length;
  const packageSpread = packages
    .map((pkg) => {
      const count = domains.filter((d) => d.package === pkg.id).length;
      return `${pkg.name}: ${count}`;
    })
    .join(" · ");
  const storage = domains.reduce((acc, domain) => {
    const pkg = packages.find((p) => p.id === domain.package);
    if (!pkg) return acc;
    const numeric = Number(pkg.storage.replace(/[^0-9.]/g, ""));
    return acc + (isNaN(numeric) ? 0 : numeric);
  }, 0);
  const crawlerPolicy = domains.length === 0
    ? "Not configured"
    : domains.every((d) => d.allowGoogle || d.allowBing)
    ? "Open"
    : domains.some((d) => d.allowGoogle || d.allowBing)
    ? "Mixed"
    : "Restricted";

  return {
    totalDomains,
    packageSpread: packageSpread || "No packages yet",
    storage: storage ? `${storage} GB allocated` : "Awaiting first package",
    crawlerPolicy,
  };
}

async function simulateApi(path, payload) {
  const request = { path, payload };
  const logEntry = `POST ${path} — ${JSON.stringify(payload, null, 2)}`;
  addIntegrationSignal(logEntry);
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true, request }), 300));
}

function addIntegrationSignal(message) {
  const list = document.getElementById("integration-signals");
  if (!list) return;
  const item = document.createElement("li");
  item.textContent = message;
  list.prepend(item);
}

function renderIntegrationSignals() {
  const list = document.getElementById("integration-signals");
  if (!list) return;
  list.innerHTML = "";
  state.domains.slice(-4).forEach((domain) => {
    list.prepend(
      Object.assign(document.createElement("li"), {
        textContent: `POST /api/domains — ${domain.domain} (${domain.package})`,
      })
    );
  });
}

function updateHeroStats() {
  document.getElementById("stat-active-domains").textContent = state.domains.length.toString();
}

function seedDemo() {
  const demoDomains = [
    {
      id: crypto.randomUUID(),
      userId: state.currentUserId,
      domain: "example.com",
      package: "starter",
      allowGoogle: true,
      allowBing: true,
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      userId: state.currentUserId,
      domain: "shop.example.com",
      package: "growth",
      allowGoogle: true,
      allowBing: false,
      status: "provisioning",
      createdAt: new Date().toISOString(),
    },
  ];

  state.domains.push(...demoDomains);
  persistState();
  renderApp();
}
