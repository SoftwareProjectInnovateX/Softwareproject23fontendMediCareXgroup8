import React, { useState, useEffect } from 'react';
import { 
  Search, Pill, CheckCircle, FileText, Plus, Edit2, Save, X, Trash2
} from 'lucide-react';

const defaultDrugs = [
  {
    id: 'amox-500',
    name: 'Amoxicillin 500mg Caps',
    ndc: '0093-3109-05',
    category: 'Penicillin Antibiotic',
    form: 'Capsule',
    stock: 450,
    route: 'Oral',
    manufacturer: 'Teva Pharmaceuticals',
    description: 'Amoxicillin is a semi-synthetic antibiotic, an analog of ampicillin, with a broad spectrum of bactericidal activity against many gram-positive and gram-negative microorganisms. It is indicated for the treatment of infections due to susceptible strains.'
  },
  {
    id: 'lis-10',
    name: 'Lisinopril 10mg Tab',
    ndc: '0054-0010-25',
    category: 'ACE Inhibitor',
    form: 'Tablet',
    stock: 12,
    route: 'Oral',
    manufacturer: 'Roxane Laboratories',
    description: 'Lisinopril is an angiotensin-converting enzyme (ACE) inhibitor used to treat hypertension, heart failure, and acute myocardial infarction. It lowers blood pressure and improves blood flow.'
  },
  {
    id: 'met-500',
    name: 'Metformin 500mg Tab',
    ndc: '0093-7118-01',
    category: 'Biguanide Antidiabetic',
    form: 'Tablet',
    stock: 80,
    route: 'Oral',
    manufacturer: 'Aurobindo Pharma Usa',
    description: 'Metformin is an antihyperglycemic agent which improves glucose tolerance in patients with type 2 diabetes, lowering both basal and postprandial plasma glucose. It decreases hepatic glucose production and improves insulin sensitivity.'
  },
  {
    id: 'ibu-400',
    name: 'Ibuprofen 400mg Tab',
    ndc: '0904-5890-60',
    category: 'NSAID',
    form: 'Tablet',
    stock: 120,
    route: 'Oral',
    manufacturer: 'Major Pharmaceuticals',
    description: 'Ibuprofen is a nonsteroidal anti-inflammatory drug (NSAID) indicated for the management of mild to moderate pain, inflammatory diseases, and rheumatoid disorders.'
  }
];

