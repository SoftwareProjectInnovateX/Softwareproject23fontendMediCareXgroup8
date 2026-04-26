import { C, FONT } from "./profileTheme";

export default function PageBanner({ title, subtitle, children, paddingBottom = "pb-12" }) {
  return (
    <div
      className={`px-6 pt-14 ${paddingBottom} text-center`}
      style={{ background: C.bannerGradient }}
    >
      <h1
        className="text-[38px] font-bold text-white mb-3"
       
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="text-[15px] max-w-[520px] mx-auto mb-7"
          style={{ color: C.bannerSubtitle }}
        >
          {subtitle}
        </p>
      )}
      {children && (
        <div className="flex gap-3 justify-center flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
}