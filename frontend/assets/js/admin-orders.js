// admin-orders.js - Fetch and render all orders for admin
const ADMIN_API_BASE = 'http://localhost:5000/api';

function adminGetToken() { return localStorage.getItem('token'); }

async function adminApi(path, opts = {}) {
	const headers = opts.headers || {};
	const token = adminGetToken();
	if (token) headers['Authorization'] = 'Bearer ' + token;
	if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
	const res = await fetch(ADMIN_API_BASE + path, { ...opts, headers });
	if (!res.ok) throw await res.json().catch(() => ({ error: 'Server error' }));
	return res.json();
}

function renderAdminOrders(orders) {
	const container = document.getElementById('custom') || document.querySelector('.container-min');
	if (!container) return;
	container.innerHTML = '';

	if (!orders || orders.length === 0) {
		container.innerHTML = '<div class="text-center my-2">No orders yet.</div>';
		return;
	}

	orders.forEach((order, idx) => {
		const wrapper = document.createElement('div');
		const table = document.createElement('table');
		
		// Format date and time with IST timezone
		const orderDateTime = order.formatted_datetime || 
			new Date(order.order_date).toLocaleString('en-IN', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: true,
				timeZone: 'Asia/Kolkata'
			});
		
		const timezoneInfo = order.timezone || 'IST (UTC+5:30)';
		
		table.innerHTML = `
			<thead>
				<tr>
					<th colspan="4" style="text-align:left;">#${idx + 1} - Order ${order.order_id} by ${order.user_name || 'Unknown'} (${order.user_email || '-'})</th>
					<th colspan="2" style="text-align:right;">Status: <span class="admin-order-status" data-order-id="${order.order_id}">${order.order_status}</span></th>
				</tr>
				<tr>
					<th colspan="6" style="text-align:left; background: var(--order-light-gray); color: var(--order-light-black); font-weight: 500; font-size: 13px; padding: 8px 12px;">
						<i class="fas fa-clock" style="margin-right: 5px;"></i>Ordered on: <span class="order-time">${orderDateTime}</span>
						<span style="margin-left: 10px; color: #6c757d; font-size: 11px;">(${timezoneInfo})</span>
					</th>
				</tr>
				<tr>
					<th>S.No.</th>
					<th>Food Item</th>
					<th>Price</th>
					<th>Qty</th>
					<th>Sub Total</th>
				</tr>
			</thead>
			<tbody>
				${(order.items || []).map((it, i) => {
					const sub = (parseFloat(it.unit_price) * it.quantity).toFixed(2);
					return `
						<tr>
							<td>${i + 1}</td>
							<td>${it.title}</td>
							<td>&#8377; ${parseFloat(it.unit_price).toFixed(2)}</td>
							<td>${it.quantity}</td>
							<td>&#8377; ${sub}</td>
						</tr>
					`;
				}).join('')}
			</tbody>
			<tfoot>
				<tr>
					<td colspan="4" style="text-align:right;">Total:</td>
					<td>&#8377; ${parseFloat(order.total_amount).toFixed(2)}</td>
				</tr>
			</tfoot>
		`;
		wrapper.appendChild(table);

		// Actions row
		const actions = document.createElement('div');
		actions.style.display = 'flex';
		actions.style.justifyContent = 'flex-end';
		actions.style.gap = '0.5rem';
		actions.style.marginTop = '0.5rem';

		if (order.order_status !== 'Delivered' && order.order_status !== 'Cancelled') {
			const deliveredBtn = document.createElement('button');
			deliveredBtn.className = 'btn';
			deliveredBtn.textContent = 'Mark Delivered';
			deliveredBtn.dataset.orderId = String(order.order_id);
			deliveredBtn.addEventListener('click', async (e) => {
				const id = e.currentTarget.dataset.orderId;
				try {
					await adminApi(`/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ order_status: 'Delivered' }) });
					// Refresh list
					await loadAdminOrders();
				} catch (err) {
					Swal && Swal.fire ? Swal.fire({ icon: 'error', title: err.error || 'Failed to update status' }) : console.error(err);
				}
			});
			actions.appendChild(deliveredBtn);
		}

		// Optional: quick status select (Preparing/Ready)
		const quickStatuses = ['Placed','Preparing','Ready'];
		const select = document.createElement('select');
		select.className = 'btn';
		quickStatuses.forEach(s => {
			const opt = document.createElement('option');
			opt.value = s; opt.textContent = s; if (s === order.order_status) opt.selected = true; select.appendChild(opt);
		});
		select.addEventListener('change', async (e) => {
			const value = e.target.value;
			try {
				await adminApi(`/admin/orders/${order.order_id}/status`, { method: 'PUT', body: JSON.stringify({ order_status: value }) });
				await loadAdminOrders();
			} catch (err) {
				Swal && Swal.fire ? Swal.fire({ icon: 'error', title: err.error || 'Failed to update status' }) : console.error(err);
			}
		});
		actions.appendChild(select);

		wrapper.appendChild(actions);
		container.appendChild(wrapper);
		const hr = document.createElement('hr');
		hr.className = 'hrStyle';
		hr.style.margin = '2rem auto 0rem auto';
		container.appendChild(hr);
	});
}

async function loadAdminOrders() {
	try {
		const data = await adminApi('/admin/orders', { method: 'GET' });
		renderAdminOrders(data);
	} catch (err) {
		Swal && Swal.fire ? Swal.fire({ icon: 'error', title: err.error || 'Failed to load admin orders' }) : console.error(err);
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	// Only run on order admin page
	const onAdminOrders = document.querySelector('body') && (location.pathname.endsWith('order.html') || location.pathname.endsWith('/order'));
	if (!onAdminOrders) return;
	await loadAdminOrders();
});


