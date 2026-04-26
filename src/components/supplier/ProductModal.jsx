import { Package } from 'lucide-react';
import { CATEGORIES } from '../../data/categories';
import { CATEGORY_ICONS } from './CategoryBadge';

const inputCls =
  'w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-[15px] text-slate-800 bg-white ' +
  'transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 ' +
  'focus:ring-blue-500/10 focus:bg-slate-50 placeholder:text-slate-400';

const formFields = [
  { label: 'Product Name',                key: 'productName',    type: 'text',   placeholder: 'e.g., Paracetamol 500mg',   required: true,  full: false },
  { label: 'Wholesale Price (Rs.)',        key: 'wholesalePrice', type: 'number', placeholder: '0.00',                      required: true,  full: false, extra: { step: '0.01' } },
  { label: 'Stock Supplied to MediCareX', key: 'stock',          type: 'number', placeholder: '0',                         required: false, full: false },
  { label: 'Remaining Stock (with You)',  key: 'minStock',       type: 'number', placeholder: '0',                         required: false, full: false },
  { label: 'Manufacturer',                key: 'manufacturer',   type: 'text',   placeholder: 'e.g., ABC Pharmaceuticals', required: false, full: true  },
];

const ProductModal = ({
  showModal,
  editingProduct,
  formData,
  setFormData,
  onSubmitAdd,
  onSubmitUpdate,
  onClose,
}) => {
  if (!showModal) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-10 w-full max-w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ animation: 'slideUp 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[28px] font-bold text-slate-900 mb-2 pb-4 border-b-[3px] border-blue-600">
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </h2>

        {!editingProduct && (
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <p className="text-[13px] text-amber-800">
              This product will be submitted for <strong>admin approval</strong> before it appears in the inventory.
              A unique product code will be assigned upon approval.
            </p>
          </div>
        )}

        {editingProduct && (
          <div className="mb-6 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
            <span className="text-[13px] text-slate-500">Product Code</span>
            <span className="font-mono text-[13px] font-semibold text-slate-700 tracking-wide">
              {editingProduct.productCode}
            </span>
            <span className="ml-auto text-[11px] text-slate-400 italic">auto-generated · read-only</span>
          </div>
        )}

        <form onSubmit={editingProduct ? onSubmitUpdate : onSubmitAdd}>
          <div className="grid grid-cols-2 gap-x-7 gap-y-8">

            {/* Category */}
            <div className="flex flex-col">
              <label className="block mb-2.5 font-semibold text-slate-900 text-[15px]">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={inputCls}
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {/* Icon preview for selected category */}
              {formData.category && (() => {
                const match = CATEGORIES.find((c) => c.id === formData.category);
                const IconComponent = match ? (CATEGORY_ICONS[match.id] || Package) : null;
                return match && IconComponent ? (
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-slate-500">
                    <IconComponent size={15} className="text-blue-500" />
                    <span>{match.name} selected</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Dynamic fields */}
            {formFields.map((field) => (
              <div key={field.key} className={`flex flex-col ${field.full ? 'col-span-2' : ''}`}>
                <label className="block mb-2.5 font-semibold text-slate-900 text-[15px]">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={formData[field.key]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className={inputCls}
                  {...(field.extra || {})}
                />
              </div>
            ))}

            {/* Expiry Date */}
            <div className="flex flex-col">
              <label className="block mb-2.5 font-semibold text-slate-900 text-[15px]">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.expireDate}
                onChange={(e) => setFormData({ ...formData, expireDate: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col col-span-2">
              <label className="block mb-2.5 font-semibold text-slate-900 text-[15px]">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Product description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`${inputCls} resize-y min-h-[100px] leading-relaxed`}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 mt-10 pt-7 border-t-2 border-slate-200">
            <button
              type="submit"
              className="flex-1 py-4 px-7 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {editingProduct ? 'Update Product' : 'Submit for Approval'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-7 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 hover:border-slate-400 font-semibold text-base rounded-lg cursor-pointer transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;