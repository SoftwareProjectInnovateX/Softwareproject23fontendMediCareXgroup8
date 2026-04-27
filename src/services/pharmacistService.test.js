import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getInventory, updateInventoryItem } from './pharmacistService';

// Mocking the global fetch function using Vitest's vi.fn()
global.fetch = vi.fn();

describe('Pharmacist Service Layer - Unit Tests', () => {
  
  beforeEach(() => {
    // Clear all mocks before each test to ensure a clean state
    fetch.mockClear();
  });

  /**
   * Test 1: Successful retrieval of inventory
   * This verifies that the function correctly processes a successful API response.
   */
  test('getInventory should return inventory data on success', async () => {
    const mockInventory = [
      { id: '1', name: 'Amoxicillin', stock: 500 },
      { id: '2', name: 'Paracetamol', stock: 200 }
    ];

    // Mocking a successful response (res.ok = true)
    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockInventory),
    });

    const result = await getInventory();

    expect(result).toEqual(mockInventory);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/pharmacist/inventory'));
  });

  /**
   * Test 2: Error handling on API failure
   * This verifies that the function throws an error if the backend returns an error status.
   */
  test('getInventory should throw an error when API call fails', async () => {
    // Mocking a failed response (res.ok = false)
    fetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    await expect(getInventory()).rejects.toThrow('Failed to fetch inventory: Internal Server Error');
  });

  /**
   * Test 3: Updating an inventory item
   * This verifies that the function correctly sends a PUT request with the right data.
   */
  test('updateInventoryItem should send correct data and return result', async () => {
    const mockUpdateResponse = { id: '1', stock: 450 };
    const updateData = { stock: 450 };

    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockUpdateResponse),
    });

    const result = await updateInventoryItem('1', updateData);

    expect(result).toEqual(mockUpdateResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/pharmacist/inventory/1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
    );
  });

});
