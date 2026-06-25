import { useLocation, useNavigate } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import React, { memo } from "react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  path?: string;
  onClick?: () => void;
}

interface BottomNavProps {
  items: NavItem[];
}

const BottomNav = ({ items }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {items.map((item, idx) => {
          const isActive = item.path ? location.pathname === (item.path.split("?")[0]) : false;
          
          if (item.label === "Donate") {
            return (
              <button
                key={item.label + idx}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else if (item.path) navigate(item.path);
                }}
                className="relative flex flex-col items-center justify-center w-16 h-12 z-20"
              >
                <div className="w-14 h-14 rounded-full flex-shrink-0 aspect-square bg-[#10b981] flex items-center justify-center text-white shadow-lg border-4 border-background hover:scale-105 active:scale-95 transition-all duration-200 -translate-y-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white">
                    {/* Corner viewfinder brackets */}
                    <path d="M4 8V5a1 1 0 0 1 1-1h3" />
                    <path d="M16 4h3a1 1 0 0 1 1 1v3" />
                    <path d="M4 16v3a1 1 0 0 0 1 1h3" />
                    <path d="M16 20h3a1 1 0 0 0 1-1v-3" />
                    
                    {/* Highlighted food box / scan bars inside */}
                    <rect x="7" y="8" width="10" height="2" rx="0.5" fill="currentColor" stroke="none" />
                    <rect x="5.5" y="11" width="13" height="2" rx="0.5" fill="currentColor" stroke="none" />
                    <rect x="8" y="14" width="8" height="2" rx="0.5" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.label + idx}
              onClick={() => {
                if (item.onClick) item.onClick();
                else if (item.path) navigate(item.path);
              }}
              className={isActive ? "nav-item-active" : "nav-item"}
            >
              <item.icon size={22} className={isActive ? "text-primary" : "text-muted-foreground"} />
              <span className={`text-[10px] font-medium ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default memo(BottomNav);
