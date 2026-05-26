"use client";
import React, { useState, useRef, useEffect } from "react";
import { glossaryTerms } from "@/lib/glossary";

interface GlossaryTermProps {
  termKey: keyof typeof glossaryTerms;
  children?: React.ReactNode;
}

export function GlossaryTerm({ termKey, children }: GlossaryTermProps) {
  const [isVisible, setIsVisible] = useState(false);
  const termData = glossaryTerms[termKey];
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!termData) {
    return <>{children}</>;
  }

  const { term, definition } = termData;

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <span 
      className="relative inline-flex items-center gap-1 cursor-help group"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          toggle(e);
        }
      }}
      ref={tooltipRef}
      tabIndex={0}
      aria-label={`${term}: ${definition}`}
    >
      {children || <span>{term}</span>}
      <svg className="w-4 h-4 text-brown-light/70 hover:text-brown-light transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      
      {isVisible && (
        <div 
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-64 p-3 bg-brown-dark text-sand-light text-sm rounded-lg shadow-lg"
          role="tooltip"
        >
          <div className="font-semibold mb-1 text-white">{term}</div>
          <div className="font-normal opacity-90 text-white">{definition}</div>
          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 border-solid border-t-brown-dark border-t-8 border-x-transparent border-x-8 border-b-0"></div>
        </div>
      )}
    </span>
  );
}
