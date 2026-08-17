import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowLeft, RefreshCw, Loader2, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getPendingBlog, approveBlog, rejectAndRegenerateBlog, generateTestBlog } from '../../services/pharmacistService';

const PharmacistBlogApproval = () => {
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPendingBlog();
  }, []);

  useEffect(() => {
    if (blog) {
      setIsImageLoaded(false);
      setMinTimePassed(false);
      const timer = setTimeout(() => {
        setMinTimePassed(true);
      }, 4000); // 4 seconds minimum loading time for demo
      return () => clearTimeout(timer);
    }
  }, [blog]);

  const showImageLoader = !isImageLoaded || !minTimePassed;

  const fetchPendingBlog = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPendingBlog();
      setBlog(data);
    } catch (err) {
      console.error(err);
      setError(`Failed to fetch pending blog: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTest = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      await generateTestBlog();
      await fetchPendingBlog();
    } catch (err) {
      console.error(err);
      setError("Failed to generate test blog.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    try {
      await approveBlog(blog.id);
      setBlog(null);
      navigate('/pharmacist/notifications', { state: { success: 'Blog approved successfully.' } });
    } catch (err) {
      console.error(err);
      setError("Failed to approve blog.");
    }
  };

  const handleReject = async () => {
    try {
      setIsGenerating(true);
      await rejectAndRegenerateBlog(blog.id);
      await fetchPendingBlog(); // Fetch the newly generated blog
    } catch (err) {
      console.error(err);
      setError("Failed to reject and regenerate blog.");
    } finally {
      setIsGenerating(false);
    }
  };

  const cleanMarkdownContent = (content, title) => {
    if (!content) return '';
    let cleaned = content.replace(/^#\s+[^\n]+\n+/, '');
    if (title) {
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactTitleRegex = new RegExp(`^\\s*\\*?\\*?\${escapedTitle}\\*?\\*?\\s*\\n+`, 'i');
      cleaned = cleaned.replace(exactTitleRegex, '');
    }
    cleaned = cleaned.replace(/(\*?\*?Disclaimer:?[\\s\\S]*)/i, '');
    cleaned = cleaned.replace(/(\*?\*?Image\\s?Prompt:?[\\s\\S]*)/i, '');
    return cleaned.trim();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 relative overflow-hidden">
      {/* Loading Overlay when generating new article */}
      {isGenerating && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
             <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Generating New Article...</h3>
             <p className="text-sm text-slate-500 font-medium">Please wait while the AI writes and prepares a fresh health bulletin. This usually takes 10-15 seconds.</p>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="w-full">
        <div className="w-full">
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-brand transition-colors shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-800">Review Article</h1>
              <p className="text-slate-500 font-medium mt-1">Review and approve AI-generated health articles before publishing.</p>
            </div>
          </div>

          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-20">
               <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
               <p className="text-slate-500 font-medium">Checking for pending articles...</p>
             </div>
          ) : error ? (
             <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
               <Info className="w-6 h-6 flex-shrink-0 mt-0.5" />
               <div>
                  <h3 className="font-bold mb-1">Error</h3>
                  <p className="text-sm">{error}</p>
               </div>
             </div>
          ) : !blog ? (
             <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                  <CheckCircle className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-bold text-slate-800 mb-2">All caught up!</h3>
               <p className="text-slate-500 max-w-sm mx-auto mb-6">There are no pending articles waiting for your approval right now.</p>
               <button 
                 onClick={handleGenerateTest}
                 className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm shadow-blue-600/20"
               >
                 <RefreshCw size={18} /> Generate Tomorrow's Blog Now
               </button>
             </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
               {/* Action Bar (Top) */}
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-slate-50/90">
                  <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pending Review
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                        onClick={handleReject}
                        className="px-5 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
                     >
                        <XCircle size={18} /> Reject & Regenerate
                     </button>
                     <button 
                        onClick={handleApprove}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm shadow-blue-600/20"
                     >
                        <CheckCircle size={18} /> Approve (Publishes at Midnight)
                     </button>
                  </div>
               </div>

               {/* Blog Preview Content */}
               <div className="p-8 md:p-12">
                  <div className="mb-10 text-center md:text-left">
                     <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
                        {blog.title.replace(/\*\*/g, '')}
                     </h2>
                     <div className="flex items-center gap-3 justify-center md:justify-start text-sm font-medium text-slate-500">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">{blog.topic}</span>
                        <span>Generated: {new Date(blog.createdAt).toLocaleString()}</span>
                     </div>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden mb-12 w-full h-[250px] md:h-[400px] bg-slate-100 border border-slate-200 shadow-inner flex items-center justify-center">
                     {showImageLoader && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 text-slate-400">
                           <Loader2 className="w-8 h-8 animate-spin mb-3" />
                           <span className="font-bold text-sm tracking-wide animate-pulse">Please wait, generating AI image...</span>
                        </div>
                     )}
                     <img 
                       src={blog.imageUrl || blog.fallbackImageUrl} 
                       alt="Blog Cover" 
                       className={`w-full h-full object-cover transition-opacity duration-500 ${showImageLoader ? 'opacity-0' : 'opacity-100'}`}
                       onLoad={() => setIsImageLoaded(true)}
                       onError={(e) => { 
                         e.target.onerror = null; 
                         e.target.src = blog.fallbackImageUrl || `https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80`;
                         setIsImageLoaded(true);
                       }}
                     />
                  </div>

                  <div className="prose prose-lg max-w-none text-slate-700 prose-headings:text-slate-900 prose-headings:font-bold prose-a:text-blue-600">
                     <ReactMarkdown>{cleanMarkdownContent(blog.content, blog.title)}</ReactMarkdown>
                  </div>
               </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default PharmacistBlogApproval;
