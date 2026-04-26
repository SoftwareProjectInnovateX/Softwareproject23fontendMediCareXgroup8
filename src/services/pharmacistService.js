// pharmacistService.js
// Centralized service for all pharmacist-related API calls

const BASE_URL = 'http://localhost:5000/api';


// ─── INVENTORY ────────────────────────────────────────────────────────────────

export async function getInventory() {
  const res = await fetch(`${BASE_URL}/pharmacist/inventory`);
  if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.statusText}`);
  return res.json();
}

export async function addInventoryItem(itemData) {
  const res = await fetch(`${BASE_URL}/pharmacist/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });
  if (!res.ok) throw new Error(`Failed to add inventory item: ${res.statusText}`);
  return res.json();
}

export async function updateInventoryItem(id, updateData) {
  const res = await fetch(`${BASE_URL}/pharmacist/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) throw new Error(`Failed to update inventory item: ${res.statusText}`);
  return res.json();
}

export async function deleteInventoryItem(id) {
  const res = await fetch(`${BASE_URL}/pharmacist/inventory/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete inventory item: ${res.statusText}`);
  return res.json();
}

// ─── DISPENSED HISTORY ────────────────────────────────────────────────────────

export async function getDispensedHistory() {
  const res = await fetch(`${BASE_URL}/pharmacist/dispensed`);
  if (!res.ok) throw new Error(`Failed to fetch dispensed history: ${res.statusText}`);
  return res.json();
}

export async function addDispensedRecord(dispenseData) {
  const res = await fetch(`${BASE_URL}/pharmacist/dispensed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dispenseData),
  });
  if (!res.ok) throw new Error(`Failed to add dispensed record: ${res.statusText}`);
  return res.json();
}

export async function updateDispensedRecord(id, updateData) {
  const res = await fetch(`${BASE_URL}/pharmacist/dispensed/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) throw new Error(`Failed to update dispensed record: ${res.statusText}`);
  return res.json();
}

// ─── RETURNS ──────────────────────────────────────────────────────────────────

export async function getReturnRequests() {
  const res = await fetch(`${BASE_URL}/pharmacist/returns`);
  if (!res.ok) throw new Error(`Failed to fetch returns: ${res.statusText}`);
  return res.json();
}

export async function addReturnRequest(returnData) {
  const res = await fetch(`${BASE_URL}/pharmacist/returns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(returnData),
  });
  if (!res.ok) throw new Error(`Failed to add return request: ${res.statusText}`);
  return res.json();
}

export async function approveReturn(id, adjNote, items) {
  const res = await fetch(`${BASE_URL}/pharmacist/returns/${id}/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjNote, items }),
  });
  if (!res.ok) throw new Error(`Failed to approve return: ${res.statusText}`);
  return res.json();
}

export async function rejectReturn(id, adjNote) {
  const res = await fetch(`${BASE_URL}/pharmacist/returns/${id}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjNote }),
  });
  if (!res.ok) throw new Error(`Failed to reject return: ${res.statusText}`);
  return res.json();
}

export async function updateReturnRequest(id, updateData) {
  const res = await fetch(`${BASE_URL}/pharmacist/returns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) throw new Error(`Failed to update return: ${res.statusText}`);
  return res.json();
}

// ─── ONLINE ORDERS ────────────────────────────────────────────────────────────

export async function getOnlineOrders() {
  const res = await fetch(`${BASE_URL}/pharmacist/orders`);
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.statusText}`);
  return res.json();
}

export async function addOnlineOrder(orderData) {
  const res = await fetch(`${BASE_URL}/pharmacist/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) throw new Error(`Failed to add order: ${res.statusText}`);
  return res.json();
}

export async function updateOnlineOrder(id, updateData) {
  const res = await fetch(`${BASE_URL}/pharmacist/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) throw new Error(`Failed to update order: ${res.statusText}`);
  return res.json();
}

// ─── PATIENTS ─────────────────────────────────────────────────────────────────

export async function getPatients() {
  const res = await fetch(`${BASE_URL}/pharmacist/patients`);
  if (!res.ok) throw new Error(`Failed to fetch patients: ${res.statusText}`);
  return res.json();
}

export async function addPatient(patientData) {
  const res = await fetch(`${BASE_URL}/pharmacist/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) throw new Error(`Failed to add patient: ${res.statusText}`);
  return res.json();
}

export async function updatePatient(id, updateData) {
  const res = await fetch(`${BASE_URL}/pharmacist/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) throw new Error(`Failed to update patient: ${res.statusText}`);
  return res.json();
}

// ─── PRESCRIPTIONS ────────────────────────────────────────────────────────────

export async function getPrescriptions() {
  const res = await fetch(`${BASE_URL}/prescriptions`);
  if (!res.ok) throw new Error(`Failed to fetch prescriptions: ${res.statusText}`);
  return res.json();
}

export async function addPrescription(prescriptionData) {
  // Note: This endpoint uses multipart/form-data for file upload
  // For JSON-only submissions, use this endpoint
  const res = await fetch(`${BASE_URL}/prescriptions/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prescriptionData),
  });
  if (!res.ok) throw new Error(`Failed to add prescription: ${res.statusText}`);
  return res.json();
}

export async function updatePrescription(id, updateData) {
  const res = await fetch(`${BASE_URL}/prescriptions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) throw new Error(`Failed to update prescription: ${res.statusText}`);
  return res.json();
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export async function getPharmacistProfile(id = 'default') {
  const res = await fetch(`${BASE_URL}/pharmacist/profile/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.statusText}`);
  return res.json();
}

export async function updatePharmacistProfile(id = 'default', updateData) {
  const res = await fetch(`${BASE_URL}/pharmacist/profile/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) throw new Error(`Failed to update profile: ${res.statusText}`);
  return res.json();
}

// ─── SYSTEM ───────────────────────────────────────────────────────────────────

export async function resetSystemData() {
  const res = await fetch(`${BASE_URL}/pharmacist/system/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to reset system data: ${res.statusText}`);
  return res.json();
}
