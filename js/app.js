async function loadDemoData() {
  const response = await fetch('data/demo-data.json');
  if (!response.ok) {
    throw new Error('Не удалось загрузить demo-data.json');
  }
  return response.json();
}

function renderStats(stats) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = stats.map(({ label, value, change, trend }) => `
    <article class="stat-card">
      <p class="stat-card__label">${label}</p>
      <p class="stat-card__value">${value}</p>
      <p class="stat-card__change stat-card__change--${trend}">${change} за месяц</p>
    </article>
  `).join('');
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = products.map(({ name, category, price, emoji }) => `
    <article class="product-card">
      <div class="product-card__img">${emoji}</div>
      <div class="product-card__body">
        <h3 class="product-card__name">${name}</h3>
        <p class="product-card__category">${category}</p>
        <p class="product-card__price">${price}</p>
      </div>
    </article>
  `).join('');
}

function renderUsers(users) {
  const tbody = document.getElementById('users-table');
  tbody.innerHTML = users.map(({ id, name, email, role, status }) => `
    <tr>
      <td>${id}</td>
      <td>${name}</td>
      <td>${email}</td>
      <td>${role}</td>
      <td><span class="status status--${status}">${status === 'active' ? 'Активен' : 'Ожидает'}</span></td>
    </tr>
  `).join('');
}

async function init() {
  try {
    const data = await loadDemoData();
    renderStats(data.stats);
    renderProducts(data.products);
    renderUsers(data.users);
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="background:#f55;color:#fff;padding:1rem;text-align:center;">Ошибка загрузки данных. Запустите локальный сервер.</div>'
    );
  }
}

init();
