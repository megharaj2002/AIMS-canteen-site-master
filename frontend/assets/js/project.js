// admin.js (SQL backend edition)
const API_BASE = 'http://localhost:5000/api';

function getToken(){ return localStorage.getItem('token'); }
async function api(path, opts = {}) {
  opts.headers = opts.headers || {};
  const token = getToken();
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) throw await res.json().catch(()=>({ error: 'Server error' }));
  return res.json();
}

async function ensureAdminAccess() {
  try {
    const data = await api('/auth/verify', { method: 'GET' });
    if (!data?.user?.is_admin) {
      Swal.fire({ icon: 'error', title: 'Access denied', text: 'Admin only area' });
      setTimeout(() => window.location.replace('index.html'), 1200);
      return false;
    }
    return true;
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Please login as admin' });
    setTimeout(() => window.location.replace('index.html'), 1200);
    return false;
  }
}

async function populateRemoveDropdown() {
  const select = document.getElementById('remove-select');
  if (!select) return;
  select.innerHTML = '<option value="" selected>Select a product to remove</option>';
  try {
    const products = await api('/admin/products', { method: 'GET' });
    products.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.item_id;
      opt.textContent = `${p.title} (${p.category}) - ₹${p.price}`;
      select.appendChild(opt);
    });
  } catch (e) {
    // fallback to public menu if admin list fails
    try {
      const products = await api('/menu', { method: 'GET' });
      products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.item_id;
        opt.textContent = `${p.title} (${p.category}) - ₹${p.price}`;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error('Failed to load products for removal');
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Guard route for admins only
  const ok = await ensureAdminAccess();
  if (!ok) return;

  const addProductMenuBtn = document.querySelector('#add-product-menu');
  const removeProductMenuBtn = document.querySelector('#remove-product-menu');
  const addContainer = document.querySelector('.add-container');
  const removeContainer = document.querySelector('.remove-container');

  // toggles
  if (addProductMenuBtn) {
    addProductMenuBtn.addEventListener('click', () => {
      addContainer.classList.toggle('show-container');
      removeContainer.classList.remove('show-container');
    });
  }
  if (removeProductMenuBtn) {
    removeProductMenuBtn.addEventListener('click', () => {
      removeContainer.classList.toggle('show-container');
      addContainer.classList.remove('show-container');
      populateRemoveDropdown();
    });
  }

  // Add product handler
  const addBtn = document.getElementById('add-product-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const title = document.getElementById('add-title').value.trim();
      const calories = document.getElementById('add-calories').value.trim();
      const price = document.getElementById('add-price').value.trim();
      const category = document.getElementById('add-category').value;
      const image_url = 'assets/images/menu_img1.jpg';

      if (!title || !price || !category) {
        return Swal.fire({ icon: 'warning', title: 'Please fill all required fields' });
      }

      try {
        await api('/admin/products', {
          method: 'POST',
          body: JSON.stringify({ title, category, price, calories, image_url })
        });
        Swal.fire({ icon: 'success', title: 'Product added' });
        // Clear inputs
        document.getElementById('add-title').value = '';
        document.getElementById('add-calories').value = '';
        document.getElementById('add-price').value = '';
        populateRemoveDropdown();
      } catch (err) {
        Swal.fire({ icon: 'error', title: err.error || 'Add product failed' });
      }
    });
  }

  // Remove product handler
  const removeBtn = document.getElementById('remove-product-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const select = document.getElementById('remove-select');
      const id = select?.value;
      if (!id) return Swal.fire({ icon: 'warning', title: 'Select a product to remove' });
      try {
        await api(`/admin/products/${id}`, { method: 'DELETE' });
        Swal.fire({ icon: 'success', title: 'Product removed' });
        populateRemoveDropdown();
      } catch (err) {
        Swal.fire({ icon: 'error', title: err.error || 'Remove failed' });
      }
    });
  }

  // Initial population when page loads
  populateRemoveDropdown();
});
