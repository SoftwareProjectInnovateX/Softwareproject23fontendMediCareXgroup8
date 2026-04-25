const API_BASE_URL = 'http://localhost:5000/api/pharmacist';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }
  return response.json();
};

/* ================= PROFILE ================= */

export const getPharmacistProfile = async (id = sessionStorage.getItem('userId') || 'default') => {
  const res = await fetch(`${API_BASE_URL}/profile/${id}`);
  return handleResponse(res);
};

export const updatePharmacistProfile = async (id, data) => {
  const res = await fetch(`${API_BASE_URL}/profile/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

/* ================= INVENTORY ================= */

export const getInventory = async () => {
  return handleResponse(await fetch(`${API_BASE_URL}/inventory`));
};

export const addInventoryItem = async (data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

export const updateInventoryItem = async (id, data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

export const deleteInventoryItem = async (id) => {
  return handleResponse(await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: 'DELETE',
  }));
};

/* ================= PATIENTS ================= */

export const getPatients = async () => {
  return handleResponse(await fetch(`${API_BASE_URL}/patients`));
};

export const addPatient = async (data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

export const updatePatient = async (id, data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

/* ================= PRESCRIPTIONS ================= */

export const getPrescriptions = async () => {
  return handleResponse(await fetch(`${API_BASE_URL}/prescriptions`));
};

export const addPrescription = async (data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

export const updatePrescription = async (id, data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/prescriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

/* ================= DISPENSED ================= */

export const getDispensedHistory = async () => {
  return handleResponse(await fetch(`${API_BASE_URL}/dispensed`));
};

export const addDispensedRecord = async (data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/dispensed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

export const updateDispensedRecord = async (id, data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/dispensed/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

/* ================= ORDERS ================= */

export const getOnlineOrders = async () => {
  return handleResponse(await fetch(`${API_BASE_URL}/orders`));
};

export const addOnlineOrder = async (data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

export const updateOnlineOrder = async (id, data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

/* ================= RETURNS ================= */

export const getReturnRequests = async () => {
  return handleResponse(await fetch(`${API_BASE_URL}/returns`));
};

export const addReturnRequest = async (data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/returns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

export const updateReturnRequest = async (id, data) => {
  return handleResponse(await fetch(`${API_BASE_URL}/returns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }));
};

// ✅ from your version (important extra features)
export const approveReturn = async (id, adjNote, items) => {
  return handleResponse(await fetch(`${API_BASE_URL}/returns/${id}/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjNote, items }),
  }));
};

export const rejectReturn = async (id, adjNote) => {
  return handleResponse(await fetch(`${API_BASE_URL}/returns/${id}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjNote }),
  }));
};

/* ================= SYSTEM ================= */

export const resetSystemData = async () => {
  return handleResponse(await fetch(`${API_BASE_URL}/system/reset`, {
    method: 'POST',
  }));
};