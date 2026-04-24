const API_BASE_URL = 'http://localhost:5000/pharmacist';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }
  return response.json();
};

/**
 * PHARMACIST PROFILE SERVICE
 */
export const getPharmacistProfile = async (pharmacistId = sessionStorage.getItem('userId') || 'default_pharmacist') => {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${pharmacistId}`);
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching pharmacist profile:", error);
    // Return null if not found, preserving the original behavior
    if (error.message.includes('404')) return null;
    throw error;
  }
};

export const updatePharmacistProfile = async (pharmacistId = sessionStorage.getItem('userId') || 'default_pharmacist', updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${pharmacistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error updating pharmacist profile:", error);
    throw error;
  }
};

/**
 * INVENTORY SERVICE
 */

export const getInventory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory`);
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
};

export const addInventoryItem = async (itemData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error adding inventory item:", error);
    throw error;
  }
};

export const updateInventoryItem = async (id, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    throw error;
  }
};

export const deleteInventoryItem = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    throw error;
  }
};

/**
 * PATIENTS SERVICE
 */

export const getPatients = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`);
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching patients:", error);
    throw error;
  }
};

export const addPatient = async (patientData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error adding patient:", error);
    throw error;
  }
};

export const updatePatient = async (id, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error updating patient:", error);
    throw error;
  }
};

/**
 * PRESCRIPTIONS SERVICE
 */

export const getPrescriptions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/prescriptions`);
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    throw error;
  }
};

export const addPrescription = async (prescriptionData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prescriptionData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error adding prescription:", error);
    throw error;
  }
};

export const updatePrescription = async (id, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/prescriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error updating prescription:", error);
    throw error;
  }
};

/**
 * DISPENSING HISTORY SERVICE
 */

export const getDispensedHistory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/dispensed`);
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching dispends history:", error);
    throw error;
  }
};

export const addDispensedRecord = async (dispenseData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/dispensed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dispenseData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error adding dispensed record:", error);
    throw error;
  }
};

export const updateDispensedRecord = async (id, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/dispensed/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error updating dispensed record:", error);
    throw error;
  }
};

/**
 * ONLINE ORDERS SERVICE
 */

export const getOnlineOrders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`);
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching online orders:", error);
    throw error;
  }
};

export const addOnlineOrder = async (orderData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error adding online order:", error);
    throw error;
  }
};

export const updateOnlineOrder = async (id, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error updating online order:", error);
    throw error;
  }
};

/**
 * RETURN REQUESTS SERVICE
 */

export const getReturnRequests = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/returns`);
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching return requests:", error);
    throw error;
  }
};

export const addReturnRequest = async (returnData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error adding return request:", error);
    throw error;
  }
};

export const updateReturnRequest = async (id, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/returns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error updating return request:", error);
    throw error;
  }
};

/**
 * SYSTEM RESET UTILITY
 */
export const resetSystemData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/system/reset`, {
      method: 'POST',
    });
    return handleResponse(response);
  } catch (error) {
    console.error("Error resetting system data:", error);
    throw error;
  }
};
