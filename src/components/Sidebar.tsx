import { useState, useEffect, useRef } from 'react';
import { ChevronDown, LogOut, User, Shield, Home, Activity, CheckCircle, StickyNote } from 'lucide-react';
import { sections } from '../config/modules';
import { Module } from '../types/modules';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeModule: string | null;
  showAdminPanel: boolean;
  showActionTracking: boolean;
  showNotepad: boolean;
  onModuleSelect: (module: Module) => void;
  onAdminPanelSelect: () => void;
  onHomeSelect: () => void;
  onActionTrackingSelect: () => void;
  onNotepadSelect: () => void;
  isLocked?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ activeModule, showAdminPanel, showActionTracking, showNotepad, onModuleSelect, onAdminPanelSelect, onHomeSelect, onActionTrackingSelect, onNotepadSelect, isLocked = false, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, role, signOut, loading } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null);
  const [popover, setPopover] = useState<{ sectionId: string; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isQualityManager = role === 'quality_manager';
  const isManager = isAdmin || isQualityManager;
  const canAccessNotes = user?.email === 'toztoprakbaraka@gmail.com' || user?.email === 'oosmanozturk06@gmail.com';

  useEffect(() => {
    if (!loading && user && !role) {
      console.warn('User is authenticated but role is null');
    }
  }, [role, isAdmin, isManager, user, loading]);

  useEffect(() => {
    if (activeModule) {
      const parentSection = sections.find(section =>
        section.modules.some(module => module.id === activeModule)
      );
      if (parentSection) {
        setExpandedSection(parentSection.id);
      }
    }
  }, [activeModule]);

  useEffect(() => {
    if (collapsed) {
      setExpandedSection(null);
      setTooltip(null);
    } else {
      setPopover(null);
    }
  }, [collapsed]);

  const openPopover = (sectionId: string, y: number) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setTooltip(null);
    setPopover({ sectionId, y });
  };

  const scheduleClosePopover = () => {
    closeTimerRef.current = setTimeout(() => setPopover(null), 120);
  };

  const cancelClosePopover = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const toggleSection = (sectionId: string) => {
    if (collapsed) return;
    setExpandedSection((prev) => prev === sectionId ? null : sectionId);
  };

  const handleSignOut = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      setShowLogoutToast(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setShowLogoutToast(true);
      setTimeout(() => { window.location.href = '/'; }, 500);
    }
  };

  const getRoleLabel = (role: string | null) => {
    const labels: Record<string, string> = {
      admin: 'Yönetici',
      quality_manager: 'Kalite Müdürü',
      personnel: 'Personel',
    };
    return role ? labels[role] || role : '';
  };

  const showTooltip = (label: string, e: React.MouseEvent) => {
    if (!collapsed) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ label, y: rect.top + rect.height / 2 });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <>
      <div className={`relative bg-gradient-to-b from-slate-800 to-slate-900 text-white h-screen overflow-y-auto shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Header */}
        <div className={`p-4 border-b border-slate-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                my17025
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Laboratuvar Bilgi Yönetim Sistemi</p>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
              m
            </div>
          )}
        </div>

        <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
          {/* Notepad */}
          {!loading && canAccessNotes && (
            <button
              onClick={onNotepadSelect}
              onMouseEnter={(e) => showTooltip('Notlarım', e)}
              onMouseLeave={hideTooltip}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 ${
                showNotepad
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 shadow-lg'
                  : 'hover:bg-slate-700/50'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <StickyNote className={`w-4 h-4 flex-shrink-0 ${showNotepad ? 'text-white' : 'text-amber-400'}`} />
              {!collapsed && (
                <span className={`text-[11px] font-semibold ${showNotepad ? 'text-white' : 'text-slate-300'}`}>
                  Notlarım
                </span>
              )}
            </button>
          )}

          {/* Action Tracking */}
          <button
            onClick={onActionTrackingSelect}
            onMouseEnter={(e) => showTooltip('Aksiyon Takip', e)}
            onMouseLeave={hideTooltip}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 ${
              showActionTracking
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg'
                : 'hover:bg-slate-700/50'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <Activity className={`w-4 h-4 flex-shrink-0 ${showActionTracking ? 'text-white' : 'text-orange-400'}`} />
            {!collapsed && (
              <span className={`text-[11px] font-semibold ${showActionTracking ? 'text-white' : 'text-slate-300'}`}>
                Aksiyon Takip
              </span>
            )}
          </button>

          {/* Admin Panel */}
          {!loading && (isAdmin || isQualityManager) && (
            <button
              onClick={onAdminPanelSelect}
              onMouseEnter={(e) => showTooltip('Yönetici Paneli', e)}
              onMouseLeave={hideTooltip}
              disabled={isLocked}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 ${
                showAdminPanel
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 shadow-lg'
                  : 'hover:bg-slate-700/50'
              } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''} ${collapsed ? 'justify-center' : ''}`}
            >
              <Shield className={`w-4 h-4 flex-shrink-0 ${showAdminPanel ? 'text-white' : 'text-blue-400'}`} />
              {!collapsed && (
                <span className={`text-[11px] font-semibold ${showAdminPanel ? 'text-white' : 'text-slate-300'}`}>
                  Yönetici Paneli
                </span>
              )}
            </button>
          )}

          {/* Sections */}
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSection === section.id;
            const hasActiveChild = section.modules.some(m => m.id === activeModule);

            return (
              <div key={section.id} className={`mb-0.5 ${isLocked ? 'opacity-40 pointer-events-none' : ''}`}>
                <button
                  onClick={() => { if (!collapsed) toggleSection(section.id); }}
                  onMouseEnter={(e) => {
                    if (!collapsed) return;
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    openPopover(section.id, rect.top);
                  }}
                  onMouseLeave={() => { if (collapsed) scheduleClosePopover(); }}
                  disabled={isLocked}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-all duration-200 text-left ${collapsed ? 'justify-center' : ''} ${hasActiveChild && collapsed ? 'bg-slate-700/40' : ''} ${popover?.sectionId === section.id ? 'bg-slate-700/60' : ''}`}
                >
                  <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <SectionIcon className={`w-4 h-4 flex-shrink-0 ${section.color} ${isExpanded ? 'scale-110' : ''} transition-transform duration-200`} />
                    {!collapsed && <span className="font-semibold text-[11px]">{section.name}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>

                {!collapsed && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-[1000px] opacity-100 mt-0.5' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-4 space-y-0.5">
                      {section.modules.map((module) => {
                        const ModuleIcon = module.icon;
                        const isActive = activeModule === module.id;

                        return (
                          <button
                            key={module.id}
                            onClick={() => onModuleSelect(module)}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-left ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg scale-[1.02]'
                                : 'hover:bg-slate-700/30 hover:translate-x-0.5'
                            }`}
                          >
                            <ModuleIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : section.color}`} />
                            <span className={`text-[11px] ${isActive ? 'font-medium' : ''}`}>
                              {module.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Home */}
          <button
            onClick={onHomeSelect}
            onMouseEnter={(e) => showTooltip('Ana Sayfa', e)}
            onMouseLeave={hideTooltip}
            disabled={isLocked}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mt-2 ${
              !activeModule && !showAdminPanel && !showActionTracking && !showNotepad
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg'
                : 'hover:bg-slate-700/50'
            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''} ${collapsed ? 'justify-center' : ''}`}
          >
            <Home className={`w-4 h-4 flex-shrink-0 ${!activeModule && !showAdminPanel && !showActionTracking && !showNotepad ? 'text-white' : 'text-blue-400'}`} />
            {!collapsed && (
              <span className={`text-[11px] font-semibold ${!activeModule && !showAdminPanel && !showActionTracking && !showNotepad ? 'text-white' : 'text-slate-300'}`}>
                Ana Sayfa
              </span>
            )}
          </button>
        </nav>

        {/* User + Logout */}
        <div className={`p-3 border-t border-slate-700 mt-auto ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 px-2">
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white font-medium truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-400">{getRoleLabel(role)}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mb-1"
              onMouseEnter={(e) => showTooltip(user?.email || '', e)}
              onMouseLeave={hideTooltip}
            >
              <User className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <button
            onClick={handleSignOut}
            onMouseEnter={(e) => showTooltip('Çıkış Yap', e)}
            onMouseLeave={hideTooltip}
            className={`flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-[11px] font-medium ${collapsed ? 'w-8 h-8 p-0' : 'w-full px-4 py-2'}`}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            {!collapsed && 'Çıkış Yap'}
          </button>
        </div>

        {showLogoutToast && (
          <div className="fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl bg-green-600 text-white flex items-center gap-3 animate-slide-in">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Başarıyla çıkış yapıldı</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: tooltip.y - 14, left: 72 }}
        >
          <div className="bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap">
            {tooltip.label}
          </div>
        </div>
      )}

      {/* Collapsed section popover */}
      {popover && (() => {
        const section = sections.find(s => s.id === popover.sectionId);
        if (!section) return null;
        const SectionIcon = section.icon;
        return (
          <div
            ref={popoverRef}
            onMouseEnter={cancelClosePopover}
            onMouseLeave={scheduleClosePopover}
            className="fixed z-[9998] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 min-w-[180px]"
            style={{ top: Math.min(popover.y, window.innerHeight - 300), left: 72 }}
          >
            <div className="flex items-center gap-2 px-3 py-2 mb-1 border-b border-slate-700">
              <SectionIcon className={`w-3.5 h-3.5 flex-shrink-0 ${section.color}`} />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">{section.name}</span>
            </div>
            {section.modules.map((module) => {
              const ModuleIcon = module.icon;
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => {
                    onModuleSelect(module);
                    setPopover(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all duration-150 text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                  }`}
                >
                  <ModuleIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : section.color}`} />
                  <span className="text-[11px]">{module.name}</span>
                </button>
              );
            })}
          </div>
        );
      })()}
    </>
  );
}
