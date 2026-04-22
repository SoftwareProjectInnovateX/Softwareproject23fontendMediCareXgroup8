'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const C = {
  bg:         "#f1f5f9",
  surface:    "#ffffff",
  border:     "rgba(26,135,225,0.18)",
  accent:     "#1a87e1",
  accentDark: "#0f2a5e",
  textPrimary:"#1e293b",
  textMuted:  "#64748b",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      title: "MediCareX - Smart Pharmacy",
      description: "Safe, easy and reliable medicine delivery system.",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
      gradient: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)"
    },
    {
      title: "Care You Can Trust",
      description: "High-quality medicines for your family.",
      image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800",
      gradient: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)"
    },
  ];

  const prev = () => setCurrentSlide((p) => (p - 1 + heroSlides.length) % heroSlides.length);
  const next = () => setCurrentSlide((p) => (p + 1) % heroSlides.length);

  return (
    <section style={{ background: C.bg, fontFamily: FONT.body }}>
      <div>

        <div className="relative h-[520px] overflow-hidden">

          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className="absolute inset-0 transition-opacity duration-500 ease-in-out"
              style={{
                opacity: currentSlide === index ? 1 : 0,
                pointerEvents: currentSlide === index ? "auto" : "none",
              }}
            >
              <div
                className="h-full flex items-center px-14 gap-10"
                style={{ background: slide.gradient }}
              >

                {/* Text side */}
                <div className="flex flex-col gap-3" style={{ flex: "0 0 34%" }}>

                  {/* Label */}
                  <span
                    className="self-start text-[10px] font-bold uppercase tracking-[0.12em] rounded-full px-3 py-0.5"
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    Smart Pharmacy
                  </span>

                  <h1
                    className="text-2xl font-bold text-white m-0 leading-[1.25]"
                    style={{ fontFamily: FONT.display }}
                  >
                    {slide.title}
                  </h1>

                  {/* Underline accent */}
                  <div
                    className="w-12 h-[3px] rounded-[4px]"
                    style={{ background: "rgba(255,255,255,0.45)" }}
                  />

                  <p
                    className="text-[12.5px] m-0 leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.78)" }}
                  >
                    {slide.description}
                  </p>

                </div>

                {/* Image side */}
                <div className="flex justify-center items-center" style={{ flex: "0 0 62%" }}>
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-[460px] object-cover rounded-2xl"
                    style={{
                      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                      border: "2px solid rgba(255,255,255,0.15)",
                    }}
                  />
                </div>

              </div>
            </div>
          ))}

          {/* Prev button */}
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-full flex items-center justify-center cursor-pointer transition-[background,box-shadow] duration-150"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)"; }}
          >
            <ChevronLeft size={20} color={C.accentDark} />
          </button>

          {/* Next button */}
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-full flex items-center justify-center cursor-pointer transition-[background,box-shadow] duration-150"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)"; }}
          >
            <ChevronRight size={20} color={C.accentDark} />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-[18px] left-1/2 -translate-x-1/2 flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className="h-2 rounded-[4px] border-none cursor-pointer p-0 transition-[width,background] duration-[250ms]"
                style={{
                  width: currentSlide === i ? 24 : 8,
                  background: currentSlide === i ? "#ffffff" : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}