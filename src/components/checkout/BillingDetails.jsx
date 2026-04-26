import React from 'react';

/**
 * Component to capture customer billing information.
 * All inputs are required as per the order processing logic.
 */
const DISTRICTS_CITIES = {
    "Colombo": ["Colombo 01-15", "Dehiwala", "Mount Lavinia", "Moratuwa", "Kotte", "Maharagama", "Kesbewa", "Battaramulla", "Kaduwela", "Homagama", "Kolonnawa", "Hanwella", "Avissawella", "Padukka", "Mulleriyawa", "Malabe", "Athurugiriya", "Pannipitiya", "Rajagiriya", "Nugegoda", "Kottawa"],
    "Gampaha": ["Gampaha", "Negombo", "Katunayake", "Wattala", "Kelaniya", "Ja-Ela", "Kadawatha", "Kiribathgoda", "Ragama", "Biyagama", "Delgoda", "Divulapitiya", "Mirigama", "Minuwangoda", "Veyangoda", "Nittambuwa", "Kirindiwela", "Ganemulla", "Kandana"],
    "Kalutara": ["Kalutara", "Panadura", "Horana", "Beruwala", "Matugama", "Aluthgama", "Bandaragama", "Wadduwa", "Agalawatte", "Bulathsinhala", "Dodangoda", "Ingiriya", "Paiyagala"],
    "Kandy": ["Kandy", "Peradeniya", "Katugastota", "Gampola", "Nawalapitiya", "Wattegama", "Kundasale", "Akurana", "Digana", "Kadugannawa", "Madawala", "Teldeniya", "Pilimathalawa", "Menikhinna", "Galagedara"],
    "Galle": ["Galle", "Hikkaduwa", "Karapitiya", "Ambalangoda", "Elpitiya", "Baddegama", "Bentota", "Habaraduwa", "Hiniduma", "Neluwa", "Ahangama", "Batapola", "Karandeniya"],
    "Matara": ["Matara", "Weligama", "Akuressa", "Dickwella", "Deniyaya", "Kamburupitiya", "Kekanadurra", "Kotapola", "Hakmana", "Gandara", "Kamburugamuwa"],
    "Kurunegala": ["Kurunegala", "Kuliyapitiya", "Narammala", "Wariyapola", "Pannala", "Alawwa", "Bingiriya", "Galgamuwa", "Giriulla", "Hettipola", "Ibbagamuwa", "Mawathagama", "Polgahawela", "Nikaweratiya", "Maho"],
    "Anuradhapura": ["Anuradhapura", "Eppawala", "Mihintale", "Kekirawa", "Thalawa", "Habarana", "Medawachchiya", "Padaviya", "Tambuttegama", "Galenbindunuwewa", "Nochchiyagama"],
    "Ratnapura": ["Ratnapura", "Balangoda", "Eheliyagoda", "Kuruwita", "Pelmadulla", "Embilipitiya", "Godakawela", "Kalawana", "Rakwana", "Ayagama", "Kahawatta", "Pannala"],
    "Kegalle": ["Kegalle", "Mawanella", "Warakapola", "Rambukkana", "Dehiowita", "Deraniyagala", "Galigamuwa", "Kitulgala", "Ruwanwella", "Yatiyantota", "Bulathkohupitiya"],
    "Badulla": ["Badulla", "Bandarawela", "Hali-Ela", "Haputale", "Mahiyanganaya", "Welimada", "Diyatalawa", "Ella", "Passara", "Diyatalawa", "Lunugala"],
    "Hambantota": ["Hambantota", "Tangalle", "Beliatta", "Ambalantota", "Tissamaharama", "Angunakolapelessa", "Kataragama", "Walasmulla", "Weeraketiya", "Middeniya"],
    "Puttalam": ["Puttalam", "Chilaw", "Wennappuwa", "Marawila", "Dankotuwa", "Anamaduwa", "Kalpitiya", "Madampe", "Nattandiya", "Mundel"],
    "Jaffna": ["Jaffna", "Chavakachcheri", "Point Pedro", "Nallur", "Chunnakam", "Karainagar", "Kayts", "Kopay", "Tellippalai", "Vaddukoddai", "Manipay"],
    "Trincomalee": ["Trincomalee", "Kinniya", "Mutur", "Kantale", "Kuchchaveli", "Serunuwara"],
    "Batticaloa": ["Batticaloa", "Eravur", "Kattankudy", "Chenkalady", "Kaluwanchikudy", "Valaichchenai", "Oddamavadi"],
    "Ampara": ["Ampara", "Samanthurai", "Kalmunai", "Akkaraipattu", "Mahaoya", "Pottuvil", "Uhana", "Sainthamaruthu", "Dehiattakandiya"],
    "Matale": ["Matale", "Dambulla", "Sigiriya", "Galewela", "Rattota", "Ukuwela", "Pallepola", "Yatawatta"],
    "Nuwara Eliya": ["Nuwara Eliya", "Hatton", "Talawakele", "Ginigathena", "Kotmale", "Maskeliya", "Walapane", "Agrapatana", "Pundaluoya"],
    "Polonnaruwa": ["Polonnaruwa", "Kaduruwela", "Medirigiriya", "Hingurakgoda", "Welikanda", "Aralaganwila", "Bakamuna"],
    "Moneragala": ["Moneragala", "Wellawaya", "Buttala", "Bibile", "Kataragama", "Medagama", "Tanamanwila", "Siyambalanduwa"],
    "Vavuniya": ["Vavuniya", "Cheddikulam", "Nedunkeni"],
    "Mannar": ["Mannar", "Adampan", "Madhu", "Murunkan", "Nanattan", "Talaimannar"],
    "Mullaitivu": ["Mullaitivu", "Oddusuddan", "Puthukkudiyiruppu", "Mankulam", "Mallavi"],
    "Kilinochchi": ["Kilinochchi", "Paranthan", "Poonakary", "Pallai"]
};

