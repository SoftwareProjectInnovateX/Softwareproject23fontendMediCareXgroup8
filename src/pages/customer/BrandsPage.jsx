import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import PageBanner from "../../components/profile/PageBanner";
import BrandCard from "../../components/brands/BrandCard";

const C = {
  bg: "var(--bg-primary)",
};

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "brands"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBrands(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      
      <PageBanner
        title="Trusted International Medical Brands"
        subtitle="We partner with global healthcare leaders"
      />

      <div className="max-w-[1200px] mx-auto px-6 py-10 grid grid-cols-2 gap-5">
        {brands.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>

    </div>
  );
}