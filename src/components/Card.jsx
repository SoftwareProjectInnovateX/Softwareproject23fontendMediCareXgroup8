export default function Card({ title, value }) {
  return (
    <div className="relative bg-white px-6 py-5 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.1)] min-h-[100px] flex flex-col justify-center">
      
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-700 rounded-l-xl" />
      
      <h3 className="text-2xl font-bold text-gray-900">
        {value}
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        {title}
      </p>
    </div>
  );
}