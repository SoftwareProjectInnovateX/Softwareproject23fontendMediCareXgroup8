import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import BlogCard from '../../components/blog/BlogCard';
import { Heart, MessageCircle, Share2, Copy, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { FaFacebook, FaWhatsapp, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { C, FONT } from '../../components/profile/profileTheme';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prevBlog, setPrevBlog] = useState(null);
  const [nextBlog, setNextBlog] = useState(null);
  
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    if (blog) {
      setIsImageLoaded(false);
      setMinTimePassed(false);
      const timer = setTimeout(() => {
        setMinTimePassed(true);
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [blog]);

  const showImageLoader = !isImageLoaded || !minTimePassed;

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
        setLikes(data.likes || 0);

        // Fetch comments
        try {
          const commentsRes = await fetch(`http://localhost:5000/api/customer/blogs/${id}/comments`);
          if (commentsRes.ok) {
            const commentsData = await commentsRes.json();
            setComments(commentsData);
          }
        } catch(e) { console.error("Error fetching comments", e); }

        // Fetch related blogs
        const latestResponse = await fetch(`http://localhost:5000/api/customer/blogs/latest`);
        if (latestResponse.ok) {
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
            
            const currentIndex = latestData.findIndex(b => b.id === id);
            if (currentIndex !== -1) {
              // Next is newer (index - 1), Prev is older (index + 1)
              setNextBlog(currentIndex > 0 ? latestData[currentIndex - 1] : null);
              setPrevBlog(currentIndex < latestData.length - 1 ? latestData[currentIndex + 1] : null);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching blog details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${(totalScroll / windowHeight) * 100}`;
      setScrollProgress(scroll);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ensure scroll to top happens reliably when route changes or content loads
  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [id, loading]);

  if (loading) return <div className="text-center py-20 font-medium">Loading medical insight...</div>;
  if (!blog) return <div className="text-center py-20">Article not found.</div>;

  const handleLike = async () => {
    if (hasLiked) return;
    setHasLiked(true);
    setLikes(prev => prev + 1);
    try {
      await fetch(`http://localhost:5000/api/customer/blogs/${id}/like`, { method: 'POST' });
    } catch (error) {
      console.error("Error liking blog", error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    const userName = sessionStorage.getItem('userName') || 'Guest Reader';
    try {
      const res = await fetch(`http://localhost:5000/api/customer/blogs/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, text: newComment })
      });
      if (res.ok) {
        const addedComment = await res.json();
        setComments([addedComment, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error("Error adding comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  const shareUrl = window.location.href;
  const shareTitle = blog.title;

  // Clean up AI artifacts from the markdown
  const cleanMarkdownContent = (content, title) => {
    if (!content) return '';
    let cleaned = content;

    // Remove the first H1 if it exists (usually the duplicate title)
    cleaned = cleaned.replace(/^\s*#\s+[^\n]+\n+/, '');

    // Remove the exact title if it appears at the very beginning
    if (title) {
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactTitleRegex = new RegExp(`^\\s*\\*?\\*?${escapedTitle}\\*?\\*?\\s*\\n+`, 'i');
      cleaned = cleaned.replace(exactTitleRegex, '');
    }

    // Remove AI Disclaimer and everything after it
    cleaned = cleaned.replace(/(\*?\*?Disclaimer:?[\s\S]*)/i, '');

    // Remove Image Prompt and everything after it
    cleaned = cleaned.replace(/(\*?\*?Image\s?Prompt:?[\s\S]*)/i, '');

    return cleaned.trim();
  };

  const cleanedContent = cleanMarkdownContent(blog.content, blog.title);

  const rawTitle = (blog.title || '').replace(/\*\*/g, '');
  const titleParts = rawTitle.split(':');
  const hasKicker = titleParts.length > 1;
  const kickerText = hasKicker ? titleParts[0].trim() : '';
  const mainTitleText = hasKicker ? titleParts.slice(1).join(':').trim() : rawTitle;

  return (
    <div className="min-h-screen font-inter relative" style={{ background: C.bg, color: C.textPrimary }}>
      {/* Reading Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1.5 bg-brand z-50 transition-all duration-150 ease-out"
        style={{ width: `${scrollProgress}%` }}
      ></div>





      <article className="max-w-7xl mx-auto px-6 pb-24">
        <header className="mt-6 mb-16 max-w-4xl mx-auto text-center md:text-left">
          {hasKicker && (
            <div className="mb-6 flex flex-col items-center md:items-start justify-center md:justify-start">
               <div className="w-12 h-1 bg-brand mb-4 rounded-full opacity-80"></div>
               <span className="text-brand font-bold uppercase tracking-[0.2em] text-xs md:text-sm">
                 {kickerText}
               </span>
            </div>
          )}
          
          <h1 className="text-4xl md:text-5xl lg:text-[64px] font-extrabold leading-[1.1] mb-10 tracking-tight" style={{ color: C.textPrimary, fontFamily: FONT.display }}>
            {mainTitleText}
          </h1>

          {/* Unified Author & Interaction Row */}
          <div className="border-y py-4 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: C.border }}>
            
            {/* Author Info */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border" style={{ backgroundColor: C.surface, color: C.accent, borderColor: C.border }}>
                MX
              </div>
              <div className="text-left">
                <p className="font-bold text-sm" style={{ color: C.textPrimary }}>MediCareX Health Editorial</p>
                <p className="text-xs" style={{ color: C.textMuted }}>{new Date(blog.createdAt).toLocaleDateString()} • 4 min read</p>
              </div>
            </div>

            {/* Interaction Icons */}
            <div className="flex items-center space-x-4 md:space-x-6">
              <div className="flex items-center space-x-2 border-r pr-4 md:pr-6" style={{ borderColor: C.border }}>
                <button onClick={handleLike} className={`flex items-center space-x-1.5 font-medium transition-all ${hasLiked ? 'text-red-500' : 'hover:text-red-500'}`} style={{ color: hasLiked ? undefined : C.textMuted }}>
                  <Heart size={18} className={hasLiked ? "fill-current" : ""} /> <span className="text-sm">{likes}</span>
                </button>
                <button onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})} className="flex items-center space-x-1.5 font-medium transition-all cursor-pointer ml-3" style={{ color: C.textMuted }}>
                  <MessageCircle size={18} /> <span className="text-sm">{comments.length}</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-green-500 transition-colors"><FaWhatsapp size={18}/></a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors"><FaFacebook size={18}/></a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-500 transition-colors"><FaLinkedin size={18}/></a>
                <button onClick={copyLink} className="text-gray-400 hover:text-gray-600 transition-colors" title="Copy Link"><Copy size={16}/></button>
              </div>
            </div>
          </div>
        </header>

        {/*Hero Image */}
        <div className="relative rounded-[20px] overflow-hidden mb-12 md:mb-16 w-full h-[250px] md:h-[450px] shadow-lg border flex items-center justify-center" style={{ backgroundColor: C.surface, borderColor: C.border }}>
          {showImageLoader && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ backgroundColor: C.surface, color: C.textMuted }}>
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <span className="font-bold text-sm tracking-wide animate-pulse">Please wait for the image...</span>
             </div>
          )}
          <img 
            src={blog.imageUrl || blog.fallbackImageUrl || `https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80`} 
            className={`w-full h-full object-cover transition-opacity duration-500 ${showImageLoader ? 'opacity-0' : 'opacity-100'}`}
            alt={blog.title} 
            onLoad={() => setIsImageLoaded(true)}
            onError={(e) => { 
              e.target.onerror = null; 
              e.target.src = blog.fallbackImageUrl || `https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80`; 
              setIsImageLoaded(true);
            }}
          />
        </div>

        {/*Main Content (Markdown) */}
        <div className="prose prose-lg md:prose-xl max-w-3xl mx-auto prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6 prose-li:my-2 leading-relaxed" style={{ color: C.textSecondary, fontFamily: FONT.body }}>
          <ReactMarkdown>{cleanedContent}</ReactMarkdown>
        </div>

        {/*Medical Disclaimer */}
        <div className="mt-20 p-8 rounded-3xl border text-sm italic text-center max-w-4xl mx-auto" style={{ backgroundColor: C.surface, borderColor: C.border, color: C.textMuted }}>
          "This article follows WHO health guidelines. However, it should not replace professional medical consultation."
        </div>

        {/* Interaction Bar (Bottom) */}
        <div className="mt-16 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between border-y py-6 gap-6" style={{ borderColor: C.border }}>
          <div className="flex items-center space-x-6">
            <button 
              onClick={handleLike} 
              className={`flex items-center space-x-2 text-lg font-semibold transition-all px-4 py-2 rounded-full ${hasLiked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-500 hover:bg-gray-50'}`}
            >
              <Heart className={hasLiked ? "fill-current" : ""} /> <span>{likes}</span>
            </button>
            <div className="flex items-center space-x-2 text-lg font-semibold text-gray-500 px-4 py-2 rounded-full hover:bg-gray-50 transition-all cursor-pointer" onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})}>
              <MessageCircle /> <span>{comments.length}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mr-2">Share</span>
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all hover:shadow-md hover:-translate-y-0.5"><FaWhatsapp size={18}/></a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all hover:shadow-md hover:-translate-y-0.5"><FaFacebook size={18}/></a>
            <button onClick={copyLink} className="w-10 h-10 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-800 hover:text-white transition-all hover:shadow-md hover:-translate-y-0.5" title="Copy Link"><Copy size={16}/></button>
          </div>
        </div>

        {/* Previous & Next Article Navigation */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {prevBlog ? (
            <div 
              onClick={() => { window.scrollTo(0,0); navigate(`/customer/blog/${prevBlog.id}`); }}
              className="group cursor-pointer p-8 rounded-3xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-start text-left relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-transparent group-hover:bg-brand transition-colors"></div>
              <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 group-hover:text-brand transition-colors">
                <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Previous Article
              </div>
              <h4 className="text-lg font-bold text-gray-900 font-raleway group-hover:text-brand transition-colors line-clamp-2">{prevBlog.title}</h4>
            </div>
          ) : (
            <div></div> // Empty placeholder for grid layout
          )}

          {nextBlog ? (
            <div 
              onClick={() => { window.scrollTo(0,0); navigate(`/customer/blog/${nextBlog.id}`); }}
              className="group cursor-pointer p-8 rounded-3xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-end text-right relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-1.5 h-full bg-transparent group-hover:bg-brand transition-colors"></div>
              <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 group-hover:text-brand transition-colors">
                Next Article <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 font-raleway group-hover:text-brand transition-colors line-clamp-2">{nextBlog.title}</h4>
            </div>
          ) : (
            <div></div>
          )}
        </div>

        {/* Comments Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h3 className="text-3xl font-extrabold mb-8 tracking-tight" style={{ color: C.textPrimary, fontFamily: FONT.display }}>Join the Discussion</h3>
          
          <form onSubmit={handleAddComment} className="mb-12 p-2 rounded-[2rem] shadow-sm border focus-within:shadow-md transition-all" style={{ backgroundColor: C.surface, borderColor: C.border }}>
            <textarea 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts or ask a question..." 
              className="w-full bg-transparent border-none rounded-2xl p-6 focus:outline-none focus:ring-0 resize-none min-h-[140px] text-lg"
              style={{ color: C.textPrimary }}
              required
            ></textarea>
            <div className="flex justify-end p-2 pt-0">
              <button disabled={isSubmitting} type="submit" className="flex items-center space-x-2 bg-brand text-white px-8 py-3.5 rounded-full font-bold hover:bg-blue-700 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
              </button>
            </div>
          </form>

          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Be the first to comment on this article.</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border rounded-2xl p-6 shadow-sm" style={{ backgroundColor: C.surface, borderColor: C.border }}>
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase text-sm" style={{ backgroundColor: C.bg, color: C.textPrimary }}>
                      {comment.userName.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <p className="font-bold" style={{ color: C.textPrimary }}>{comment.userName}</p>
                      <p className="text-xs" style={{ color: C.textMuted }}>{new Date(comment.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <p style={{ color: C.textSecondary, fontFamily: FONT.body }}>{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
           <button onClick={() => navigate('/customer')} className="inline-block bg-brand text-white px-10 py-4 rounded-full font-bold hover:bg-blue-700 transition-all shadow-lg">
              Back to Home
           </button>
        </div>
      </article>

      {/* Related Blogs Section */}
      {relatedBlogs.length > 0 && (
        <section className="py-16 border-t mt-10" style={{ backgroundColor: C.bg, borderColor: C.border }}>
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: C.textPrimary, fontFamily: FONT.display }}>More Health Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {relatedBlogs.map((relatedBlog, index) => (
                <BlogCard 
                  key={`${relatedBlog.id}-${index}`}
                  id={relatedBlog.id}
                  title={relatedBlog.title ? relatedBlog.title.replace(/\*\*/g, '') : "MediCareX Health Tip"}
                  imageUrl={relatedBlog.imageUrl}
                  fallbackImageUrl={relatedBlog.fallbackImageUrl}
                  excerpt={relatedBlog.content}
                  date={relatedBlog.createdAt ? new Date(relatedBlog.createdAt).toLocaleDateString() : "Just now"}
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
