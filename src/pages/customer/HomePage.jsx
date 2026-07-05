'use client';

import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../../components/HeroCarousel';
import NewArrivals from '../../components/NewArrivals';
import BestSelling from '../../components/BestSelling';
import UploadPrescriptionSection from '../../components/UploadPrescriptionSection';
import { C, FONT } from '../../components/profile/profileTheme';
import { ShoppingBag, Heart, Star, Truck, Shield, Users } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      {/* HERO */}
      <HeroCarousel />

      {/* FEATURES SECTION */}
      <section className="py-10 px-4 md:py-16 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4" style={{ color: C.textPrimary, fontFamily: FONT.body }}>
              Why Choose MediCareX?
            </h2>
            <p className="text-base md:text-lg" style={{ color: C.textSecondary }}>
              Your trusted partner for quality healthcare products and services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: C.accentLight }}>
                <Shield size={32} style={{ color: C.accent }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: C.textPrimary }}>Quality Assured</h3>
              <p style={{ color: C.textSecondary }}>All products are verified and meet international standards</p>
            </div>

            <div className="text-center p-6 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: C.accentLight }}>
                <Truck size={32} style={{ color: C.accent }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: C.textPrimary }}>Fast Delivery</h3>
              <p style={{ color: C.textSecondary }}>Quick and reliable shipping across Sri Lanka</p>
            </div>

            <div className="text-center p-6 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: C.accentLight }}>
                <Users size={32} style={{ color: C.accent }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: C.textPrimary }}>Expert Support</h3>
              <p style={{ color: C.textSecondary }}>Professional pharmacists available for consultation</p>
            </div>
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <NewArrivals />

      {/* UPLOAD SECTION */}
      <UploadPrescriptionSection onOpen={() => navigate("/customer/prescription")} />

      {/* BEST SELLING */}
      <BestSelling />

      {/* QUICK ACCESS SECTION */}
      <section className="py-10 px-4 md:py-16 md:px-6" style={{ background: C.surface }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4" style={{ color: C.textPrimary, fontFamily: FONT.display }}>
              Quick Access
            </h2>
            <p className="text-base md:text-lg" style={{ color: C.textSecondary }}>
              Everything you need is just a click away
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => navigate('/customer/products')}
              className="p-6 rounded-2xl text-center transition hover:scale-105"
              style={{ background: C.accentLight, border: `1px solid ${C.accentMid}` }}
            >
              <ShoppingBag size={48} className="mx-auto mb-4" style={{ color: C.accent }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: C.textPrimary }}>Shop Products</h3>
              <p style={{ color: C.textSecondary }}>Browse our complete catalog</p>
            </button>

            <button
              onClick={() => navigate('/customer/brands')}
              className="p-6 rounded-2xl text-center transition hover:scale-105"
              style={{ background: C.accentLight, border: `1px solid ${C.accentMid}` }}
            >
              <Star size={48} className="mx-auto mb-4" style={{ color: C.accent }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: C.textPrimary }}>Explore Brands</h3>
              <p style={{ color: C.textSecondary }}>Discover trusted manufacturers</p>
            </button>

            <button
              onClick={() => navigate('/customer/orders')}
              className="p-6 rounded-2xl text-center transition hover:scale-105"
              style={{ background: C.accentLight, border: `1px solid ${C.accentMid}` }}
            >
              <Heart size={48} className="mx-auto mb-4" style={{ color: C.accent }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: C.textPrimary }}>My Orders</h3>
              <p style={{ color: C.textSecondary }}>Track your purchases</p>
            </button>

            <button
              onClick={() => navigate('/customer/prescription')}
              className="p-6 rounded-2xl text-center transition hover:scale-105"
              style={{ background: C.accentLight, border: `1px solid ${C.accentMid}` }}
            >
              <Star size={48} className="mx-auto mb-4" style={{ color: C.accent }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: C.textPrimary }}>Upload Rx</h3>
              <p style={{ color: C.textSecondary }}>Get medication delivered</p>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}