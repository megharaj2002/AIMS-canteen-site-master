// functioning.js (SQL backend edition)
(function(){
const API_BASE = 'http://localhost:5000/api';
const APP_BASE = API_BASE.replace(/\/?api\/?$/, '');

// Utility: store token
function saveToken(token) { localStorage.setItem('token', token); }
function getToken() { return localStorage.getItem('token'); }
function clearToken(){ localStorage.removeItem('token'); }

// Helper for fetch with auth
async function apiFetch(path, opts = {}) {
  const headers = opts.headers || {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(()=>({ error: 'Server error' }));
    throw err;
  }
  return res.json();
}

// --- Auth handlers ---
document.addEventListener('DOMContentLoaded', () => {
  // Register form (if present)
  const myForm = document.getElementById("main-form");
  if (myForm) {
    myForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = myForm["sign-up-full-name"].value;
      const email = myForm["sign-up-email"].value;
      const password = myForm["sign-up-password"].value;
      const repassword = myForm["sign-up-repassword"].value;
      const phoneNumber = myForm["sign-up-number"].value;
      if (password !== repassword) { return Swal.fire('Passwords do not match'); }
      if (phoneNumber.length !== 10) { return Swal.fire('Invalid phone'); }
      try {
        const body = { name, email, password, phone: phoneNumber };
        const data = await fetch(API_BASE + '/auth/register', { 
          method: 'POST', 
          headers: {'Content-Type':'application/json'}, 
          body: JSON.stringify(body) 
        }).then(r => r.json());

        if (data.token) {
          saveToken(data.token);
          Swal.fire({ icon:'success', title:'Account created' });
          if (data.user && data.user.is_admin) {
            window.location.replace(APP_BASE + '/admin-side.html');
          } else {
            window.location.replace(APP_BASE + '/client-side.html');
          }
        } else throw data;
      } catch (err) {
        Swal.fire({ icon:'error', title: err.error || 'Registration failed' });
      }
    });
  }

  // Login form
  const signInForm = document.getElementById('signIn-form');
  if (signInForm){
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('sign-in-email').value;
      const password = document.getElementById('sign-in-password').value;
      try {
        const res = await fetch(API_BASE + '/auth/login', { 
          method: 'POST', 
          headers: {'Content-Type':'application/json'}, 
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (data.token) {
          saveToken(data.token);
          Swal.fire({ icon: 'success', title: 'Logged In' });
          if (data.user && data.user.is_admin) {
            window.location.replace(APP_BASE + '/admin-side.html');
          } else {
            window.location.replace(APP_BASE + '/client-side.html');
          }
        } else throw data;
      } catch (err) {
        Swal.fire({ icon:'error', title: err.error || 'Login failed' });
      }
    });
  }

  // Logout buttons
  const logoutBtns = document.querySelectorAll('#userlogout, #logout');
  console.log('Found logout buttons:', logoutBtns.length);
  logoutBtns.forEach(btn => {
    console.log('Adding logout listener to:', btn.id);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Logout clicked');
      clearToken();
      Swal.fire({ icon: 'success', title: 'Logged Out' });
      // Try relative redirect so it works for both file:// and http://
      const go = () => { try { window.location.href = 'index.html'; } catch (_) { window.location.replace('index.html'); } };
      setTimeout(go, 600);
    });
  });

  // Fallback: event delegation in case buttons are injected later
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#userlogout, #logout');
    if (!target) return;
    e.preventDefault();
    clearToken();
    try { sessionStorage.removeItem('token'); } catch(_) {}
    const go = () => { try { window.location.href = 'index.html'; } catch (_) { window.location.replace('index.html'); } };
    go();
  });

  // Extra: listen for touch devices
  document.addEventListener('touchend', (e) => {
    const target = e.target.closest('#userlogout, #logout');
    if (!target) return;
    e.preventDefault();
    clearToken();
    try { sessionStorage.removeItem('token'); } catch(_) {}
    try { window.location.href = 'index.html'; } catch (_) { window.location.replace('index.html'); }
  }, { passive: false });

  // Safety rebind in case DOM is dynamically replaced
  let rebindAttempts = 0;
  const rebinder = setInterval(() => {
    rebindAttempts++;
    const nodes = document.querySelectorAll('#userlogout, #logout');
    nodes.forEach(node => {
      if (!node.__logoutBound) {
        node.addEventListener('click', (e) => {
          e.preventDefault();
          clearToken();
          try { sessionStorage.removeItem('token'); } catch(_) {}
          try { window.location.href = 'index.html'; } catch (_) { window.location.replace('index.html'); }
        });
        node.__logoutBound = true;
      }
    });
    if (rebindAttempts > 10) clearInterval(rebinder);
  }, 500);

  // Expose a global for manual hooks
  window.forceLogout = function() {
    clearToken();
    try { sessionStorage.removeItem('token'); } catch(_) {}
    try { window.location.href = 'index.html'; } catch (_) { window.location.replace('index.html'); }
  };
});
})();