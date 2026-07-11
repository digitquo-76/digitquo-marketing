/* DigitQuo shared panel data and interactions */

const DQ_KEYS = {
  products: 'digitquo_products_v1',
  sales: 'digitquo_sales_v1',
  activity: 'digitquo_activity_v1'
};

const CURRENT_SHOPKEEPER = 'My Store';
const CURRENT_BROKER = 'Partner Broker';

const icons = {
  package: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  sale: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6"/></svg>',
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4z"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6m3 0V4h8v2"/></svg>',
  activity: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
};

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  initShell();

  const panel = document.body.dataset.panel;
  if (panel === 'shopkeeper') initShopkeeperPanel();
  if (panel === 'broker') initBrokerPanel();
  if (panel === 'admin') initAdminPanel();
});

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedDemoData() {
  if (!localStorage.getItem(DQ_KEYS.products)) {
    writeStore(DQ_KEYS.products, [
      createProduct('Premium Cotton Shirts', 'Apparel', 899, 42, 'My Store', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80'),
      createProduct('Classic Leather Wallet', 'Accessories', 649, 18, 'My Store', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=700&q=80'),
      createProduct('Ceramic Dinner Set', 'Home & Living', 1499, 25, 'Sharma Homeware', 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=700&q=80'),
      createProduct('Wireless Earbuds', 'Electronics', 1299, 31, 'Tech Corner', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=700&q=80'),
      createProduct('Handcrafted Tote Bag', 'Accessories', 749, 12, 'Craft & Co.', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=700&q=80'),
      createProduct('Organic Spice Box', 'Food', 499, 55, 'Rajasthan Foods', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=700&q=80')
    ]);
  }

  if (!localStorage.getItem(DQ_KEYS.sales)) {
    const products = readStore(DQ_KEYS.products);
    writeStore(DQ_KEYS.sales, [
      createSale(products[0], 'Anita Retail', 3, 'Market Connect'),
      createSale(products[2], 'Home Style Store', 2, 'Northside Broker')
    ]);
  }

  if (!localStorage.getItem(DQ_KEYS.activity)) {
    writeStore(DQ_KEYS.activity, [
      createActivity('sale', 'Market Connect recorded a sale of 3 × Premium Cotton Shirts.'),
      createActivity('product', 'My Store published Classic Leather Wallet.'),
      createActivity('product', 'Tech Corner updated stock for Wireless Earbuds.'),
      createActivity('sale', 'Northside Broker recorded a ₹2,998 customer sale.')
    ]);
  }
}

function createProduct(name, category, price, stock, seller, image = '', description = '') {
  return {
    id: `prd_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    category,
    price: Number(price),
    stock: Number(stock),
    seller,
    image,
    description,
    createdAt: new Date().toISOString()
  };
}

function createSale(product, customer, quantity, broker) {
  return {
    id: `sale_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    productName: product.name,
    seller: product.seller,
    customer,
    quantity: Number(quantity),
    unitPrice: Number(product.price),
    total: Number(product.price) * Number(quantity),
    broker,
    createdAt: new Date().toISOString()
  };
}

function createActivity(type, message) {
  return {
    id: `act_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type,
    message,
    createdAt: new Date().toISOString()
  };
}

function addActivity(type, message) {
  const items = readStore(DQ_KEYS.activity);
  items.unshift(createActivity(type, message));
  writeStore(DQ_KEYS.activity, items.slice(0, 100));
}

function initShell() {
  const menuButton = document.querySelector('[data-mobile-menu]');
  const scrim = document.querySelector('.sidebar-scrim');
  const modalBackdrops = document.querySelectorAll('.modal-backdrop');

  menuButton?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  scrim?.addEventListener('click', () => document.body.classList.remove('sidebar-open'));

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
  });

  document.querySelectorAll('[data-modal-open]').forEach(button => {
    button.addEventListener('click', () => openModal(button.dataset.modalOpen));
  });

  document.querySelectorAll('[data-modal-close]').forEach(button => {
    button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop')?.id));
  });

  modalBackdrops.forEach(backdrop => {
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) closeModal(backdrop.id);
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(modal => closeModal(modal.id));
      document.body.classList.remove('sidebar-open');
    }
  });

  const dateLabel = document.querySelector('[data-current-date]');
  if (dateLabel) {
    dateLabel.textContent = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date());
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('input:not([type="hidden"]), select, textarea')?.focus(), 80);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initShopkeeperPanel() {
  const form = document.getElementById('product-form');
  const search = document.getElementById('seller-search');

  form?.addEventListener('submit', saveProduct);
  search?.addEventListener('input', renderShopkeeperPanel);

  document.getElementById('add-product-button')?.addEventListener('click', () => {
    resetProductForm();
    openModal('product-modal');
  });

  renderShopkeeperPanel();
}

function renderShopkeeperPanel() {
  const allProducts = readStore(DQ_KEYS.products);
  const myProducts = allProducts.filter(product => product.seller === CURRENT_SHOPKEEPER);
  const myProductIds = new Set(myProducts.map(product => product.id));
  const sales = readStore(DQ_KEYS.sales).filter(sale => myProductIds.has(sale.productId) || sale.seller === CURRENT_SHOPKEEPER);
  const searchValue = (document.getElementById('seller-search')?.value || '').trim().toLowerCase();
  const visibleProducts = myProducts.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(searchValue));

  setText('metric-products', myProducts.length);
  setText('metric-stock', myProducts.reduce((sum, product) => sum + product.stock, 0));
  setText('metric-low-stock', myProducts.filter(product => product.stock > 0 && product.stock <= 10).length);
  setText('metric-shop-sales', formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0)));

  const table = document.getElementById('seller-products-body');
  if (table) {
    table.innerHTML = visibleProducts.length
      ? visibleProducts.map(product => `
        <tr>
          <td>${productCell(product)}</td>
          <td>${escapeHtml(product.category)}</td>
          <td>${formatCurrency(product.price)}</td>
          <td>${product.stock}</td>
          <td>${stockBadge(product.stock)}</td>
          <td>
            <div class="table-actions">
              <button class="icon-button" type="button" aria-label="Edit ${escapeHtml(product.name)}" data-edit-product="${product.id}">${icons.edit}</button>
              <button class="icon-button delete" type="button" aria-label="Delete ${escapeHtml(product.name)}" data-delete-product="${product.id}">${icons.trash}</button>
            </div>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="6"><div class="empty-state"><strong>No products found</strong>Add your first product or adjust your search.</div></td></tr>';

    table.querySelectorAll('[data-edit-product]').forEach(button => {
      button.addEventListener('click', () => editProduct(button.dataset.editProduct));
    });
    table.querySelectorAll('[data-delete-product]').forEach(button => {
      button.addEventListener('click', () => deleteProduct(button.dataset.deleteProduct));
    });
  }

  renderActivity('shop-activity', readStore(DQ_KEYS.activity).filter(item => item.message.includes(CURRENT_SHOPKEEPER) || item.type === 'sale').slice(0, 6));
}

function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const id = String(data.get('id') || '');
  const products = readStore(DQ_KEYS.products);
  const values = {
    name: String(data.get('name') || '').trim(),
    category: String(data.get('category') || '').trim(),
    price: Number(data.get('price')),
    stock: Number(data.get('stock')),
    image: safeImageUrl(String(data.get('image') || '').trim()),
    description: String(data.get('description') || '').trim()
  };

  if (!values.name || !values.category || values.price <= 0 || values.stock < 0) {
    showToast('Please complete all required product fields.', 'error');
    return;
  }

  if (id) {
    const index = products.findIndex(product => product.id === id && product.seller === CURRENT_SHOPKEEPER);
    if (index < 0) return;
    products[index] = { ...products[index], ...values };
    addActivity('product', `${CURRENT_SHOPKEEPER} updated ${values.name}.`);
    showToast('Product updated successfully.', 'success');
  } else {
    products.unshift(createProduct(values.name, values.category, values.price, values.stock, CURRENT_SHOPKEEPER, values.image, values.description));
    addActivity('product', `${CURRENT_SHOPKEEPER} published ${values.name}.`);
    showToast('Product is now available to brokers.', 'success');
  }

  writeStore(DQ_KEYS.products, products);
  closeModal('product-modal');
  resetProductForm();
  renderShopkeeperPanel();
}

function editProduct(id) {
  const product = readStore(DQ_KEYS.products).find(item => item.id === id && item.seller === CURRENT_SHOPKEEPER);
  if (!product) return;
  const form = document.getElementById('product-form');
  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.category.value = product.category;
  form.elements.price.value = product.price;
  form.elements.stock.value = product.stock;
  form.elements.image.value = product.image || '';
  form.elements.description.value = product.description || '';
  document.getElementById('product-modal-title').textContent = 'Edit product';
  document.getElementById('product-submit-label').textContent = 'Save changes';
  openModal('product-modal');
}

function resetProductForm() {
  const form = document.getElementById('product-form');
  form?.reset();
  if (form?.elements.id) form.elements.id.value = '';
  setText('product-modal-title', 'Add a new product');
  setText('product-submit-label', 'Publish product');
}

function deleteProduct(id) {
  const products = readStore(DQ_KEYS.products);
  const product = products.find(item => item.id === id && item.seller === CURRENT_SHOPKEEPER);
  if (!product || !window.confirm(`Remove “${product.name}” from your listings?`)) return;
  writeStore(DQ_KEYS.products, products.filter(item => item.id !== id));
  addActivity('product', `${CURRENT_SHOPKEEPER} removed ${product.name}.`);
  showToast('Product removed.', 'success');
  renderShopkeeperPanel();
}

function initBrokerPanel() {
  const search = document.getElementById('catalog-search');
  const category = document.getElementById('catalog-category');
  const saleForm = document.getElementById('sale-form');

  search?.addEventListener('input', renderBrokerPanel);
  category?.addEventListener('change', renderBrokerPanel);
  saleForm?.addEventListener('submit', recordSale);
  renderBrokerPanel();
}

function renderBrokerPanel() {
  const products = readStore(DQ_KEYS.products);
  const available = products.filter(product => product.stock > 0);
  const sales = readStore(DQ_KEYS.sales).filter(sale => sale.broker === CURRENT_BROKER);
  const searchValue = (document.getElementById('catalog-search')?.value || '').trim().toLowerCase();
  const categoryValue = document.getElementById('catalog-category')?.value || 'all';
  const visible = available.filter(product => {
    const matchesSearch = `${product.name} ${product.seller} ${product.category}`.toLowerCase().includes(searchValue);
    const matchesCategory = categoryValue === 'all' || product.category === categoryValue;
    return matchesSearch && matchesCategory;
  });

  setText('metric-available', available.length);
  setText('metric-sellers', new Set(available.map(product => product.seller)).size);
  setText('metric-categories', new Set(available.map(product => product.category)).size);
  setText('metric-broker-sales', formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0)));

  const categorySelect = document.getElementById('catalog-category');
  if (categorySelect && categorySelect.options.length <= 1) {
    [...new Set(available.map(product => product.category))].sort().forEach(categoryName => {
      const option = document.createElement('option');
      option.value = categoryName;
      option.textContent = categoryName;
      categorySelect.appendChild(option);
    });
  }

  const grid = document.getElementById('catalog-grid');
  if (grid) {
    grid.innerHTML = visible.length ? visible.map(product => `
      <article class="catalog-card">
        <div class="catalog-visual">${productImage(product)}</div>
        <div class="catalog-body">
          <p class="catalog-seller">${escapeHtml(product.seller)}</p>
          <h3 class="catalog-name">${escapeHtml(product.name)}</h3>
          <div class="catalog-meta">
            <span class="catalog-price">${formatCurrency(product.price)}</span>
            <span class="catalog-stock">${product.stock} available</span>
          </div>
          <button class="btn-panel btn-panel-primary" type="button" data-sell-product="${product.id}">Record customer sale</button>
        </div>
      </article>`).join('') : '<div class="empty-state"><strong>No matching products</strong>Try another search or category.</div>';

    grid.querySelectorAll('[data-sell-product]').forEach(button => {
      button.addEventListener('click', () => prepareSale(button.dataset.sellProduct));
    });
  }

  renderBrokerSales(sales);
}

function prepareSale(productId) {
  const product = readStore(DQ_KEYS.products).find(item => item.id === productId);
  if (!product || product.stock <= 0) {
    showToast('This product is currently out of stock.', 'error');
    return;
  }
  const form = document.getElementById('sale-form');
  form.elements.productId.value = product.id;
  form.elements.product.value = product.name;
  form.elements.seller.value = product.seller;
  form.elements.quantity.value = 1;
  form.elements.quantity.max = product.stock;
  form.elements.customer.value = '';
  setText('sale-stock-help', `${product.stock} units available at ${formatCurrency(product.price)} each.`);
  openModal('sale-modal');
}

function recordSale(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const productId = String(data.get('productId') || '');
  const customer = String(data.get('customer') || '').trim();
  const quantity = Number(data.get('quantity'));
  const products = readStore(DQ_KEYS.products);
  const index = products.findIndex(product => product.id === productId);
  const product = products[index];

  if (!product || !customer || quantity < 1 || quantity > product.stock) {
    showToast('Enter a customer and a valid quantity.', 'error');
    return;
  }

  const sale = createSale(product, customer, quantity, CURRENT_BROKER);
  product.stock -= quantity;
  products[index] = product;
  const sales = readStore(DQ_KEYS.sales);
  sales.unshift(sale);

  writeStore(DQ_KEYS.products, products);
  writeStore(DQ_KEYS.sales, sales);
  addActivity('sale', `${CURRENT_BROKER} sold ${quantity} × ${product.name} to ${customer} for ${formatCurrency(sale.total)}.`);
  closeModal('sale-modal');
  showToast(`Sale recorded: ${formatCurrency(sale.total)}.`, 'success');
  renderBrokerPanel();
}

function renderBrokerSales(sales) {
  const table = document.getElementById('broker-sales-body');
  if (!table) return;
  table.innerHTML = sales.length ? sales.slice(0, 8).map(sale => `
    <tr>
      <td><span class="cell-title">${escapeHtml(sale.productName)}</span><br><span class="cell-meta">${escapeHtml(sale.seller)}</span></td>
      <td>${escapeHtml(sale.customer)}</td>
      <td>${sale.quantity}</td>
      <td>${formatCurrency(sale.total)}</td>
      <td>${formatDate(sale.createdAt)}</td>
    </tr>`).join('') : '<tr><td colspan="5"><div class="empty-state"><strong>No sales recorded yet</strong>Choose a product above to record your first sale.</div></td></tr>';
}

function initAdminPanel() {
  document.getElementById('reset-demo-data')?.addEventListener('click', resetDemoData);
  renderAdminPanel();
}

function renderAdminPanel() {
  const products = readStore(DQ_KEYS.products);
  const sales = readStore(DQ_KEYS.sales);
  const activity = readStore(DQ_KEYS.activity);
  const sellers = new Set(products.map(product => product.seller));
  const brokers = new Set(sales.map(sale => sale.broker));

  setText('metric-admin-users', sellers.size + brokers.size);
  setText('metric-admin-products', products.length);
  setText('metric-admin-units', sales.reduce((sum, sale) => sum + sale.quantity, 0));
  setText('metric-admin-volume', formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0)));

  const productsBody = document.getElementById('admin-products-body');
  if (productsBody) {
    productsBody.innerHTML = products.map(product => `
      <tr>
        <td>${productCell(product)}</td>
        <td>${escapeHtml(product.seller)}</td>
        <td>${formatCurrency(product.price)}</td>
        <td>${product.stock}</td>
        <td>${stockBadge(product.stock)}</td>
        <td>${formatDate(product.createdAt)}</td>
      </tr>`).join('');
  }

  const salesBody = document.getElementById('admin-sales-body');
  if (salesBody) {
    salesBody.innerHTML = sales.length ? sales.map(sale => `
      <tr>
        <td><span class="cell-title">${escapeHtml(sale.productName)}</span><br><span class="cell-meta">${escapeHtml(sale.seller)}</span></td>
        <td>${escapeHtml(sale.broker)}</td>
        <td>${escapeHtml(sale.customer)}</td>
        <td>${sale.quantity}</td>
        <td>${formatCurrency(sale.total)}</td>
        <td>${formatDate(sale.createdAt)}</td>
      </tr>`).join('') : '<tr><td colspan="6"><div class="empty-state"><strong>No transaction activity</strong>Sales recorded by brokers will appear here.</div></td></tr>';
  }

  renderActivity('admin-activity', activity.slice(0, 12));
}

function resetDemoData() {
  if (!window.confirm('Reset products, sales, and activity to the original demo data?')) return;
  Object.values(DQ_KEYS).forEach(key => localStorage.removeItem(key));
  seedDemoData();
  renderAdminPanel();
  showToast('Demo data restored.', 'success');
}

function renderActivity(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items.length ? items.map(item => `
    <div class="activity-item">
      <span class="activity-icon">${item.type === 'sale' ? icons.sale : item.type === 'product' ? icons.package : icons.activity}</span>
      <div>
        <p class="activity-message">${escapeHtml(item.message)}</p>
        <p class="activity-time">${relativeTime(item.createdAt)}</p>
      </div>
    </div>`).join('') : '<div class="empty-state"><strong>No activity yet</strong>New actions will appear here.</div>';
}

function productCell(product) {
  return `<div class="product-cell"><span class="product-thumb">${productImage(product)}</span><div><p class="cell-title">${escapeHtml(product.name)}</p><p class="cell-meta">${escapeHtml(product.id.slice(-8).toUpperCase())}</p></div></div>`;
}

function productImage(product) {
  const image = safeImageUrl(product.image || '');
  return image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : escapeHtml(product.name.slice(0, 2).toUpperCase());
}

function stockBadge(stock) {
  if (stock <= 0) return '<span class="status-badge status-out">Out of stock</span>';
  if (stock <= 10) return '<span class="status-badge status-low">Low stock</span>';
  return '<span class="status-badge status-active">Active</span>';
}

function safeImageUrl(url) {
  return /^https?:\/\//i.test(url) ? url : '';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function relativeTime(value) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return formatDate(value);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message, type = '') {
  const region = document.querySelector('.toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}
