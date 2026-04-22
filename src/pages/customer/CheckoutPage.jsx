'use client';

import { useState } from 'react';
import { useCartStore } from '../../stores/cartStore';

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCartStore();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const placeOrder = async () => {
    if (!name || !address || !phone) {
      alert('Please fill all fields');
      return;
    }

    if (items.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          address,
          phone,
          items,
          paymentMethod,
          totalAmount: getTotal(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        clearCart();
        alert(data.message);
      } else {
        alert(data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      alert('Failed to place order');
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      <input
        className="border p-2 w-full mb-2"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-2"
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-4"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <select
        className="border p-2 w-full mb-4"
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
      >
        <option value="cod">Cash on Delivery</option>
        <option value="online">Online Payment</option>
      </select>

      <button
        onClick={placeOrder}
        className="bg-green-600 text-white w-full py-2 rounded"
      >
        Place Order
      </button>
    </div>
  );
}