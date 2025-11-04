// main.js (SQL backend edition)
const API_BASE = 'http://localhost:5000/api';
const APP_BASE = API_BASE.replace(/\/?api\/?$/, '');

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (!res.ok) throw await res.json();
  return res.json();
}

let products = [];
const menuSection = document.querySelector('.menu-section');
const cartItemsContainer = document.querySelector('.cart-items-container');
const cartTotal = document.querySelector('.cart-total');
const cartValues = document.querySelectorAll('#cart-values');
const clearCartBtn = document.querySelector('.clear-cart');
const checkOutBtn = document.querySelector('.check-out');

function renderMenuItems(menuItems){
  const html = menuItems.map(item => `
    <article class="menu-item" data-item-id="${item.item_id}">
      <img src="${item.image_url}" loading="lazy" alt="Product image">
      <div class="item-info">
        <figure>
          <h2>${item.title}</h2>
          <div class="item-category">${item.category}</div>
          <div class="flex" style="margin-top: 10px;">
            <i class="fas fa-fire"></i>
            <p>${item.calories}</p>
          </div>
        </figure>
        <hr style="margin: 10px 0;">
        <div class="menu-cart-functionality">
          <div class="price">&#8377;${item.price}</div>
          <div class="cart-btn-container">
            <button class="bag-btn add-to-cart" data-id="${item.item_id}">Add to Cart</button>
          </div>
        </div>
      </div>
    </article>
  `).join('');
  if (menuSection) menuSection.innerHTML = html;
}

// fetch menu on load
async function loadMenu(){
  try {
    const data = await api('/menu');
    products = data; // array
    renderMenuItems(products);
    attachAddToCart();
    attachFiltering();
  } catch (err) {
    console.error(err);
  }
}

// Filtering: reuse your existing UI, but adapted
function attachFiltering(){
  const menuFilterBtns = document.querySelectorAll('#menu-filter');
  if (!menuFilterBtns.length) return;
  menuFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const Category = e.currentTarget.dataset.id;
      menuFilterBtns.forEach(i => i.classList.toggle('current', i.dataset.id === Category));
      const items = document.querySelectorAll('.menu-item');
      items.forEach(itemEl => {
        const id = parseInt(itemEl.dataset.itemId || itemEl.getAttribute('data-item-id'));
        const product = products.find(p => p.item_id === id);
        if (!product) return;
        if (Category === 'all' || product.category === Category) {
          itemEl.classList.remove('display-none');
        } else {
          itemEl.classList.add('display-none');
        }
      });
    });
  });
}

// Cart UI management (reads from backend)
async function refreshCartUI(){
  try {
    const data = await api('/cart', { method: 'GET' });
    const items = data.items || [];
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;
    items.forEach(it => {
      total += parseFloat(it.unit_price) * it.quantity;
      count += it.quantity;
      const article = document.createElement('article');
      article.classList.add('cart-item');
      article.innerHTML = `
        <div><img src="${it.image_url}" alt="Food"></div>
        <div class="cart-info">
          <h3>${it.title}</h3>
          <p>&#8377;${it.unit_price}</p>
          <span class="remove-item" data-id="${it.cart_item_id}">remove</span>
        </div>
        <div class="flex-column">
          <i class="fas fa-chevron-up" data-id="${it.cart_item_id}"></i>
          <p class="item-amount">${it.quantity}</p>
          <i class="fas fa-chevron-down" data-id="${it.cart_item_id}"></i>
        </div>
      `;
      cartItemsContainer.appendChild(article);
    });
    cartTotal.innerHTML = total.toFixed(2);
    cartValues.forEach(v => { v.innerHTML = count; });
  } catch (err) {
    // unauthorized or other
    cartItemsContainer.innerHTML = '';
    cartTotal.innerHTML = '0';
    cartValues.forEach(v => v.innerHTML = '0');
  }
}

function attachAddToCart(){
  const addBtns = document.querySelectorAll('.add-to-cart');
  addBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt(btn.dataset.id);
      try {
        await api('/cart', { method: 'POST', body: JSON.stringify({ item_id: id, quantity: 1 }) });
        Swal.fire({ icon: 'success', title: 'Added to cart' });
        refreshCartUI();
      } catch (err) {
        Swal.fire({ icon: 'error', title: err.error || 'Add to cart failed' });
      }
    })
  });
}

// Cart interactions (remove, inc/dec)
cartItemsContainer?.addEventListener('click', async (e) => {
  try {
    if (e.target.classList.contains('remove-item')) {
      const id = e.target.dataset.id;
      await api(`/cart/${id}`, { method: 'DELETE' });
      refreshCartUI();
    } else if (e.target.classList.contains('fa-chevron-up')) {
      const id = e.target.dataset.id;
      // find element amount
      const qtyP = e.target.parentElement.querySelector('.item-amount');
      let newQty = parseInt(qtyP.innerText) + 1;
      await api(`/cart/${id}`, { method: 'PUT', body: JSON.stringify({ quantity: newQty })});
      refreshCartUI();
    } else if (e.target.classList.contains('fa-chevron-down')) {
      const id = e.target.dataset.id;
      const qtyP = e.target.parentElement.querySelector('.item-amount');
      let newQty = parseInt(qtyP.innerText) - 1;
      await api(`/cart/${id}`, { method: 'PUT', body: JSON.stringify({ quantity: newQty })});
      refreshCartUI();
    }
  } catch (err) {
    console.error(err);
  }
});

// Clear cart
clearCartBtn?.addEventListener('click', async () => {
  try {
    await api('/cart', { method: 'DELETE' });
    refreshCartUI();
    Swal.fire({ icon: 'success', title: 'Cart cleared' });
  } catch (err) {
    Swal.fire({ icon:'error', title: err.error || 'Clear failed' });
  }
});

// Checkout
checkOutBtn?.addEventListener('click', async () => {
  try {
    const res = await api('/order', { method: 'POST' });
    Swal.fire({ icon: 'success', title: 'Order placed' });
    await refreshCartUI();
    window.setTimeout(() => { window.location.replace(APP_BASE + '/user-orders.html'); }, 1400);
  } catch (err) {
    Swal.fire({ icon:'error', title: err.error || 'Order failed' });
  }
});

// When DOM loaded -> load menu & cart
document.addEventListener('DOMContentLoaded', async () => {
  await loadMenu();
  await refreshCartUI();
});
