import React from 'react';

const DeliveryForm = ({ formData, handleInputChange }) => {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-blue-900 mb-6">Delivery Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input 
                        type="text" name="firstName" value={formData.firstName} onChange={handleInputChange}
                        placeholder="Enter your full name" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input 
                        type="email" name="email" value={formData.email} onChange={handleInputChange}
                        placeholder="email@example.com" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input 
                        type="text" name="phone" value={formData.phone} onChange={handleInputChange}
                        placeholder="07x xxxxxxx" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Street Address</label>
                    <input 
                        type="text" name="street" value={formData.street} onChange={handleInputChange}
                        placeholder="House no, Street name" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                    <input 
                        type="text" name="city" value={formData.city} onChange={handleInputChange}
                        placeholder="Your city" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default DeliveryForm;