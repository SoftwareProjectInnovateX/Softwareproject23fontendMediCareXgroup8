'use client';

import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../../components/HeroCarousel';
import NewArrivals from '../../components/NewArrivals';
import BestSelling from '../../components/BestSelling';
import UploadPrescriptionSection from '../../components/UploadPrescriptionSection';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="bg-[var(--bg-secondary)] w-full">

      {/* HERO */}
      <HeroCarousel />

      {/* NEW ARRIVALS */}
      <NewArrivals />

      {/* UPLOAD SECTION */}
      <UploadPrescriptionSection onOpen={() => navigate("/customer/prescription")} />

      {/* BEST SELLING */}
      <BestSelling />

    </div>
  );
}