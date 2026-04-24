'use client';

import { useRef, useState, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { CATEGORIES } from '../../data/categories';
import { getCategoryIcon, C, FONT } from './categoryConfig';

const ALL_CATEGORIES = [{ id: 'all', name: 'All Products' }, ...CATEGORIES];

export default function FilterBar({ searchTerm, onSearch, selectedCategory, onCategory }) {
  const [open, setOpen] = useState(false);
  const dropdownRef     = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeName = ALL_CATEGORIES.find((c) => c.id === selectedCategory)?.name ?? 'All Products';
  const isFiltered = selectedCategory !== 'all';

  return (
    <div
      className="sticky top-[72px] z-40"
      style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(26,135,225,0.07)' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex gap-3 items-center flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} color={C.textMuted} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-[9px] rounded-xl text-[13px] outline-none box-border"
            style={{ border: `1px solid ${C.border}`, color: C.textPrimary, fontFamily: FONT.body, background: C.bg }}
          />
        </div>

        {/* Category Dropdown */}
        <div ref={dropdownRef} className="relative flex-shrink-0">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-3.5 py-[9px] rounded-xl text-[13px] font-semibold outline-none cursor-pointer min-w-[180px] transition-all duration-150"
            style={{
              border:     `1px solid ${isFiltered ? C.accent : C.border}`,
              color:      isFiltered ? C.accent : C.textSoft,
              fontFamily: FONT.body,
              background: isFiltered ? 'rgba(26,135,225,0.06)' : C.surface,
              boxShadow:  isFiltered ? '0 2px 8px rgba(26,135,225,0.12)' : 'none',
            }}
          >
            <span className="flex items-center gap-1.5 flex-1">
              {(() => { const Icon = getCategoryIcon(activeName); return <Icon size={14} color={isFiltered ? C.accent : C.textMuted} />; })()}
              {activeName}
            </span>
            <ChevronDown
              size={15}
              color={isFiltered ? C.accent : C.textMuted}
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            />
          </button>

          {open && (
            <div
              className="absolute top-[calc(100%+6px)] left-0 min-w-full z-[100] rounded-xl overflow-hidden"
              style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(15,42,94,0.13)' }}
            >
              {ALL_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { onCategory(cat.id); setOpen(false); }}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[13px] border-none cursor-pointer transition-colors duration-[120ms]"
                    style={{
                      fontWeight:   active ? 700 : 500,
                      fontFamily:   FONT.body,
                      color:        active ? C.accent : C.textPrimary,
                      background:   active ? 'rgba(26,135,225,0.07)' : 'transparent',
                      borderBottom: `1px solid ${C.border}`,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(26,135,225,0.04)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {(() => { const Icon = getCategoryIcon(cat.name); return <Icon size={14} color={active ? C.accent : C.textMuted} />; })()}
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}