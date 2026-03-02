import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ModuleView from './components/ModuleView';
import CustomerFeedbackView from './components/CustomerFeedbackView';
import CustomerSurveyView from './components/CustomerSurveyView';
import PersonnelView from './components/PersonnelView';
import DocumentMasterListView from './components/DocumentMasterListView';
import AdminPanel from './components/AdminPanel';
import ActionTracking from './components/ActionTracking';
import PersonalNotepad from './components/PersonalNotepad';
import Login from './components/Login';
import VerifySignature from './components/VerifySignature';
import { Module } from './types/modules';
import { sections } from './config/modules';
import { Microscope, Menu, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useCompliance } from './contexts/ComplianceContext';

function App() {
  const { user, role, loading } = useAuth();
  const { isLocked, criticalItemsCount, loading: complianceLoading } = useCompliance();
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [isVerifyPage, setIsVerifyPage] = useState(() => window.location.hash === '#verify-signature');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showActionTracking, setShowActionTracking] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [autoOpenRecordId, setAutoOpenRecordId] = useState<string | null>(null);
  const [permissionDeniedToast, setPermissionDeniedToast] = useState(false);

  const handleModuleSelect = (module: Module) => {
    if (isLocked) {
      return;
    }
    setActiveModule(module);
    setShowAdminPanel(false);
    setShowActionTracking(false);
    setShowNotepad(false);
    setIsMobileMenuOpen(false);
    setAutoOpenRecordId(null);
    setSidebarCollapsed(true);
  };

  const handleAdminPanelSelect = () => {
    if (isLocked) {
      return;
    }
    if (role && ['admin', 'quality_manager', 'super_admin'].includes(role)) {
      setShowAdminPanel(true);
      setActiveModule(null);
      setShowActionTracking(false);
      setShowNotepad(false);
      setIsMobileMenuOpen(false);
    } else {
      setPermissionDeniedToast(true);
      setTimeout(() => setPermissionDeniedToast(false), 3000);
    }
  };

  const handleHomeSelect = () => {
    if (isLocked) {
      return;
    }
    setActiveModule(null);
    setShowAdminPanel(false);
    setShowActionTracking(false);
    setShowNotepad(false);
    setIsMobileMenuOpen(false);
    setAutoOpenRecordId(null);
  };

  const handleActionTrackingSelect = () => {
    setShowActionTracking(true);
    setActiveModule(null);
    setShowAdminPanel(false);
    setShowNotepad(false);
    setIsMobileMenuOpen(false);
    setAutoOpenRecordId(null);
  };

  const handleNotepadSelect = () => {
    const canAccessNotes = user?.email === 'toztoprakbaraka@gmail.com' || user?.email === 'oosmanozturk06@gmail.com';
    if (canAccessNotes) {
      setShowNotepad(true);
      setActiveModule(null);
      setShowAdminPanel(false);
      setShowActionTracking(false);
      setIsMobileMenuOpen(false);
      setAutoOpenRecordId(null);
    } else {
      setPermissionDeniedToast(true);
      setTimeout(() => setPermissionDeniedToast(false), 3000);
    }
  };

  useEffect(() => {
    if (!complianceLoading && isLocked && user) {
      console.log('[App] System locked, forcing redirect to Action Tracking');
      setShowActionTracking(true);
      setActiveModule(null);
      setShowAdminPanel(false);
      setShowNotepad(false);
    }
  }, [isLocked, complianceLoading, user]);

  useEffect(() => {
    if (!user || loading) return;
    const hash = window.location.hash;
    const pendingRedirect = sessionStorage.getItem('pending_feedback_redirect');
    const targetId = pendingRedirect || (() => {
      const match = hash.match(/^#feedback\/([0-9a-f-]{36})$/i);
      return match ? match[1] : null;
    })();
    if (targetId) {
      sessionStorage.removeItem('pending_feedback_redirect');
      const feedbackModule = sections
        .flatMap(section => section.modules)
        .find(m => m.id === 'customer_feedback');
      if (feedbackModule) {
        setAutoOpenRecordId(targetId);
        setActiveModule(feedbackModule);
        setShowAdminPanel(false);
        setShowActionTracking(false);
        setShowNotepad(false);
        setSidebarCollapsed(true);
      }
    }
  }, [user, loading]);

  const handleViewActionItem = (source: 'feedback' | 'equipment', id: string) => {
    if (source === 'feedback') {
      const feedbackModule = sections
        .flatMap(section => section.modules)
        .find(m => m.id === 'customer_feedback');

      if (feedbackModule) {
        setAutoOpenRecordId(id);
        setActiveModule(feedbackModule);
        setShowActionTracking(false);
        setShowNotepad(false);
        setIsMobileMenuOpen(false);
        setSidebarCollapsed(true);
      }
    } else if (source === 'equipment') {
      const equipmentModule = sections
        .flatMap(section => section.modules)
        .find(m => m.id === 'equipment_hardware');

      if (equipmentModule) {
        setAutoOpenRecordId(id);
        setActiveModule(equipmentModule);
        setShowActionTracking(false);
        setShowNotepad(false);
        setIsMobileMenuOpen(false);
        setSidebarCollapsed(true);
      }
    }
  };

  // Push history state when navigating to a module or admin panel
  useEffect(() => {
    if (showAdminPanel) {
      window.history.pushState(
        { page: 'admin' },
        '',
        '#admin'
      );
    } else if (showActionTracking) {
      window.history.pushState(
        { page: 'actions' },
        '',
        '#actions'
      );
    } else if (showNotepad) {
      window.history.pushState(
        { page: 'notepad' },
        '',
        '#notepad'
      );
    } else if (activeModule) {
      window.history.pushState(
        { module: activeModule.id, page: 'module' },
        '',
        `#${activeModule.id}`
      );
    } else {
      window.history.replaceState(
        { page: 'dashboard' },
        '',
        '#'
      );
    }
  }, [activeModule, showAdminPanel, showActionTracking, showNotepad]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we're in admin panel, action tracking, notepad, or a module, go back to dashboard
      if (showAdminPanel || showActionTracking || showNotepad || activeModule !== null) {
        event.preventDefault();
        setShowAdminPanel(false);
        setShowActionTracking(false);
        setShowNotepad(false);
        setActiveModule(null);
        setIsMobileMenuOpen(false);
      }
      // If already on dashboard, allow normal back behavior (exit app)
    };

    // Add initial history state for dashboard on mount
    if (!window.history.state) {
      window.history.replaceState(
        { page: 'dashboard' },
        '',
        '#'
      );
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeModule, showAdminPanel, showActionTracking, showNotepad]);


  useEffect(() => {
    const onHashChange = () => {
      setIsVerifyPage(window.location.hash === '#verify-signature');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (isVerifyPage) {
    return <VerifySignature />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const hash = window.location.hash;
    const feedbackMatch = hash.match(/^#feedback\/([0-9a-f-]{36})$/i);
    if (feedbackMatch) {
      sessionStorage.setItem('pending_feedback_redirect', feedbackMatch[1]);
    }
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Desktop Hamburger - visible only when sidebar is collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="hidden lg:flex fixed top-4 left-4 z-50 w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-lg items-center justify-center shadow-lg transition-colors"
          title="Menüyü Aç"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out overflow-visible
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="relative h-full overflow-visible">
          <Sidebar
            activeModule={activeModule?.id || null}
            showAdminPanel={showAdminPanel}
            showActionTracking={showActionTracking}
            showNotepad={showNotepad}
            onModuleSelect={handleModuleSelect}
            onAdminPanelSelect={handleAdminPanelSelect}
            onHomeSelect={handleHomeSelect}
            onActionTrackingSelect={handleActionTrackingSelect}
            onNotepadSelect={handleNotepadSelect}
            isLocked={isLocked}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          />
          {/* Desktop Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className="hidden lg:flex absolute -right-4 top-7 z-50 w-8 h-8 bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 rounded-full items-center justify-center transition-colors shadow-lg"
            title={sidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Küçült'}
          >
            {sidebarCollapsed
              ? <ChevronRight className="w-4 h-4 text-slate-200" />
              : <ChevronLeft className="w-4 h-4 text-slate-200" />
            }
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        {showAdminPanel ? (
          <AdminPanel />
        ) : showActionTracking ? (
          <ActionTracking onViewItem={handleViewActionItem} />
        ) : showNotepad ? (
          <div className="h-full p-6">
            <PersonalNotepad />
          </div>
        ) : activeModule ? (
          activeModule.id === 'customer_feedback' ? (
            <CustomerFeedbackView autoOpenRecordId={autoOpenRecordId} onRecordOpened={() => setAutoOpenRecordId(null)} />
          ) : activeModule.id === 'customer_surveys' ? (
            <CustomerSurveyView />
          ) : activeModule.id === 'personnel' ? (
            <PersonnelView />
          ) : activeModule.id === 'document_master_list' ? (
            <DocumentMasterListView />
          ) : activeModule.id === 'equipment_hardware' ? (
            <ModuleView module={activeModule} userRole={role} autoOpenRecordId={autoOpenRecordId} onRecordOpened={() => setAutoOpenRecordId(null)} />
          ) : (
            <ModuleView module={activeModule} userRole={role} />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-16 lg:pt-0">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full">
              <Microscope className="w-12 h-12 md:w-16 md:h-16 text-blue-600 mx-auto mb-3 md:mb-4" />
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 md:mb-3">
                my17025
              </h2>
              <p className="text-sm md:text-base text-slate-600 mb-2">
                Laboratuvar Bilgi Yönetim Sistemi
              </p>
              <p className="text-slate-500 text-[11px] mt-3 md:mt-4">
                <span className="lg:hidden">Başlamak için üst sol köşedeki menüyü açın</span>
                <span className="hidden lg:inline">Başlamak için sol menüden bir modül seçin</span>
              </p>
              <div className="grid grid-cols-2 gap-2 md:gap-3 mt-4 md:mt-6 text-left">
                <div className="bg-blue-50 p-2.5 md:p-3 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-0.5 md:mb-1 text-[10px] md:text-[11px]">26 Modül</h3>
                  <p className="text-[9px] md:text-[10px] text-blue-700">Tam entegre sistem</p>
                </div>
                <div className="bg-green-50 p-2.5 md:p-3 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-0.5 md:mb-1 text-[10px] md:text-[11px]">4 Ana Bölüm</h3>
                  <p className="text-[9px] md:text-[10px] text-green-700">Organize yapı</p>
                </div>
                <div className="bg-orange-50 p-2.5 md:p-3 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-0.5 md:mb-1 text-[10px] md:text-[11px]">CRUD İşlemleri</h3>
                  <p className="text-[9px] md:text-[10px] text-orange-700">Ekle, düzenle, sil</p>
                </div>
                <div className="bg-purple-50 p-2.5 md:p-3 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-0.5 md:mb-1 text-[10px] md:text-[11px]">Gerçek Zamanlı</h3>
                  <p className="text-[9px] md:text-[10px] text-purple-700">Anlık veri yönetimi</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {permissionDeniedToast && (
        <div className="fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl bg-red-600 text-white flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Erişim Engellendi: Yalnızca yöneticiler bu bölüme erişebilir</span>
        </div>
      )}
    </div>
  );
}

export default App;
