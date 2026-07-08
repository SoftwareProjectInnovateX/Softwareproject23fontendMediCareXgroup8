import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../../components/HeroCarousel';
import NewArrivals from '../../components/NewArrivals';
import BestSelling from '../../components/BestSelling';
import UploadPrescriptionSection from '../../components/UploadPrescriptionSection';
import BlogCard from '../../components/blog/BlogCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { C, FONT } from '../../components/profile/profileTheme';

export default function HomePage() {
  const navigate = useNavigate();
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBlogIndex, setCurrentBlogIndex] = useState(0);

  const nextBlogs = () => {
    if (currentBlogIndex + 3 < blogPosts.length) {
      setCurrentBlogIndex(prev => prev + 1);
    }
  };

  const prevBlogs = () => {
    if (currentBlogIndex > 0) {
      setCurrentBlogIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/customer/blogs/latest`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        setBlogPosts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching blogs:", error.message);
        setBlogPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  return (
    <div className="w-full" style={{ background: C.bg }}>

      {/* HERO */}
      <HeroCarousel />

      {/* NEW ARRIVALS */}
      <NewArrivals />

      {/* UPLOAD SECTION */}
      <UploadPrescriptionSection onOpen={() => navigate("/customer/prescription")} />

      {/* BEST SELLING */}
      <BestSelling />

      {/* AI Generated Blogs Section - WHO Guidelines Compliant */}
      <section className="py-16 container mx-auto px-4 mt-10 rounded-t-3xl relative" style={{ background: C.surface }}>
        <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: FONT.display, color: C.textPrimary }}>
          Latest Health Insights
        </h2>
        
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-[20px] shadow-sm border overflow-hidden flex flex-col h-full min-h-[400px] animate-pulse" style={{ background: C.surface, borderColor: C.border }}>
                <div className="h-56" style={{ background: C.border }}></div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="space-y-2 mb-6">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 relative">
            
            {/* Left Navigation Arrow */}
            {!loading && blogPosts.length > 3 && (
              <button 
                onClick={prevBlogs} 
                disabled={currentBlogIndex === 0}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-12 h-12 rounded-full shadow-lg border border-gray-100 bg-white items-center justify-center text-gray-600 hover:text-brand hover:border-brand hover:scale-105 disabled:opacity-0 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:px-8">
              {blogPosts.length > 0 ? (
                blogPosts.slice(currentBlogIndex, currentBlogIndex + 3).map((blog, index) => (
                  <BlogCard 
                    key={`${blog.id}-${index}`}
                    id={blog.id}
                    title={blog.title ? blog.title.replace(/\*\*/g, '') : "MediCareX Health Tip"}
                    imageUrl={blog.imageUrl}
                    fallbackImageUrl={blog.fallbackImageUrl}
                    excerpt={blog.content}
                    date={blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : "Just now"} 
                  />
                ))
              ) : (
                <div className="col-span-3 text-center py-20 rounded-3xl border border-dashed" style={{ background: C.surface, borderColor: C.border }}>
                  <p className="italic" style={{ color: C.textMuted }}>No health insights found at the moment. Please check back later.</p>
                </div>
              )}
            </div>

            {/* Right Navigation Arrow */}
            {!loading && blogPosts.length > 3 && (
              <button 
                onClick={nextBlogs} 
                disabled={currentBlogIndex + 3 >= blogPosts.length}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-12 h-12 rounded-full shadow-lg border border-gray-100 bg-white items-center justify-center text-gray-600 hover:text-brand hover:border-brand hover:scale-105 disabled:opacity-0 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Mobile Navigation Arrows (Visible only on small screens) */}
            {!loading && blogPosts.length > 3 && (
              <div className="flex md:hidden justify-center space-x-6 mt-8">
                <button 
                  onClick={prevBlogs} 
                  disabled={currentBlogIndex === 0}
                  className="w-12 h-12 rounded-full shadow-md border border-gray-100 bg-white flex items-center justify-center text-gray-600 hover:text-brand disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={nextBlogs} 
                  disabled={currentBlogIndex + 3 >= blogPosts.length}
                  className="w-12 h-12 rounded-full shadow-md border border-gray-100 bg-white flex items-center justify-center text-gray-600 hover:text-brand disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}

            {/* Carousel Navigation Dots */}
            {!loading && blogPosts.length > 3 && (
              <div className="flex justify-center space-x-2 mt-8 md:mt-12">
                {Array.from({ length: Math.ceil(blogPosts.length / 3) }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBlogIndex(idx * 3)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      Math.floor(currentBlogIndex / 3) === idx 
                        ? 'bg-brand w-8' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mandatory Medical Disclaimer */}
        <div className="mt-16 text-center text-[10px] italic p-6 rounded-2xl border max-w-4xl mx-auto shadow-sm" style={{ background: C.surface, borderColor: C.border, color: C.textMuted }}>
          <p className="leading-relaxed">
            Disclaimer: This information is generated by AI based on public health guidelines and is for educational purposes only. 
            It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of 
            your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>
        </div>
      </section>

    </div>
  );
}