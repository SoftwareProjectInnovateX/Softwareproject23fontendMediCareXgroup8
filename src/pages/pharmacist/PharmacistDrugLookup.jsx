import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, Pill, FileText, AlertTriangle, Activity, 
  ShieldCheck, Loader2, Globe, Beaker, Factory, Info
} from 'lucide-react';

const PharmacistDrugLookup = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [results, setResults] = useState([]);
  const [activeDrug, setActiveDrug] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  // Initial greeting state
  const isInitialState = !submittedTerm && results.length === 0 && !error && !isSearching;

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setSubmittedTerm(searchTerm);
    }
  };

  // Handle incoming search from other pages
  useEffect(() => {
    if (location.state?.searchTarget) {
      setSearchTerm(location.state.searchTarget);
      setSubmittedTerm(location.state.searchTarget);
      const StateObj = { ...location.state };
      delete StateObj.searchTarget;
      window.history.replaceState(StateObj, document.title);
    }
  }, [location]);

  // Sri Lankan (British) to US FDA Dictionary
  const slDrugDictionary = {
    "paracetamol": "acetaminophen",
    "panadol": "acetaminophen",
    "salbutamol": "albuterol",
    "ventolin": "albuterol",
    "adrenaline": "epinephrine",
    "noradrenaline": "norepinephrine",
    "lignocaine": "lidocaine",
    "glibenclamide": "glyburide",
    "isoprenaline": "isoproterenol",
    "pethidine": "meperidine",
    "thyroxine": "levothyroxine",
    "frusemide": "furosemide",
    "lasix": "furosemide",
    "benzhexol": "trihexyphenidyl",
    "amethocaine": "tetracaine",
    "cetrazine": "cetirizine",
    "cetirizine": "cetirizine"
  };

  // OpenFDA API Call & Fallbacks
  useEffect(() => {
    const fetchDrugs = async () => {
      if (!submittedTerm.trim() || submittedTerm.trim().length < 3) {
        if (!submittedTerm.trim()) {
           setResults([]);
           setActiveDrug(null);
           setError(null);
        }
        return;
      }

      setIsSearching(true);
      setError(null);
      
      try {
        const rawTerm = submittedTerm.trim().toLowerCase();
        const searchTarget = slDrugDictionary[rawTerm] || rawTerm;
        const query = encodeURIComponent(`"${searchTarget}"`);
        
        // 1. Try OpenFDA API
        const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${query}+openfda.generic_name:${query}&limit=20`;
        let response = await fetch(url);
        
        if (!response.ok) {
           const fallbackUrl = `https://api.fda.gov/drug/label.json?search=${query}&limit=20`;
           response = await fetch(fallbackUrl);
        }

        if (response.ok) {
          const data = await response.json();
          const validResults = data.results.filter(r => r.openfda && (r.openfda.brand_name || r.openfda.generic_name));
          
          if (validResults.length > 0) {
             // Add a flag if we translated the term
             if (searchTarget !== rawTerm) {
                validResults.forEach(r => {
                   r._mappedTerm = searchTarget;
                   r._sriLankanTerm = rawTerm;
                });
             }
             setResults(validResults);
             setActiveDrug(validResults[0]);
             return; // Success!
          }
        }
        
        // 2. Wikipedia Fallback (For non-US drugs like Gliclazide, or if FDA fails)
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(submittedTerm.trim())}`;
        const wikiRes = await fetch(wikiUrl);
        
        if (wikiRes.ok) {
           const wikiData = await wikiRes.json();
           if (wikiData.type === 'standard' && wikiData.extract) {
              const wikiFallbackDrug = {
                 id: wikiData.pageid,
                 isWikipediaFallback: true,
                 brand_name: wikiData.title,
                 generic_name: "General Drug Information",
                 description: wikiData.extract,
                 manufacturer: "Global Source (Wikipedia API)",
                 image: wikiData.thumbnail?.source
              };
              setResults([wikiFallbackDrug]);
              setActiveDrug(wikiFallbackDrug);
              return; // Success from Wikipedia!
           }
        }

        throw new Error(`No data found for "${submittedTerm}".`);
        
      } catch (err) {
        setResults([]);
        setActiveDrug(null);
        setError(err.message);
      } finally {
        setIsSearching(false);
      }
    };

    fetchDrugs();
  }, [submittedTerm]);

  // Helpers to safely extract and clean FDA response text
  const getField = (obj, path) => {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const getCleanText = (text) => {
    if (!text) return null;
    return text.replace(/^[A-Z0-9\s&]+:/, '').trim();
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 lg:gap-8 max-w-[1400px] mx-auto pb-6 h-[calc(100vh-120px)]">

      {/* Left Column: Search & List */}
      <div className="w-full md:w-[380px] flex flex-col shrink-0 h-full">
        
        {/* Header & Search */}
        <div className="bg-[#0b5ed7] rounded-t-2xl p-5 shadow-sm relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -right-10 -top-10 text-white/10">
             <Globe className="w-40 h-40" />
          </div>
          
          <div className="relative z-10">
            <h2 className="font-black text-white text-xl flex items-center gap-2">
               <Globe className="w-5 h-5" /> Global Drug API
            </h2>
            <p className="text-blue-100 text-xs font-bold mt-1">Live Clinical Reference Encyclopedia</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white px-4 py-4 border-x border-slate-200 shadow-sm z-10">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-[#0b5ed7] absolute left-3.5 top-3.5 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            )}
            <input 
              type="text" 
              placeholder="Enter drug name & press Enter..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all placeholder:font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Results List */}
        <div className="bg-slate-50 border-x border-b border-slate-200 rounded-b-2xl overflow-y-auto flex-1 shadow-inner custom-scrollbar">
          
          {isInitialState && (
            <div className="text-center p-10 mt-10">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4">
                 <ShieldCheck className="w-8 h-8 text-blue-400" />
               </div>
               <h3 className="text-slate-700 font-black mb-2">Connected to OpenFDA</h3>
               <p className="text-xs font-medium text-slate-500 leading-relaxed">
                 Search over 100,000+ clinical drug labels globally. Enter a medication name to instantly retrieve verified clinical information.
               </p>
            </div>
          )}

          {error && !isSearching && (
            <div className="text-center p-8 mt-4">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-bold text-slate-700">{error}</p>
              <p className="text-xs font-medium text-slate-500 mt-2">Keep typing the full name or check your spelling.</p>
            </div>
          )}

          <div className={isSearching ? "opacity-50 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
            {results.map((drug, idx) => {
              const isWiki = drug.isWikipediaFallback;
              const brand = isWiki ? drug.brand_name : (getField(drug, 'openfda.brand_name') || 'Unknown Brand');
              const genericRaw = isWiki ? drug.generic_name : (getField(drug, 'openfda.generic_name') || 'Unknown Generic');
            
            // Override generic name with Sri Lankan term if it was mapped
            const generic = drug._sriLankanTerm ? 
                drug._sriLankanTerm.charAt(0).toUpperCase() + drug._sriLankanTerm.slice(1).toLowerCase() 
                : genericRaw;
                
            const isActive = activeDrug && (activeDrug.id === drug.id || activeDrug === drug);

            return (
              <div 
                key={drug.id || idx}
                onClick={() => setActiveDrug(drug)}
                className={`p-4 border-b border-slate-200 last:border-0 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-white border-l-4 border-l-[#0b5ed7] shadow-sm relative z-10' 
                    : 'hover:bg-white border-l-4 border-l-transparent'
                }`}
              >
                <h3 className={`font-black text-sm leading-tight mb-1 truncate ${
                  isActive ? 'text-[#0b5ed7]' : 'text-slate-800'
                }`}>
                  {brand}
                </h3>
                <p className="text-[11px] font-bold text-slate-500 truncate mb-2">{generic}</p>
                <div className="flex items-center gap-2">
                  {isWiki ? (
                    <span className="text-[9px] uppercase tracking-widest font-black text-purple-500 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">
                      WIKIPEDIA SOURCE
                    </span>
                  ) : (
                    <>
                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                        {getField(drug, 'openfda.route') || 'N/A Route'}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-black text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                        {getField(drug, 'openfda.product_type') || 'Drug'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

      </div>

      {/* Right Column: API Data Display */}
      <div className="w-full flex-1 h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
        
        {activeDrug ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Identity Hero Header */}
            <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-xl shadow-blue-900/5 relative overflow-hidden">
               {/* Decorative Gradient */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20"></div>

               <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#0b5ed7] to-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20 text-white">
                    <Pill className="w-10 h-10 drop-shadow-sm" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                       {activeDrug.isWikipediaFallback ? (
                         <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-purple-200">
                           WIKIPEDIA GLOBAL DATA
                         </span>
                       ) : (
                         <>
                           {activeDrug._mappedTerm && (
                             <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-amber-200">
                               FDA MATCH: {activeDrug._mappedTerm.toUpperCase()}
                             </span>
                           )}
                           <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-200">
                             {getField(activeDrug, 'openfda.product_type') || 'CLINICAL DRUG'}
                           </span>
                           <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-slate-200">
                             ROUTE: {getField(activeDrug, 'openfda.route') || 'VARIOUS'}
                           </span>
                         </>
                       )}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight mb-2">
                       {activeDrug.isWikipediaFallback 
                           ? activeDrug.brand_name 
                           : (getField(activeDrug, 'openfda.brand_name') || (activeDrug._sriLankanTerm ? activeDrug._sriLankanTerm.toUpperCase() : getField(activeDrug, 'openfda.generic_name')) || 'Unnamed Medication')}
                    </h1>
                    
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                       <Beaker className="w-4 h-4 text-slate-400" />
                       Active Ingredient: <span className="text-slate-700 uppercase">
                         {activeDrug.isWikipediaFallback 
                            ? activeDrug.generic_name 
                            : (activeDrug._sriLankanTerm || getField(activeDrug, 'openfda.generic_name') || 'Not specified')}
                       </span>
                    </div>
                  </div>
               </div>

               <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 relative z-10">
                  <Factory className="w-5 h-5 text-slate-400" />
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manufacturer / Source</p>
                     <p className="text-sm font-bold text-slate-700">{activeDrug.isWikipediaFallback ? activeDrug.manufacturer : (getField(activeDrug, 'openfda.manufacturer_name') || 'Unknown Manufacturer')}</p>
                  </div>
               </div>
            </div>

            {/* Clinical Data Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               
               {/* Indications & Usage */}
               {getField(activeDrug, 'indications_and_usage') && (
                 <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-emerald-600" />
                       </div>
                       <h3 className="font-black text-slate-800 text-lg">Indications & Usage</h3>
                    </div>
                    <div className="text-sm font-medium text-slate-600 leading-relaxed max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                       {getCleanText(getField(activeDrug, 'indications_and_usage'))}
                    </div>
                 </div>
               )}

               {/* Dosage & Administration */}
               {getField(activeDrug, 'dosage_and_administration') && (
                 <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#0b5ed7]" />
                       </div>
                       <h3 className="font-black text-slate-800 text-lg">Dosage & Administration</h3>
                    </div>
                    <div className="text-sm font-medium text-slate-600 leading-relaxed max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                       {getCleanText(getField(activeDrug, 'dosage_and_administration'))}
                    </div>
                 </div>
               )}

               {/* Warnings (Full Width if exists) */}
               {getField(activeDrug, 'warnings') && (
                 <div className="lg:col-span-2 bg-amber-50/50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                       </div>
                       <h3 className="font-black text-amber-900 text-lg">Clinical Warnings & Precautions</h3>
                    </div>
                    <div className="text-sm font-bold text-amber-800/80 leading-relaxed">
                       {getCleanText(getField(activeDrug, 'warnings'))}
                    </div>
                 </div>
               )}

               {/* General Description */}
               {(getField(activeDrug, 'description') || activeDrug.isWikipediaFallback) && (
                 <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeDrug.isWikipediaFallback ? 'bg-purple-50' : 'bg-slate-100'}`}>
                            <Info className={`w-5 h-5 ${activeDrug.isWikipediaFallback ? 'text-purple-600' : 'text-slate-600'}`} />
                         </div>
                         <h3 className="font-black text-slate-800 text-lg">
                           {activeDrug.isWikipediaFallback ? 'Global Wikipedia Information' : 'General Description'}
                         </h3>
                       </div>
                    </div>
                    
                    {activeDrug.isWikipediaFallback && activeDrug.image && (
                       <img src={activeDrug.image} alt={activeDrug.brand_name} className="float-right ml-6 mb-4 max-w-[200px] rounded-xl border border-slate-200 shadow-sm" />
                    )}
                    
                    <div className="text-sm font-medium text-slate-600 leading-relaxed">
                       {activeDrug.isWikipediaFallback ? activeDrug.description : getCleanText(getField(activeDrug, 'description'))}
                    </div>
                 </div>
               )}

            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center p-10 animate-in fade-in duration-500">
             <div>
               <Globe className={`w-20 h-20 mx-auto mb-5 ${error ? 'text-amber-200' : 'text-slate-200'}`} />
               <p className="text-lg font-bold text-slate-400">
                  {error ? "No clinical data found yet." : "Select a drug from the global results"}
                  <br/>
                  {!error && "to view clinical data."}
               </p>
             </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default PharmacistDrugLookup;