const PharmacistDrugLookup = () => {
  const [drugs, setDrugs] = useState(() => {
    const saved = localStorage.getItem('pharmacist_drug_catalog');
    return saved ? JSON.parse(saved) : defaultDrugs;
  });

  const [activeDrug, setActiveDrug] = useState(drugs[0] || null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View states: 'view', 'add', 'edit'
  const [viewState, setViewState] = useState('view');
  
  // Form State
  const [formData, setFormData] = useState({
    id: '', name: '', ndc: '', category: '', form: '', stock: 0, route: '', manufacturer: '', description: ''
  });

  useEffect(() => {
    localStorage.setItem('pharmacist_drug_catalog', JSON.stringify(drugs));
  }, [drugs]);

  const filteredDrugs = drugs.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.ndc && d.ndc.includes(searchTerm))
  );

  const handleSelectDrug = (d) => {
    setActiveDrug(d);
    setViewState('view');
  };

  const startAddDrug = () => {
    setFormData({
      id: `drug-${Date.now()}`, name: '', ndc: '', category: '', form: '', stock: 0, route: '', manufacturer: '', description: ''
    });
    setViewState('add');
  };

  const startEditDrug = () => {
    if(!activeDrug) return;
    setFormData({ ...activeDrug });
    setViewState('edit');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if(viewState === 'add') {
      const newDrugs = [formData, ...drugs];
      setDrugs(newDrugs);
      setActiveDrug(formData);
    } else if (viewState === 'edit') {
      const newDrugs = drugs.map(d => d.id === formData.id ? formData : d);
      setDrugs(newDrugs);
      setActiveDrug(formData);
    }
    setViewState('view');
  };

  const handleDelete = (id) => {
    if(window.confirm('Are you sure you want to delete this drug from the catalog?')) {
      const newDrugs = drugs.filter(d => d.id !== id);
      setDrugs(newDrugs);
      setViewState('view');
      setActiveDrug(newDrugs[0] || null);
    }
  };

  const renderForm = () => (
    <div className="card shadow-md border-slate-200 sticky top-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          {viewState === 'add' ? <Plus className="text-[#0b5ed7]" /> : <Edit2 className="text-[#0b5ed7]" />}
          {viewState === 'add' ? 'Add New Drug' : 'Edit Drug Information'}
        </h2>
        <button onClick={() => setViewState('view')} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Drug Name *</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] font-medium transition-all" placeholder="e.g. Paracetamol 500mg" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">NDC / Barcode</label>
            <input type="text" value={formData.ndc} onChange={e => setFormData({...formData, ndc: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all" placeholder="National Drug Code" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
            <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all" placeholder="e.g. Pain Reliever" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Form</label>
            <input type="text" value={formData.form} onChange={e => setFormData({...formData, form: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all" placeholder="e.g. Tablet, Syrup" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Current Stock qty *</label>
            <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all font-bold text-slate-700" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Route of Admin</label>
            <input type="text" value={formData.route} onChange={e => setFormData({...formData, route: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all" placeholder="e.g. Oral, IV" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Manufacturer</label>
            <input type="text" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all" placeholder="Company Name" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Description & Indications</label>
            <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all resize-y" placeholder="Clinical description and use cases..."></textarea>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={() => setViewState('view')} className="px-6 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-6 py-2.5 rounded-lg font-bold text-white bg-[#0b5ed7] hover:bg-[#084298] transition-colors flex items-center gap-2 shadow-sm">
            <Save className="w-4 h-4" /> Save Catalog Entry
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 lg:gap-8 max-w-[1400px] mx-auto pb-6">

      {/* Left Column: List */}
      <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col shrink-0">
        
        {/* List Header */}
        <div className="bg-[#0b5ed7] rounded-t-2xl p-5 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="font-black text-white text-xl">Drug Catalog</h2>
            <p className="text-white/70 text-xs font-bold mt-1">Manage Pharmacy Inventory</p>
          </div>
          <button onClick={startAddDrug} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-lg transition-colors flex items-center gap-1.5 font-bold shadow-sm" title="Add New Drug">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Search */}
        <div className="bg-white px-4 py-3 border-x border-slate-200 flex items-center relative z-10 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-7" />
          <input 
            type="text" 
            placeholder="Search catalog..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-[#0b5ed7] transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List Items */}
        <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl overflow-hidden flex-1 shadow-sm">
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredDrugs.length > 0 ? filteredDrugs.map(drug => (
              <div 
                key={drug.id}
                onClick={() => handleSelectDrug(drug)}
                className={`p-4 border-b border-slate-100 last:border-0 cursor-pointer transition-all ${
                  activeDrug?.id === drug.id && viewState === 'view' 
                    ? 'bg-blue-50/60 border-l-4 border-l-[#0b5ed7]' 
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className={`font-black text-sm leading-tight pr-2 ${
                    activeDrug?.id === drug.id && viewState === 'view' ? 'text-[#0b5ed7]' : 'text-slate-800'
                  }`}>
                    {drug.name}
                  </h3>
                  {drug.stock <= 20 && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1" title="Low StockWarning"></span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{drug.form || 'Unknown'}</span>
                  <p className="text-xs text-slate-500 font-medium truncate">{drug.category}</p>
                </div>
              </div>
            )) : (
              <div className="text-center p-10 text-slate-500">
                <Pill className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold">No drugs found.</p>
                <p className="text-xs mt-1">Try a different search or add a new drug.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Details or Form */}
      <div className="w-full flex-1">
        
        {viewState !== 'view' && renderForm()}

        {viewState === 'view' && activeDrug && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Header Action Bar */}
            <div className="flex bg-white border border-slate-200 rounded-xl p-3 shadow-sm justify-between items-center px-5">
              <span className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Catalog Entry Active
              </span>
              <div className="flex items-center gap-3">
                <button onClick={startEditDrug} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm">
                  <Edit2 className="w-4 h-4" /> Edit Content
                </button>
                <button onClick={() => handleDelete(activeDrug.id)} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-red-100 shadow-sm">
                  <Trash2 className="w-4 h-4 text-red-500" /> Remove
                </button>
              </div>
            </div>

            {/* Hero Detail Card */}
            <div className="card shadow-md flex flex-col md:flex-row gap-8 items-start border-slate-200 !border-l-[#0b5ed7]">
               <div className="w-28 h-28 bg-[#f5f9ff] border border-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                 <Pill className="w-14 h-14 text-[#0b5ed7] drop-shadow-sm opacity-80" />
               </div>
               
               <div className="flex-1 w-full">
                 <div className="flex flex-col sm:flex-row justify-between items-start w-full gap-4">
                   <div>
                     <h2 className="text-3xl font-black text-slate-800 leading-none">{activeDrug.name}</h2>
                     <div className="flex flex-wrap gap-2 mt-4">
                       <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">NDC: {activeDrug.ndc || 'N/A'}</span>
                       <span className="bg-blue-50 text-[#0b5ed7] text-xs font-bold px-2 py-1 rounded">{activeDrug.category || 'N/A'}</span>
                     </div>
                   </div>
                   <div className="text-right bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl min-w-[140px]">
                     <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Inventory Stock</p>
                     <p className={`text-xl font-black flex items-center gap-1.5 justify-end ${activeDrug.stock > 20 ? 'text-emerald-600' : 'text-red-500'}`}>
                       {activeDrug.stock} <span className="text-sm font-bold text-slate-500">Qty</span>
                     </p>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mt-8 pt-6 border-t border-slate-100">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Route</span>
                      <span className="font-bold text-slate-800 text-sm bg-slate-50 px-2 py-1 rounded">{activeDrug.route || '--'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Formulation</span>
                      <span className="font-bold text-slate-800 text-sm bg-slate-50 px-2 py-1 rounded">{activeDrug.form || '--'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Manufacturer</span>
                      <span className="font-bold text-slate-800 text-sm truncate block bg-slate-50 px-2 py-1 rounded" title={activeDrug.manufacturer}>{activeDrug.manufacturer || '--'}</span>
                    </div>
                 </div>
               </div>
            </div>

            {/* Description Card */}
            <div className="card shadow-sm border-slate-200">
               <h3 className="flex items-center gap-2 font-black text-slate-800 text-lg mb-4">
                 <FileText className="w-5 h-5 text-[#0b5ed7]" /> Clinical Description
               </h3>
               <p className="text-slate-600 leading-relaxed font-medium text-sm whitespace-pre-wrap bg-slate-50 p-5 rounded-xl border border-slate-100 pb-6">
                 {activeDrug.description || 'No description provided.'}
               </p>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};

export default PharmacistDrugLookup;
