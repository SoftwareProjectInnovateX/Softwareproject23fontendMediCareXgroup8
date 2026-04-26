import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import BlogCard from '../../components/blog/BlogCard';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/customer/blogs/${id}`);
        if (!response.ok) {
          setBlog(null);
          setLoading(false);
          return;
        }
        const data = await response.json();
        setBlog(data);

        // Fetch related blogs
        const latestResponse = await fetch(`http://localhost:5000/api/customer/blogs/latest`);
        const latestData = await latestResponse.json();
        
        if (Array.isArray(latestData)) {
            let filtered = latestData.filter(b => b.id !== id);
            if (filtered.length === 0) filtered = [...latestData]; 

            // Randomly shuffle the remaining blogs
            const shuffled = filtered.sort(() => 0.5 - Math.random());

            let displayData = [...shuffled];
            if (displayData.length > 0 && displayData.length < 3) {
              while (displayData.length < 3) {
                displayData = [...displayData, ...shuffled];
              }
            }
            setRelatedBlogs(displayData.slice(0, 3));
        }
      } catch (error) {
        console.error("Error fetching blog detail:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Ensure scroll to top happens reliably when route changes or content loads
  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [id, loading]);

  if (loading) return <div className="text-center py-20 font-medium">Loading medical insight...</div>;
  if (!blog) return <div className="text-center py-20">Article not found.</div>;

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/*Navigation Bar / Breadcrumbs */}
      <nav className="max-w-7xl mx-auto px-6 py-10 flex items-center text-sm text-gray-400">
        <button onClick={() => navigate('/customer')} className="hover:text-[#0066CC] transition-colors font-medium">Home</button>
        <span className="mx-3 opacity-30">/</span>
        <span className="text-gray-900 font-semibold truncate">{(blog.title || '').replace(/\*\*/g, '')}</span>
      </nav>

      <article className="max-w-7xl mx-auto px-6 pb-24">
        {/*Header Information */}
        <header className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
             <span className="w-8 h-[2px] bg-[#0066CC]"></span>
             <span className="text-[#0066CC] font-bold text-xs uppercase tracking-[0.2em]">MediCareX Wellness</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-8 tracking-tight" style={{ fontFamily: "'Raleway', sans-serif" }}>
            {(blog.title || '').replace(/\*\*/g, '')}
          </h1>

          <div className="flex items-center space-x-4 border-y border-gray-100 py-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0066CC] font-bold text-xs">MX</div>
            <div className="text-sm">
              <p className="font-bold text-gray-900">MediCareX Health Editorial</p>
              <p className="text-gray-500 font-medium">{new Date(blog.createdAt).toLocaleDateString()} • 4 min read</p>
            </div>
          </div>
        </header>

        {/*Hero Image */}
        <div className="rounded-[20px] overflow-hidden mb-12 md:mb-16 shadow-lg h-[300px] md:h-[450px] lg:h-[600px] bg-gray-50 flex items-center justify-center">
          <img 
            src={blog.imageUrl || `https://picsum.photos/seed/${blog.id}/800/450`} 
            className="w-full h-full object-cover" 
            alt={blog.title} 
            onError={(e) => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${blog.id}/800/450`; }}
          />
        </div>

        {/*Main Content (Markdown) */}
        <div 
          className="prose prose-lg md:prose-xl lg:prose-2xl max-w-none text-gray-800 prose-headings:text-gray-900 prose-headings:font-bold prose-a:text-[#0066CC] leading-relaxed"
          style={{ fontFamily: "'Literata', serif" }}
        >
          <style>{`
            .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
              font-family: 'Raleway', sans-serif;
            }
            .prose p {
              line-height: 1.8;
            }
          `}</style>
          <ReactMarkdown>{blog.content || ''}</ReactMarkdown>
        </div>

        {/*Medical Disclaimer */}
        <div className="mt-20 p-8 bg-gray-50 rounded-3xl border border-gray-100 text-sm text-gray-500 italic text-center">
          "This article follows WHO health guidelines. However, it should not replace professional medical consultation."
        </div>

        <div className="mt-12 text-center">
           <button onClick={() => navigate('/customer')} className="inline-block bg-[#0066CC] text-white px-10 py-4 rounded-full font-bold hover:bg-blue-700 transition-all shadow-lg">
              Back to Home
           </button>
        </div>
      </article>

      {/* Related Blogs Section */}
      {relatedBlogs.length > 0 && (
        <section className="bg-gray-50 py-16 border-t border-gray-100 mt-10">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">More Health Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {relatedBlogs.map((relatedBlog, index) => (
                <BlogCard 
                  key={`${relatedBlog.id}-${index}`}
                  id={relatedBlog.id}
                  title={relatedBlog.title ? relatedBlog.title.replace(/\*\*/g, '') : "MediCareX Health Tip"}
                  imageUrl={relatedBlog.imageUrl}
                  excerpt={relatedBlog.content} 
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default BlogDetail;
