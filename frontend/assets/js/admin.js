(function(){
// Enhanced admin.js with complete product management
const ADMIN_API_BASE = 'http://localhost:5000/api';

function getToken(){ return localStorage.getItem('token'); }

// Enhanced API helper with file upload support
async function api(path, opts = {}) {
  opts.headers = opts.headers || {};
  const token = getToken();
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  
  // Don't set Content-Type for FormData (file uploads)
  if (!(opts.body instanceof FormData) && !opts.headers['Content-Type']) {
    opts.headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(ADMIN_API_BASE + path, opts);
  if (!res.ok) throw await res.json().catch(()=>({ error: 'Server error' }));
  return res.json();
}

// File upload helper
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('image', file);
  return await api('/upload', {
    method: 'POST',
    body: formData
  });
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

// Category Management
class CategoryManager {
  constructor() {
    this.categories = [];
    this.initEventListeners();
  }

  initEventListeners() {
    // Add new category button
    document.getElementById('add-new-category-btn')?.addEventListener('click', () => {
      this.showAddCategoryModal();
    });

    // Manage categories button
    document.getElementById('manage-categories-menu')?.addEventListener('click', () => {
      this.showManageCategoriesModal();
    });

    // Modal event listeners
    document.getElementById('close-category-modal')?.addEventListener('click', () => {
      this.hideAddCategoryModal();
    });

    document.getElementById('cancel-category-btn')?.addEventListener('click', () => {
      this.hideAddCategoryModal();
    });

    document.getElementById('save-category-btn')?.addEventListener('click', () => {
      this.saveNewCategory();
    });

    document.getElementById('close-manage-categories-modal')?.addEventListener('click', () => {
      this.hideManageCategoriesModal();
    });

    document.getElementById('close-manage-categories-btn')?.addEventListener('click', () => {
      this.hideManageCategoriesModal();
    });

    document.getElementById('add-category-from-manage')?.addEventListener('click', () => {
      this.showAddCategoryModal();
    });

    // Close modals on overlay click
    document.getElementById('category-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'category-modal') this.hideAddCategoryModal();
    });

    document.getElementById('manage-categories-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'manage-categories-modal') this.hideManageCategoriesModal();
    });
  }

  async loadCategories() {
    try {
      this.categories = await api('/categories', { method: 'GET' });
      this.populateCategoryDropdown();
      return this.categories;
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fallback to default categories
      this.categories = [
        { category_name: 'Snacks' },
        { category_name: 'Beverages' },
        { category_name: 'Meals' },
        { category_name: 'Desserts' }
      ];
      this.populateCategoryDropdown();
    }
  }

  populateCategoryDropdown() {
    const select = document.getElementById('add-category');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a category</option>';
    this.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.category_name;
      option.textContent = cat.category_name;
      select.appendChild(option);
    });
  }

  showAddCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) {
      modal.classList.add('active');
      document.getElementById('new-category-name').focus();
    }
  }

  hideAddCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) {
      modal.classList.remove('active');
      document.getElementById('new-category-name').value = '';
    }
  }

  async saveNewCategory() {
    const nameInput = document.getElementById('new-category-name');
    const categoryName = nameInput.value.trim();

    if (!categoryName) {
      Swal.fire({ icon: 'warning', title: 'Please enter a category name' });
      return;
    }

    try {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify({ category_name: categoryName })
      });

      Swal.fire({ icon: 'success', title: 'Category added successfully!' });
      this.hideAddCategoryModal();
      await this.loadCategories();
      
      // Select the new category
      const select = document.getElementById('add-category');
      if (select) select.value = categoryName;

    } catch (error) {
      Swal.fire({ icon: 'error', title: error.error || 'Failed to add category' });
    }
  }

  async showManageCategoriesModal() {
    const modal = document.getElementById('manage-categories-modal');
    if (!modal) return;

    modal.classList.add('active');
    await this.loadCategoriesForManagement();
  }

  hideManageCategoriesModal() {
    const modal = document.getElementById('manage-categories-modal');
    if (modal) modal.classList.remove('active');
  }

  async loadCategoriesForManagement() {
    const container = document.getElementById('categories-list');
    if (!container) {
      console.error('Categories list container not found');
      return;
    }

    container.innerHTML = '<div class="loading">Loading categories...</div>';

    try {
      console.log('Loading categories for management...');
      const categories = await api('/categories', { method: 'GET' });
      console.log('Categories loaded:', categories);
      
      if (categories.length === 0) {
        container.innerHTML = '<p>No categories found.</p>';
        return;
      }

      container.innerHTML = categories.map(cat => `
        <div class="category-item">
          <span class="category-name">${cat.category_name}</span>
          <div class="category-actions">
            <button class="btn-delete" onclick="window.categoryManager.deleteCategory(${cat.category_id}, '${cat.category_name.replace(/'/g, "\\'")}')"> 
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Load categories error:', error);
      container.innerHTML = '<p>Failed to load categories.</p>';
    }
  }

  async deleteCategory(categoryId, categoryName) {
    const result = await Swal.fire({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${categoryName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await api(`/categories/${categoryId}`, { method: 'DELETE' });
        Swal.fire({ icon: 'success', title: 'Category deleted successfully!' });
        await this.loadCategoriesForManagement();
        await this.loadCategories(); // Refresh dropdown
      } catch (error) {
        console.error('Delete category error:', error);
        Swal.fire({ 
          icon: 'error', 
          title: 'Delete Failed',
          text: error.error || 'Failed to delete category'
        });
      }
    }
  }
}

// Product Image Manager
class ImageManager {
  constructor() {
    this.currentImageUrl = null;
    this.initEventListeners();
  }

  initEventListeners() {
    const imagePreview = document.getElementById('image-preview');
    const imageUpload = document.getElementById('image-upload');
    const removeBtn = document.getElementById('remove-image-btn');

    imagePreview?.addEventListener('click', () => {
      imageUpload.click();
    });

    imageUpload?.addEventListener('change', (e) => {
      this.handleImageSelect(e.target.files[0]);
    });

    removeBtn?.addEventListener('click', () => {
      this.removeImage();
    });
  }

  async handleImageSelect(file) {
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'Image must be smaller than 5MB' });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      this.updatePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      const result = await uploadFile(file);
      this.currentImageUrl = result.imageUrl;
      document.getElementById('remove-image-btn').style.display = 'block';
      
      Swal.fire({ 
        icon: 'success', 
        title: 'Image uploaded!', 
        timer: 1500, 
        showConfirmButton: false 
      });
    } catch (error) {
      Swal.fire({ icon: 'error', title: error.error || 'Failed to upload image' });
      this.removeImage(); // Reset on error
    }
  }

  updatePreview(imageSrc) {
    const previewImg = document.getElementById('preview-img');
    if (previewImg) {
      previewImg.src = imageSrc;
    }
  }

  removeImage() {
    this.currentImageUrl = null;
    this.updatePreview('assets/images/menu_img1.jpg');
    document.getElementById('remove-image-btn').style.display = 'none';
    document.getElementById('image-upload').value = '';
  }

  getCurrentImageUrl() {
    return this.currentImageUrl || 'assets/images/menu_img1.jpg';
  }
}

// Enhanced Product Manager
class ProductManager {
  constructor(categoryManager, imageManager) {
    this.categoryManager = categoryManager;
    this.imageManager = imageManager;
    this.initEventListeners();
  }

  initEventListeners() {
    document.getElementById('add-product-btn')?.addEventListener('click', () => {
      this.addProduct();
    });

    document.getElementById('cancel-add-btn')?.addEventListener('click', () => {
      this.resetForm();
    });
  }

  async addProduct() {
    // Get form data
    const title = document.getElementById('add-title').value.trim();
    const description = document.getElementById('add-description').value.trim();
    const category = document.getElementById('add-category').value;
    const price = document.getElementById('add-price').value;
    const calories = document.getElementById('add-calories').value.trim();
    const availability = document.getElementById('add-availability').value;
    const imageUrl = this.imageManager.getCurrentImageUrl();

    // Validation
    if (!title) {
      Swal.fire({ icon: 'warning', title: 'Please enter a product name' });
      document.getElementById('add-title').focus();
      return;
    }

    if (!category) {
      Swal.fire({ icon: 'warning', title: 'Please select a category' });
      document.getElementById('add-category').focus();
      return;
    }

    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      Swal.fire({ icon: 'warning', title: 'Please enter a valid price' });
      document.getElementById('add-price').focus();
      return;
    }

    // Show loading state
    const addBtn = document.getElementById('add-product-btn');
    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    addBtn.disabled = true;

    try {
      await api('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category,
          price: parseFloat(price),
          calories,
          image_url: imageUrl,
          available: availability === '1'
        })
      });

      Swal.fire({ 
        icon: 'success', 
        title: 'Product added successfully!',
        timer: 2000,
        showConfirmButton: false
      });

      this.resetForm();
      await populateRemoveDropdown(); // Refresh remove dropdown

    } catch (error) {
      Swal.fire({ icon: 'error', title: error.error || 'Failed to add product' });
    } finally {
      // Reset button state
      addBtn.innerHTML = originalText;
      addBtn.disabled = false;
    }
  }

  resetForm() {
    // Clear all form fields
    document.getElementById('add-title').value = '';
    document.getElementById('add-description').value = '';
    document.getElementById('add-category').value = '';
    document.getElementById('add-price').value = '';
    document.getElementById('add-calories').value = '';
    document.getElementById('add-availability').value = '1';
    
    // Reset image
    this.imageManager.removeImage();
  }
}

// Global instances
let categoryManager, imageManager, productManager;

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

  // Initialize managers
  categoryManager = new CategoryManager();
  imageManager = new ImageManager();
  productManager = new ProductManager(categoryManager, imageManager);

  // Make categoryManager globally accessible immediately
  window.categoryManager = categoryManager;

  // Load categories
  await categoryManager.loadCategories();

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

  // Remove product handler
  const removeBtn = document.getElementById('remove-product-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const select = document.getElementById('remove-select');
      const id = select?.value;
      if (!id) return Swal.fire({ icon: 'warning', title: 'Select a product to remove' });
      
      const result = await Swal.fire({
        title: 'Delete Product?',
        text: 'Are you sure you want to delete this product? This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
        try {
          await api(`/admin/products/${id}`, { method: 'DELETE' });
          Swal.fire({ icon: 'success', title: 'Product removed successfully!' });
          populateRemoveDropdown();
        } catch (err) {
          Swal.fire({ icon: 'error', title: err.error || 'Remove failed' });
        }
      }
    });
  }

  // Initial population when page loads
  populateRemoveDropdown();
});

})();
