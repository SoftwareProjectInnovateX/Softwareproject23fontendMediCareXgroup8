import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar } from 'lucide-react';
import { C, FONT } from '../../components/profile/profileTheme';

const BlogCard = ({ id, title, excerpt, imageUrl, fallbackImageUrl, category = "Health Insight", date = "Just now", readTime = "5 min read" }) => {
  const navigate = useNavigate();
  const medicalFallbackImage = fallbackImageUrl || `https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80`;
  const [imgSrc, setImgSrc] = useState(imageUrl || medicalFallbackImage);

  // Generate a consistent pseudo-random tag color based on title length
  const tagColors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600'];
  const colorIndex = title ? title.length % tagColors.length : 0;
  const tagColorClass = tagColors[colorIndex];

  return (
    <div className="rounded-[20px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden flex flex-col h-full min-h-[400px] group font-inter" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {/* Image Container */}
      <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => navigate(`/customer/blog/${id}`)}>
        <img 
          src={imgSrc} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => { e.target.onerror = null; setImgSrc(medicalFallbackImage); }} 
        />
        <div className="absolute top-4 left-4">
          <span className={`${tagColorClass}/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg transition-colors`}>
            {category}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow">
        
        {/* Meta info (Date & Read Time) */}
        <div className="flex items-center text-[11px] font-medium mb-3 space-x-4 uppercase tracking-wider" style={{ color: C.textMuted }}>
          <div className="flex items-center">
            <Calendar size={12} className="mr-1.5" />
            {date}
          </div>
          <div className="flex items-center">
            <Clock size={12} className="mr-1.5" />
            {readTime}
          </div>
        </div>

        <h3 
          className="text-xl font-bold mb-3 line-clamp-2 leading-tight transition-colors cursor-pointer"
          style={{ color: C.textPrimary, fontFamily: FONT.display }}
          onClick={() => navigate(`/customer/blog/${id}`)}
        >
          {title}
        </h3>
        
        <div className="text-base mb-6 flex-grow overflow-hidden leading-relaxed" style={{ color: C.textSecondary, fontFamily: FONT.body }}>
          <div className="line-clamp-4">
            {excerpt 
              ? excerpt
                  .replace(/^#+\s+.*/gm, '') 
                  .replace(/Title:.*/gi, '') 
                  .replace(title, '')
                  .replace(/={3,}/g, '')
                  .replace(/-{3,}/g, '')
                  .replace(/[*_~`>]/g, '')   
                  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') 
                  .replace(/\n+/g, ' ')
                  .trim()
              : ''}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <button 
            onClick={() => navigate(`/customer/blog/${id}`)}
            className="flex items-center font-bold text-sm group/btn transition-all"
            style={{ color: C.accent }}
          >
            Read Full Article 
            <span className="ml-2 group-hover/btn:translate-x-2 transition-transform">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogCard;
