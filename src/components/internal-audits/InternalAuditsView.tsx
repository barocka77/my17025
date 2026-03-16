import { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, CreditCard as Edit2, Trash2, Calendar, User, ChevronRight, CheckCircle2, Clock, AlertTriangle, XCircle, BarChart2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuditPlanModal from './AuditPlanModal';
import AuditDetailView from './AuditDetailView';

interface AuditPlan {
  id: string;
  audit_year: number;
  audit_no: string;
  scope: string;
  auditor_name: string;
  auditee_name: string;
  planned_date: string | null;
  actual_date: string | null;
  status: string;
  audit_type: string;
  iso_clauses: string[];
  notes: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  planned: { label: 'Planlandı', color: 'bg-slate-100 text-slate-600', icon: Clock },
  in_progress: { label: 'Devam Ediyor', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-600', icon: XCircle },
};

export default function InternalAuditsView() {
  const [plans, setPlans] = useState<AuditPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<AuditPlan | undefined>(undefined);
  const [selectedPlan, setSelectedPlan] = useState<AuditPlan | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await supabase
        .from('internal_audit_plans')
        .select('*')
        .order('planned_date', { ascending: false, nullsFirst: false })
        .order('audit_no', { ascending: false });
      setPlans(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu tetkik planını ve tüm ilgili verileri (sorular, uygunsuzluklar, rapor) silmek istediğinize emin misiniz?')) return;
    await supabase.from('internal_audit_plans').delete().eq('id', id);
    fetchPlans();
  };

  const years = [...new Set(plans.map(p => p.audit_year))].sort((a, b) => b - a);
  const filtered = filterYear === 'all' ? plans : plans.filter(p => p.audit_year === filterYear);

  const stats = {
    total: plans.length,
    planned: plans.filter(p => p.status === 'planned').length,
    in_progress: plans.filter(p => p.status === 'in_progress').length,
    completed: plans.filter(p => p.status === 'completed').length,
  };

  if (selectedPlan) {
    return (
      <AuditDetailView
        plan={selectedPlan}
        onBack={() => { setSelectedPlan(null); fetchPlans(); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 pt-16 md:pt-5 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">İç Tetkikler</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">PR01.09 Rev.03 — TS EN ISO/IEC 17025</p>
          </div>
          <button
            onClick={() => { setEditData(undefined); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni Tetkik Planı
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Toplam</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Planlanan</span>
            </div>
            <div className="text-2xl font-bold">{stats.planned}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Devam Eden</span>
            </div>
            <div className="text-2xl font-bold">{stats.in_progress}</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Tamamlanan</span>
            </div>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </div>
        </div>

        {years.length > 1 && (
          <div className="flex gap-1 mt-4 flex-wrap">
            <button
              onClick={() => setFilterYear('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                filterYear === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Tümü
            </button>
            {years.map(y => (
              <button
                key={y}
                onClick={() => setFilterYear(y)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  filterYear === y ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="space-y-2 max-w-4xl mx-auto">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-600 font-medium text-sm">Henüz tetkik planı yok</p>
              <p className="text-slate-400 text-[11px] mt-1">İlk tetkik planını oluşturmak için butonu kullanın</p>
            </div>
          ) : (
            filtered.map(plan => {
              const sc = STATUS_CONFIG[plan.status] || STATUS_CONFIG.planned;
              const StatusIcon = sc.icon;
              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-600">{plan.audit_year}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {plan.audit_no && (
                          <span className="text-[12px] font-bold text-slate-700">{plan.audit_no}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {sc.label}
                        </span>
                        {plan.audit_type === 'unplanned' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">Plan Dışı</span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-slate-800 mt-0.5 leading-snug">
                        {plan.scope || 'Kapsam belirtilmemiş'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {plan.auditor_name && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <User className="w-3 h-3" />
                            {plan.auditor_name}
                          </span>
                        )}
                        {plan.planned_date && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(plan.planned_date).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                        {(plan.iso_clauses || []).length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {plan.iso_clauses.length} madde
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setEditData(plan); setIsModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(plan.id); }}
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedPlan(plan)}
                        className="flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-[11px] font-semibold hover:bg-slate-800 transition-colors"
                      >
                        Aç
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AuditPlanModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditData(undefined); }}
        onSuccess={fetchPlans}
        editData={editData}
      />
    </div>
  );
}
