import { useState, useRef, useEffect } from "react";
import { UploadCloud, X } from "lucide-react";

const C = {
  bg:          "#f8fafc",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  accentMid:   "#0284c7",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = { body: "'DM Sans', sans-serif" };

// Backend endpoint for all brand CRUD operations
const BRANDS_API = 'http://localhost:5000/api/brands';

// Reusable labelled field wrapper used across all form inputs
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.1em]">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AddBrandForm() {
  // Controlled form state for all brand fields
  const [form, setForm] = useState({
    name: "", tagline: "", description: "",
    category: "", rating: "", products: "",
    established: "", country: "", imageUrl: "",
  });

  const [loading, setLoading]           = useState(false);
  const [isDragging, setIsDragging]     = useState(false);
  // Holds the raw File object for the uploaded image
  const [imageFile, setImageFile]       = useState(null);
  // Holds the base64 data URL used for previewing the selected image
  const [imagePreview, setImagePreview] = useState(null);
  // Ref to the hidden file input so the drop zone can trigger it programmatically
  const fileInputRef = useRef(null);

  // Injects a global style to override placeholder color on brand inputs
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `.brand-input::placeholder { color: rgba(30,41,59,0.4) !important; }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Generic change handler for all text/number inputs using field name attribute
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Validates and reads an image file into a base64 preview using FileReader
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) { alert("Please select a valid image file."); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Drag-and-drop event handlers for the image upload zone
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true);  };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleImageFile(file); };
  // Handles image selection via the hidden file input
  const handleFileInput = (e) => { const file = e.target.files?.[0]; if (file) handleImageFile(file); };

  // Clears the uploaded image and resets both the preview and imageUrl form field
  const removeImage = () => {
    setImageFile(null); setImagePreview(null);
    setForm({ ...form, imageUrl: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submits the brand to the backend — uses base64 preview if uploaded, else the pasted URL
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(BRANDS_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          // Prefer uploaded image preview; fall back to pasted URL; default to empty string
          imageUrl:    imagePreview || form.imageUrl || '',
          // Cast numeric string fields to numbers before sending
          rating:      Number(form.rating),
          products:    Number(form.products),
          established: Number(form.established),
        }),
      });

      alert("Brand added successfully!");
      // Reset all form fields and image state after successful submission
      setForm({ name: "", tagline: "", description: "", category: "", rating: "", products: "", established: "", country: "", imageUrl: "" });
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-[14px] max-w-[520px] font-['DM_Sans',sans-serif]"
    >

      <Field label="Brand Name">
        <input
          name="name"
          placeholder="e.g. Pfizer"
          value={form.name}
          onChange={handleChange}
          className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border"
          required
        />
      </Field>

      <Field label="Tagline">
        <input
          name="tagline"
          placeholder="e.g. Premium Respiratory Care"
          value={form.tagline}
          onChange={handleChange}
          className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border"
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          placeholder="Brand description..."
          value={form.description}
          onChange={handleChange}
          rows={4}
          className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border resize-y"
          required
        />
      </Field>

      <Field label="Category">
        <input
          name="category"
          placeholder="e.g. Respiratory, Wellness"
          value={form.category}
          onChange={handleChange}
          className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border"
          required
        />
      </Field>

      {/* ── Image upload: drag-and-drop zone or URL fallback ── */}
      <Field label="Brand Image">
        {/* Show drop zone when no image is selected; show preview once one is loaded */}
        {!imagePreview ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[10px] px-4 py-6 text-center cursor-pointer transition-all duration-150 ${
              isDragging
                ? "border-[#1a87e1] bg-[rgba(26,135,225,0.05)]"
                : "border-[rgba(26,135,225,0.35)] bg-[#f8fafc]"
            }`}
          >
            <UploadCloud size={28} color={C.accent} className="mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-[#1e293b]">Drag & drop brand image here</p>
            <p className="text-[11px] text-[#64748b] mt-1">or click to browse</p>
            {/* Hidden input triggered by clicking the drop zone or camera button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          /* Image preview with overlay showing filename and a remove button */
          <div className="relative rounded-[10px] overflow-hidden border border-[rgba(26,135,225,0.18)]">
            <img
              src={imagePreview}
              alt="preview"
              className="w-full h-40 object-cover block"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-600 text-white border-none rounded-[20px] px-[10px] py-1 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
            >
              <X size={11} /> Remove
            </button>
            {/* Filename overlay at the bottom of the preview */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[11px] px-[10px] py-1">
              {imageFile?.name}
            </div>
          </div>
        )}

        {/* URL input fallback — only shown when no file has been uploaded */}
        {!imagePreview && (
          <div className="mt-2">
            <p className="text-[11px] text-[#64748b] text-center mb-[6px]">— or paste image URL —</p>
            <input
              name="imageUrl"
              placeholder="https://example.com/image.jpg"
              value={form.imageUrl}
              onChange={handleChange}
              className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border"
            />
          </div>
        )}
      </Field>

      {/* Rating and product count side by side */}
      <div className="grid grid-cols-2 gap-[14px]">
        <Field label="Rating">
          <input
            name="rating"
            placeholder="e.g. 4.8"
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={form.rating}
            onChange={handleChange}
            className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border"
          />
        </Field>
        <Field label="No. of Products">
          <input
            name="products"
            placeholder="e.g. 120"
            type="number"
            value={form.products}
            onChange={handleChange}
            className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border"
          />
        </Field>
      </div>

      {/* Established year and country of origin side by side */}
      <div className="grid grid-cols-2 gap-[14px]">
        <Field label="Established Year">
          <input
            name="established"
            placeholder="e.g. 1998"
            type="number"
            value={form.established}
            onChange={handleChange}
            className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border"
          />
        </Field>
        <Field label="Country">
          <input
            name="country"
            placeholder="e.g. Germany"
            value={form.country}
            onChange={handleChange}
            className="brand-input bg-white border border-[rgba(26,135,225,0.4)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full box-border"
          />
        </Field>
      </div>

      {/* Submit button — faded and disabled while the request is in flight */}
      <button
        type="submit"
        disabled={loading}
        className={`border-none rounded-[10px] px-3 py-3 text-[14px] font-semibold font-['DM_Sans',sans-serif] mt-1 text-white transition-all ${
          loading
            ? "bg-[rgba(26,135,225,0.4)] cursor-not-allowed shadow-none"
            : "bg-[#1a87e1] cursor-pointer shadow-[0_4px_12px_rgba(26,135,225,0.25)]"
        }`}
      >
        {loading ? "Adding..." : "Add Brand"}
      </button>
    </form>
  );
}