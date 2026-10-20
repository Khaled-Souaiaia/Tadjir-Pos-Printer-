import React from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  Users,
  ReceiptText,
  BarChart3,
  Settings,
  Lock,
  Info,
} from 'lucide-react';

export type TabType =
  | 'pos'
  | 'dashboard'
  | 'products'
  | 'clients'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'about';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t, isAdmin } = useApp();

  const navItems = [
    {
      id: 'pos' as TabType,
      label: t.navPos,
      icon: <ShoppingCart className="w-5 h-5" />,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'dashboard' as TabType,
      label: t.navDashboard,
      icon: <LayoutDashboard className="w-5 h-5" />,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'products' as TabType,
      label: t.navProducts,
      icon: <Package className="w-5 h-5" />,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'clients' as TabType,
      label: t.navCustomersSuppliers,
      icon: <Users className="w-5 h-5" />,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'expenses' as TabType,
      label: t.navExpenses,
      icon: <ReceiptText className="w-5 h-5" />,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'reports' as TabType,
      label: t.navReports,
      icon: <BarChart3 className="w-5 h-5" />,
      badge: !isAdmin ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : null,
      adminOnly: true,
    },
    {
      id: 'settings' as TabType,
      label: t.navSettings,
      icon: <Settings className="w-5 h-5" />,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'about' as TabType,
      label: t.navAbout,
      icon: <Info className="w-5 h-5" />,
      badge: null,
      adminOnly: false,
    },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2 p-3 neu-flat rounded-2xl h-fit">
      <div className="px-3 py-2 text-xs font-bold text-slate-400 tracking-wider text-center ml-0">
        TADJIR-DZ
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isLocked = item.adminOnly && !isAdmin;

          return (
            <button
              key={item.id}
              disabled={isLocked}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 select-none ${
                isLocked
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : isActive
                  ? 'neu-pressed text-blue-600 bg-white/70 shadow-inner'
                  : 'neu-raised text-slate-700 hover:text-blue-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
