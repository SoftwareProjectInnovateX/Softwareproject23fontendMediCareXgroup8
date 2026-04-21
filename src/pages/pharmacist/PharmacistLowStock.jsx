import React, { useState } from 'react';
import { ArrowLeft, Search, AlertCircle, Plus, PackagePlus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistLowStock = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedId, setSelectedMedId] = useState(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Initial Mock Data
  const [lowStockMeds, setLowStockMeds] = useState([
    { id: 1, name: 'Paracetamol', dosage: '500mg', batch: 'B-1029', currentStock: 45, minLevel: 100 },
    { id: 2, name: 'Vitamin C', dosage: '1000mg', batch: 'B-1055', currentStock: 12, minLevel: 50 },
    { id: 3, name: 'Ibuprofen', dosage: '400mg', batch: 'B-2201', currentStock: 25, minLevel: 80 },
    { id: 4, name: 'Cetirizine', dosage: '10mg', batch: 'B-3344', currentStock: 5, minLevel: 30 }
  ]);

  const filteredMeds = lowStockMeds.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    med.batch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRestockClick = (id) => {
    setSelectedMedId(id === selectedMedId ? null : id);
    setAddQuantity(''); // Reset input
    setSuccessMessage('');
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    if (!addQuantity || isNaN(addQuantity) || Number(addQuantity) <= 0) return;

    setLowStockMeds(prev => prev.map(med => {
      if (med.id === selectedMedId) {
        return { ...med, currentStock: med.currentStock + Number(addQuantity) };
      }
      return med;
    }));

    setSuccessMessage('Stock added successfully!');
    setTimeout(() => {
      setSuccessMessage('');
      setSelectedMedId(null);
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* PharmacistHeader */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            Low Stock PharmacistInventory
          </h1>
          <p className="text-slate-500 mt-1">Review items below minimum capacity and restock.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by medicine name or batch number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
          />
        </div>
        <div className="bg-orange-50 text-orange-600 px-6 py-3 rounded-xl border border-orange-100 font-bold flex items-center gap-2 shadow-sm">
           <AlertCircle className="w-5 h-5" />
           {lowStockMeds.filter(m => m.currentStock < m.minLevel).length} Action Items
        </div>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredMeds.map((med) => (
          <div 
            key={med.id} 
            className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${
              selectedMedId === med.id 
                ? 'border-blue-300 ring-1 ring-blue-500/20' 
                : 'border-slate-200 hover:border-blue-200'
            }`}
          >
            {/* Display View */}
            <div className="p-5 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                  {med.name}
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold border border-slate-200 ">
                    {med.dosage}
                  </span>
                </h3>
                <p className="text-sm font-medium text-slate-500 ">
                  Batch No: <span className="text-slate-700 font-bold">{med.batch}</span>
                </p>
                
                <div className="mt-4 flex gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Current Stock</p>
                    <p className={`text-xl font-bold ${med.currentStock < med.minLevel ? 'text-orange-500 ' : 'text-emerald-500 '}`}>
                      {med.currentStock}
                    </p>
                  </div>
                  <div className="w-px bg-slate-200 "></div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Min Level</p>
                    <p className="text-xl font-bold text-slate-600 ">
                      {med.minLevel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Restock Button Toggle */}
              <button 
                onClick={() => handleRestockClick(med.id)}
                className={`p-2 rounded-lg font-bold text-sm transition-colors ${
                  selectedMedId === med.id
                    ? 'bg-slate-100 text-slate-600 '
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
                title="Add to PharmacistInventory"
              >
                <PackagePlus className="w-5 h-5" />
              </button>
            </div>

            {/* Restock Form Expansion */}
            {selectedMedId === med.id && (
              <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 ">
                {successMessage ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 py-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    {successMessage}
                  </div>
                ) : (
                  <form onSubmit={handleAddStock} className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Add Amount</label>
                      <input 
                        type="number" 
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(e.target.value)}
                        placeholder="Enter quantity to add..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 "
                        min="1"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 h-[38px] transition-colors shadow-sm shadow-blue-500/20"
                      >
                        <Plus className="w-4 h-4" /> Save
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            
            {/* Visual Indicator Bar */}
            <div className="w-full h-1 bg-slate-100 ">
               <div 
                 className={`h-full ${med.currentStock < med.minLevel ? 'bg-orange-500' : 'bg-emerald-500'} transition-all`}
                 style={{ width: `${Math.min((med.currentStock / med.minLevel) * 100, 100)}%` }}
               ></div>
            </div>
          </div>
        ))}

        {filteredMeds.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded-xl border border-slate-200 ">
            <p className="text-slate-500 ">No low stock items found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacistLowStock;