const BillingDetails = ({ formData, handleInputChange }) => {
    const districts = Object.keys(DISTRICTS_CITIES).sort();
    const cities = formData.district ? DISTRICTS_CITIES[formData.district] || [] : [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="relative">
                <h2 className="text-2xl font-black text-blue-900 flex items-center gap-3">
                    <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                    Billing Details
                </h2>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                    <div className="h-full w-1/3 bg-blue-600 rounded-full"></div>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
                {/* Contact Information */}
                <div className="md:col-span-2 group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        Email address *
                    </label>
                    <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium" 
                        placeholder="Enter your email"
                    />
                </div>

                {/* Personal Identification */}
                <div className="group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        First name *
                    </label>
                    <input 
                        type="text" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium" 
                    />
                </div>

                <div className="group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        Last name *
                    </label>
                    <input 
                        type="text" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium" 
                    />
                </div>

                {/* Regional Settings - District Dropdown */}
                <div className="group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        District *
                    </label>
                    <select 
                        name="district" 
                        value={formData.district} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium appearance-none cursor-pointer"
                    >
                        <option value="">Select District</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {/* Main City Dropdown */}
                <div className="group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        Main City *
                    </label>
                    <select 
                        name="city" 
                        value={formData.city} 
                        onChange={handleInputChange} 
                        disabled={!formData.district}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Select City</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Street Address */}
                <div className="md:col-span-2 group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        Street Address *
                    </label>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            name="houseNumber" 
                            value={formData.houseNumber} 
                            onChange={handleInputChange} 
                            placeholder="House Number / Name" 
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium" 
                        />
                        <input 
                            type="text" 
                            name="laneStreet" 
                            value={formData.laneStreet} 
                            onChange={handleInputChange} 
                            placeholder="Lane / Street" 
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium" 
                        />
                    </div>
                </div>

                {/* Phone Numbers */}
                <div className="group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        Primary Phone *
                    </label>
                    <input 
                        type="text" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium" 
                        placeholder="07x xxxxxxx"
                    />
                </div>

                <div className="group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        Secondary Phone (Optional)
                    </label>
                    <input 
                        type="text" 
                        name="secondaryPhone" 
                        value={formData.secondaryPhone} 
                        onChange={handleInputChange} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium" 
                        placeholder="Alternative contact"
                    />
                </div>

                {/* Additional Delivery Instructions */}
                <div className="md:col-span-2 group">
                    <label className="block text-[13px] font-bold mb-2 text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
                        Order notes (optional)
                    </label>
                    <textarea 
                        name="orderNotes" 
                        value={formData.orderNotes} 
                        onChange={handleInputChange} 
                        rows="3" 
                        placeholder="Special notes for delivery..." 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm font-medium resize-none"
                    ></textarea>
                </div>
            </div>
        </div>
    );
};

export default BillingDetails;