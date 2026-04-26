const SearchAndAdd = ({ searchTerm, setSearchTerm, onAddClick }) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex justify-between items-center gap-4 flex-wrap">
      <input
        type="text"
        placeholder="Search by name, code or category..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 min-w-[280px] px-4 py-3 border-2 border-slate-200 rounded-lg text-[15px] transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
      <button
        onClick={onAddClick}
        className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 font-semibold rounded-lg cursor-pointer text-[15px] transition-all duration-200 hover:bg-blue-600 hover:text-white hover:-translate-y-px hover:shadow-md whitespace-nowrap"
      >
        + Add New Product
      </button>
    </div>
  );
};

export default SearchAndAdd;