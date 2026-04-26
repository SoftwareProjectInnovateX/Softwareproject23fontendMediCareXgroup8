import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BlogCard = ({ id, title, excerpt, imageUrl }) => {
  const navigate = useNavigate();
  const dynamicImage = `https://picsum.photos/seed/${id}/500/300`;
  const [imgSrc, setImgSrc] = useState(imageUrl || dynamicImage);

  return (
    <div className="bg-white rounded-[20px] shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 overflow-hidden flex flex-col h-[500px] group" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Image Container */}
      <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => navigate(`/customer/blog/${id}`)}>
        <img 
          src={imgSrc} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => { e.target.onerror = null; setImgSrc(dynamicImage); }} 
        />
        <div className="absolute top-4 left-4">
          <span className="bg-[#0066CC]/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
            Health Insight
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow bg-gradient-to-b from-white to-gray-50">
        <h3 
          className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 leading-tight group-hover:text-[#0066CC] transition-colors cursor-pointer"
          onClick={() => navigate(`/customer/blog/${id}`)}
          style={{ fontFamily: "'Raleway', sans-serif" }}
        >
          {title}
        </h3>
        
        <div className="text-gray-700 text-base mb-6 flex-grow overflow-hidden leading-relaxed" style={{ fontFamily: "'Literata', serif", lineHeight: "1.7" }}>
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

        <div className="flex items-center justify-between mt-auto">
          <button 
            onClick={() => navigate(`/customer/blog/${id}`)}
            className="flex items-center text-[#0066CC] font-bold text-sm group/btn hover:text-blue-800 transition-all"
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
