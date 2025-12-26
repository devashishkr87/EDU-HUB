
import React from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  userRole: UserRole | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, onLogout, activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.SCHOLAR, UserRole.REP] },
    { id: 'upload', label: 'Materials Archive', icon: '📂', roles: [UserRole.TEACHER, UserRole.SCHOLAR, UserRole.REP] },
    { id: 'study-plan', label: 'Study Roadmap', icon: '📅', roles: [UserRole.STUDENT] },
    { id: 'sensei', label: 'AI Assistant', icon: '🤖', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.SCHOLAR, UserRole.REP] },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden md:flex z-20">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">A</div>
            AcademiSync
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-2">Education Management</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4">
          {menuItems.filter(item => userRole && item.roles.includes(userRole)).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all font-semibold text-sm"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="md:hidden">
             <h1 className="text-lg font-bold text-slate-900">AcademiSync</h1>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">{userRole}</p>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-tight">Verified Session</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600 font-bold">
              {userRole?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
