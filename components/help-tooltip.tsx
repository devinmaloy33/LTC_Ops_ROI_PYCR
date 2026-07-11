'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  title?: string;
}

export default function HelpTooltip({ content, title = "Calculation Methodology" }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative inline-block ml-2 align-middle select-none shrink-0"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-paycor-grey hover:text-paycor-orange p-1 rounded-full hover:bg-slate-100 transition focus:outline-none"
        aria-label={`Learn more about ${title}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute z-[999] bottom-full left-[-20px] sm:left-1/2 sm:-translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 bg-paycor-charcoal text-white text-[11px] leading-relaxed rounded-xl shadow-xl border border-slate-700/50">
          <div className="flex items-center justify-between font-bold border-b border-slate-700 pb-1.5 mb-1.5 text-paycor-orange">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider">{title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
              aria-label="Close details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-200 font-normal normal-case leading-normal">{content}</p>
          <div className="absolute top-full left-[28px] sm:left-1/2 sm:-translate-x-1/2 border-[6px] border-transparent border-t-paycor-charcoal" />
        </div>
      )}
    </div>
  );
}
