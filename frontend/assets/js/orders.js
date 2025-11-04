// orders.js - Fetch and render a user's orders
const USER_API_BASE = 'http://localhost:5000/api';

function userGetToken() { return localStorage.getItem('token'); }

async function userApi(path, opts = {}) {
	const headers = opts.headers || {};
	const token = userGetToken();
	if (token) headers['Authorization'] = 'Bearer ' + token;
	if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
	const res = await fetch(USER_API_BASE + path, { ...opts, headers });
	if (!res.ok) throw await res.json().catch(() => ({ error: 'Server error' }));
	return res.json();
}

function renderOrderCards(intoEl, orders) {
	if (!intoEl) return;
	intoEl.innerHTML = '';
	if (!orders || orders.length === 0) {
		intoEl.innerHTML = '<div class="text-center my-2">No orders.</div>';
		return;
	}

	orders.forEach((order, idx) => {
		const card = document.createElement('div');
		card.className = 'current-details';
		const itemsRows = (order.items || []).map((it, i) => {
			const sub = (parseFloat(it.unit_price) * it.quantity).toFixed(2);
			return `
				<tr>
					<td data-label="S. No">${i + 1}</td>
					<td data-label="Item">${it.title}</td>
					<td data-label="Price">&#8377; ${parseFloat(it.unit_price).toFixed(2)}</td>
					<td data-label="Quantity">${it.quantity}</td>
					<td data-label="Sub Total">&#8377; ${sub}</td>
				</tr>
			`;
		}).join('');

		card.innerHTML = `
			<table class="main-details">
				<div class="flex" style="justify-content: space-between;">
					<div><button class="table-btn my-1">Ordered Detail</button></div>
					<div class="md">#${idx + 1}</div>
				</div>
				<thead>
					<tr>
						<th>Order ID</th>
						<th>Total</th>
						<th>Ordered Date</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td data-label="Order ID">${order.order_id}</td>
						<td data-label="Total">&#8377; ${parseFloat(order.total_amount).toFixed(2)}</td>
						<td data-label="Date">
							<div class="order-datetime-wrapper">
								<span class="order-date-label">Ordered on:</span><br>
								<span class="order-date-value">${order.formatted_date || new Date(order.order_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span><br>
								<span class="order-time-value">${order.formatted_time || new Date(order.order_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</span><br>
								<span class="order-timezone-label">(${order.timezone || 'IST, UTC+5:30'})</span>
							</div>
						</td>
						<td data-label="Order Status">${order.order_status}</td>
					</tr>
				</tbody>
			</table>
			<table class="descriptive-details">
				<thead>
					<tr>
						<th>S. No</th>
						<th>Food</th>
						<th>Price</th>
						<th>Quantity</th>
						<th>Sub Total</th>
					</tr>
				</thead>
				<tbody>
					${itemsRows}
				</tbody>
			</table>
		`;

		intoEl.appendChild(card);
		const hr = document.createElement('hr');
		hr.className = 'hrStyle';
		hr.style.margin = '2rem auto 0rem auto';
		intoEl.appendChild(hr);
	});
}

document.addEventListener('DOMContentLoaded', async () => {
	// Only run on orders page
	if (!document.querySelector('.orders.c-orders')) return;
	try {
		const orders = await userApi('/orders', { method: 'GET' });
		const currentOrders = orders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled');
		const previousOrders = orders.filter(o => o.order_status === 'Delivered' || o.order_status === 'Cancelled');

		const currentContainer = document.querySelector('.orders.c-orders .order-inner .order-inner') || document.querySelector('.orders.c-orders .order-inner');
		renderOrderCards(currentContainer, currentOrders);

		// Render previous orders section
		let prevSection = document.querySelector('.orders.p-orders .previous-orders');
		if (prevSection) {
			let prevContainer = prevSection.nextElementSibling;
			if (!prevContainer || !prevContainer.classList || !prevContainer.classList.contains('order-inner')) {
				prevContainer = document.createElement('div');
				prevContainer.className = 'order-inner container-min p-2';
				prevSection.parentElement.insertBefore(prevContainer, prevSection.nextSibling);
			}
			if (!prevSection.textContent || prevSection.textContent.trim() === '') {
				prevSection.textContent = 'Previous Orders';
			}
			renderOrderCards(prevContainer, previousOrders);
		}
	} catch (err) {
		Swal && Swal.fire ? Swal.fire({ icon: 'error', title: err.error || 'Failed to load orders' }) : console.error(err);
	}
});


