import React from 'react';

/**
 * Component to capture customer billing information.
 * All inputs are required as per the order processing logic.
 */
const BillingDetails = ({ formData, handleInputChange }) => {
    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-2xl font-bold text-blue-900 border-b pb-4">
                    Billing details
                </h2>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        Email address *
                    </label>
                    <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                        placeholder="Enter your email"
                    />
                </div>

                {/* Personal Identification */}
                <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        First name *
                    </label>
                    <input 
                        type="text" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        Last name *
                    </label>
                    <input 
                        type="text" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                    />
                </div>

                {/* Regional Settings */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        Country / Region *
                    </label>
                    <div className="w-full p-4 bg-white border border-slate-100 rounded-lg font-medium text-slate-600">
                        Sri Lanka
                    </div>
                </div>

                {/* Physical Address Details */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        House Number / Name *
                    </label>
                    <input 
                        type="text" 
                        name="houseNumber" 
                        value={formData.houseNumber} 
                        onChange={handleInputChange} 
                        placeholder="House Number or Name" 
                        className="w-full p-4 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        Lane / Street *
                    </label>
                    <input 
                        type="text" 
                        name="laneStreet" 
                        value={formData.laneStreet} 
                        onChange={handleInputChange} 
                        placeholder="Lane / Street" 
                        className="w-full p-4 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        Town / City *
                    </label>
                    <input 
                        type="text" 
                        name="city" 
                        value={formData.city} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        Phone *
                    </label>
                    <input 
                        type="text" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                        placeholder="07x xxxxxxx"
                    />
                </div>

                {/* Additional Delivery Instructions */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-slate-700">
                        Order notes (optional)
                    </label>
                    <textarea 
                        name="orderNotes" 
                        value={formData.orderNotes} 
                        onChange={handleInputChange} 
                        rows="4" 
                        placeholder="Notes about your order, e.g. special notes for delivery." 
                        className="w-full p-4 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    ></textarea>
                </div>
            </div>
        </div>
    );
};

export default BillingDetails;