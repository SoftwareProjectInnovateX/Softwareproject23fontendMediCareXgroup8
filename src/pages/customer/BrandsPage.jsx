import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import PageBanner from "../../components/profile/PageBanner";
import BrandCard  from "../../components/brands/BrandCard";
// Base URL for all API calls — falls back to localhost in development
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
const C = {
  bg: "var(--bg-primary)",
};
export default function BrandsPage() {
  // Holds the list of brands fetched from the backend
  const [brands, setBrands] = useState([]);
  // Fetch all brands from backend on initial mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res  = await fetch(`${API_BASE}/brands`);
        const data = await res.json();
        // Ensure we always set an array even if the response is unexpected
        setBrands(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch brands:", err);
      }
    };
    fetchBrands();
  }, []);
  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* Page header banner with title and subtitle */}
      <PageBanner
        title="Trusted International Medical Brands"
        subtitle="We partner with global healthcare leaders"
      />
      {/* Brand cards grid — 2 columns, max width 1200px */}
      <div className="max-w-[1200px] mx-auto px-6 py-10 grid grid-cols-2 gap-5">
        {brands.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>
    </div>
  );
}