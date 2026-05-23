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
