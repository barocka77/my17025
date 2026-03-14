import { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Save, Trash2, CheckCircle2, AlertCircle, Eye, FileText,
  ChevronDown, ChevronUp, ClipboardCheck, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const FINDING_TYPES = [
  { key: 'pending', label: 'Değerlendirilmedi', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  { key: 'uygun', label: 'Uygun', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  { key: 'minör', label: 'Minör Uygunsuzluk', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { key: 'majör', label: 'Majör Uygunsuzluk', color: 'bg-red-100 text-red-700', dot: 'bg-red-600' },
  { key: 'gözlem', label: 'Gözlem', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
];

const NC_STATUS = [
  { key: 'open', label: 'Açık', color: 'bg-red-100 text-red-700' },
  { key: 'in_progress', label: 'Devam Ediyor', color: 'bg-amber-100 text-amber-700' },
  { key: 'closed', label: 'Kapatıldı', color: 'bg-blue-100 text-blue-700' },
  { key: 'verified', label: 'Doğrulandı', color: 'bg-green-100 text-green-700' },
];

interface Props {
  plan: any;
  onBack: () => void;
}

type Tab = 'questions' | 'nonconformities' | 'report';

export default function AuditDetailView({ plan, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('questions');
  const [questions, setQuestions] = useState<any[]>([]);
  const [nonconformities, setNonconformities] = useState<any[]>([]);
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [expandedNC, setExpandedNC] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [planStatus, setPlanStatus] = useState(plan.status);

  useEffect(() => {
    fetchAll();
  }, [plan.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [qRes, ncRes, rRes] = await Promise.all([
        supabase.from('internal_audit_questions').select('*').eq('audit_plan_id', plan.id).order('question_order'),
        supabase.from('internal_audit_nonconformities').select('*').eq('audit_plan_id', plan.id).order('created_at'),
        supabase.from('internal_audit_reports').select('*').eq('audit_plan_id', plan.id).maybeSingle(),
      ]);
      setQuestions(qRes.data || []);
      setNonconformities(ncRes.data || []);
      setReport(rRes.data || null);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = async () => {
    const order = questions.length + 1;
    const { data, error } = await supabase
      .from('internal_audit_questions')
      .insert([{
        audit_plan_id: plan.id,
        question_order: order,
        iso_clause: '',
        question_text: '',
        finding_type: 'pending',
        evidence: '',
        notes: '',
      }])
      .select()
      .single();
    if (!error && data) {
      setQuestions(prev => [...prev, data]);
      setExpandedQ(data.id);
    }
  };

  const updateQuestion = async (id: string, changes: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...changes } : q));
    await supabase.from('internal_audit_questions').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id);
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
    await supabase.from('internal_audit_questions').delete().eq('id', id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const addNonconformity = async () => {
    const ncNo = `UY-${plan.audit_year || new Date().getFullYear()}-${String(nonconformities.length + 1).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('internal_audit_nonconformities')
      .insert([{
        audit_plan_id: plan.id,
        nc_no: ncNo,
        iso_clause: '',
        description: '',
        finding_type: 'minör',
        root_cause: '',
        corrective_action: '',
        responsible_person: '',
        planned_close_date: null,
        verification_method: '',
        status: 'open',
        auditor_name: plan.auditor_name || '',
      }])
      .select()
      .single();
    if (!error && data) {
      setNonconformities(prev => [...prev, data]);
      setExpandedNC(data.id);
    }
  };

  const updateNC = async (id: string, changes: any) => {
    setNonconformities(prev => prev.map(nc => nc.id === id ? { ...nc, ...changes } : nc));
    await supabase.from('internal_audit_nonconformities').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id);
  };

  const deleteNC = async (id: string) => {
    if (!confirm('Bu uygunsuzluğu silmek istediğinize emin misiniz?')) return;
    await supabase.from('internal_audit_nonconformities').delete().eq('id', id);
    setNonconformities(prev => prev.filter(nc => nc.id !== id));
  };

  const generateReport = async () => {
    const total = questions.length;
    const conformant = questions.filter(q => q.finding_type === 'uygun').length;
    const minor = questions.filter(q => q.finding_type === 'minör').length;
    const major = questions.filter(q => q.finding_type === 'majör').length;
    const obs = questions.filter(q => q.finding_type === 'gözlem').length;

    const reportData = {
      audit_plan_id: plan.id,
      report_date: new Date().toISOString().split('T')[0],
      total_questions: total,
      total_conformant: conformant,
      total_minor_nc: minor,
      total_major_nc: major,
      total_observations: obs,
      summary: report?.summary || '',
      general_evaluation: report?.general_evaluation || '',
      strengths: report?.strengths || '',
      improvement_areas: report?.improvement_areas || '',
      conclusion: report?.conclusion || '',
      submitted_by: report?.submitted_by || plan.auditor_name || '',
      reviewed_by: report?.reviewed_by || '',
    };

    if (report) {
      const { data } = await supabase.from('internal_audit_reports').update(reportData).eq('id', report.id).select().single();
      setReport(data);
    } else {
      const { data } = await supabase.from('internal_audit_reports').insert([reportData]).select().single();
      setReport(data);
    }
    setActiveTab('report');
  };

  const updateReport = async (changes: any) => {
    const updated = { ...report, ...changes };
    setReport(updated);
    if (report) {
      await supabase.from('internal_audit_reports').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', report.id);
    }
  };

  const updatePlanStatus = async (status: string) => {
    setPlanStatus(status);
    await supabase.from('internal_audit_plans').update({ status, updated_at: new Date().toISOString() }).eq('id', plan.id);
  };

  const getFindingStyle = (type: string) => FINDING_TYPES.find(f => f.key === type) || FINDING_TYPES[0];
  const getNCStatusStyle = (status: string) => NC_STATUS.find(s => s.key === status) || NC_STATUS[0];

  const stats = {
    total: questions.length,
    uygun: questions.filter(q => q.finding_type === 'uygun').length,
    minör: questions.filter(q => q.finding_type === 'minör').length,
    majör: questions.filter(q => q.finding_type === 'majör').length,
    gözlem: questions.filter(q => q.finding_type === 'gözlem').length,
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    planned: { label: 'Planlandı', color: 'bg-slate-100 text-slate-600' },
    in_progress: { label: 'Devam Ediyor', color: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-600' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-[11px] font-semibold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Geri
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-[12px] font-semibold text-slate-700">
            {plan.audit_no || `Tetkik ${plan.audit_year}`}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{plan.scope || 'İç Tetkik Detayı'}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusConfig[planStatus]?.color}`}>
                {statusConfig[planStatus]?.label}
              </span>
              <span className="text-[11px] text-slate-500">Tetkikçi: {plan.auditor_name}</span>
              {plan.planned_date && (
                <span className="text-[11px] text-slate-500">
                  {new Date(plan.planned_date).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={planStatus}
              onChange={e => updatePlanStatus(e.target.value)}
              className="px-3 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white font-semibold text-slate-700"
            >
              <option value="planned">Planlandı</option>
              <option value="in_progress">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>
        </div>

        {stats.total > 0 && (
          <div className="flex gap-3 mt-3">
            {[
              { label: 'Toplam Soru', value: stats.total, color: 'text-slate-600' },
              { label: 'Uygun', value: stats.uygun, color: 'text-green-700' },
              { label: 'Minör', value: stats.minör, color: 'text-amber-700' },
              { label: 'Majör', value: stats.majör, color: 'text-red-700' },
              { label: 'Gözlem', value: stats.gözlem, color: 'text-blue-700' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-slate-400 font-semibold uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 mt-4">
          {([
            { key: 'questions', label: 'Soru Formu (FR.17)', icon: ClipboardCheck },
            { key: 'nonconformities', label: 'Uygunsuzluklar (FR.18)', icon: AlertTriangle },
            { key: 'report', label: 'Tetkik Raporu (FR.41)', icon: FileText },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.key === 'nonconformities' && nonconformities.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {nonconformities.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'questions' && (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-slate-500">TS EN ISO/IEC 17025 standardı referans alınarak değerlendirme yapın.</p>
              <button
                onClick={addQuestion}
                className="flex items-center gap-1.5 bg-slate-700 text-white px-3 py-2 rounded-lg text-[11px] font-semibold hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Soru Ekle
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-slate-500 text-sm font-medium">Henüz soru eklenmedi</p>
                <p className="text-slate-400 text-[11px] mt-1">Tetkik sorularını ekleyerek değerlendirmeye başlayın</p>
              </div>
            ) : (
              questions.map((q, idx) => {
                const fStyle = getFindingStyle(q.finding_type);
                const isExpanded = expandedQ === q.id;
                return (
                  <div key={q.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50"
                      onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                    >
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-700 leading-snug">
                          {q.question_text || <span className="italic text-slate-400">Soru metni girilmedi</span>}
                        </p>
                        {q.iso_clause && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{q.iso_clause}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${fStyle.color}`}>
                          {fStyle.label}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteQuestion(q.id); }}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Standart Maddesi</label>
                            <input
                              type="text"
                              value={q.iso_clause}
                              onChange={e => updateQuestion(q.id, { iso_clause: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white"
                              placeholder="ör. 8.7 – İç Tetkikler"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Bulgu Tipi</label>
                            <select
                              value={q.finding_type}
                              onChange={e => updateQuestion(q.id, { finding_type: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white"
                            >
                              {FINDING_TYPES.map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Soru Metni</label>
                          <textarea
                            value={q.question_text}
                            onChange={e => updateQuestion(q.id, { question_text: e.target.value })}
                            rows={2}
                            className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Soru metnini girin..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Delil / Kanıt</label>
                          <textarea
                            value={q.evidence}
                            onChange={e => updateQuestion(q.id, { evidence: e.target.value })}
                            rows={2}
                            className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Sunulan delil veya kanıtlar..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Tetkikçi Notu</label>
                          <textarea
                            value={q.notes}
                            onChange={e => updateQuestion(q.id, { notes: e.target.value })}
                            rows={2}
                            className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Tetkikçi değerlendirme notu..."
                          />
                        </div>

                        {(q.finding_type === 'minör' || q.finding_type === 'majör') && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-700">
                              Bu bulgu için "Uygunsuzluklar" sekmesinde FR.18 formu oluşturmanız gerekmektedir.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {questions.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={generateReport}
                  className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-semibold text-[12px]"
                >
                  <FileText className="w-4 h-4" />
                  Raporu Oluştur / Güncelle (FR.41)
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'nonconformities' && (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-slate-500">Tespit edilen uygunsuzluklar ve düzeltici faaliyetler.</p>
              <button
                onClick={addNonconformity}
                className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg text-[11px] font-semibold hover:bg-red-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Uygunsuzluk Ekle
              </button>
            </div>

            {nonconformities.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
                <p className="text-slate-500 text-sm font-medium">Kayıtlı uygunsuzluk yok</p>
                <p className="text-slate-400 text-[11px] mt-1">Bu tetkikte uygunsuzluk tespit edilmediyse burası boş kalabilir</p>
              </div>
            ) : (
              nonconformities.map(nc => {
                const isExpanded = expandedNC === nc.id;
                const statusStyle = getNCStatusStyle(nc.status);
                const fStyle = getFindingStyle(nc.finding_type);
                return (
                  <div key={nc.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50"
                      onClick={() => setExpandedNC(isExpanded ? null : nc.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-bold text-slate-800">{nc.nc_no}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${fStyle.color}`}>{fStyle.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusStyle.color}`}>{statusStyle.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {nc.description || <span className="italic text-slate-400">Açıklama yok</span>}
                        </p>
                        {nc.iso_clause && <p className="text-[10px] text-slate-400 mt-0.5">{nc.iso_clause}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); deleteNC(nc.id); }}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Uygunsuzluk No</label>
                            <input type="text" value={nc.nc_no} onChange={e => updateNC(nc.id, { nc_no: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Standart Maddesi</label>
                            <input type="text" value={nc.iso_clause} onChange={e => updateNC(nc.id, { iso_clause: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white"
                              placeholder="ör. 8.7" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Bulgu Tipi</label>
                            <select value={nc.finding_type} onChange={e => updateNC(nc.id, { finding_type: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                              <option value="minör">Minör Uygunsuzluk</option>
                              <option value="majör">Majör Uygunsuzluk</option>
                              <option value="gözlem">Gözlem</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Durum</label>
                            <select value={nc.status} onChange={e => updateNC(nc.id, { status: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                              <option value="open">Açık</option>
                              <option value="in_progress">Devam Ediyor</option>
                              <option value="closed">Kapatıldı</option>
                              <option value="verified">Doğrulandı</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Uygunsuzluk Açıklaması</label>
                          <textarea value={nc.description} onChange={e => updateNC(nc.id, { description: e.target.value })}
                            rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Uygunsuzluğun detaylı açıklaması..." />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Kök Neden Analizi</label>
                          <textarea value={nc.root_cause} onChange={e => updateNC(nc.id, { root_cause: e.target.value })}
                            rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Kök neden analizi..." />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Düzeltici Faaliyet</label>
                          <textarea value={nc.corrective_action} onChange={e => updateNC(nc.id, { corrective_action: e.target.value })}
                            rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Alınan veya planlanan düzeltici faaliyet..." />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Sorumlu Kişi</label>
                            <input type="text" value={nc.responsible_person} onChange={e => updateNC(nc.id, { responsible_person: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" placeholder="Ad Soyad" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Hedef Kapanış Tarihi</label>
                            <input type="date" value={nc.planned_close_date || ''} onChange={e => updateNC(nc.id, { planned_close_date: e.target.value || null })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Doğrulama Yöntemi</label>
                            <select value={nc.verification_method} onChange={e => updateNC(nc.id, { verification_method: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                              <option value="">Seçilmedi</option>
                              <option value="document_review">Doküman İncelemesi</option>
                              <option value="follow_up_audit">Takip Tetkiki</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Gerçek Kapanış Tarihi</label>
                            <input type="date" value={nc.actual_close_date || ''} onChange={e => updateNC(nc.id, { actual_close_date: e.target.value || null })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Kapanış Notu / Tetkikçi Onayı</label>
                          <textarea value={nc.closure_notes} onChange={e => updateNC(nc.id, { closure_notes: e.target.value })}
                            rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Kapanış notu veya tetkikçi doğrulama açıklaması..." />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="max-w-3xl mx-auto space-y-4">
            {!report ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="text-slate-600 font-medium text-sm">Henüz rapor oluşturulmadı</p>
                <p className="text-slate-400 text-[11px] mt-1 mb-4">Soru formunu doldurduktan sonra raporu otomatik oluşturun</p>
                <button
                  onClick={generateReport}
                  className="inline-flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors font-semibold text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Raporu Oluştur
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-700 text-white px-5 py-3">
                    <span className="text-[12px] font-bold uppercase tracking-wider">FR.41 — İç Tetkik Raporu</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">PR01.09 / Rev.03</p>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                      {[
                        { label: 'Toplam', value: report.total_questions, color: 'bg-slate-50 text-slate-700' },
                        { label: 'Uygun', value: report.total_conformant, color: 'bg-green-50 text-green-700' },
                        { label: 'Minör', value: report.total_minor_nc, color: 'bg-amber-50 text-amber-700' },
                        { label: 'Majör', value: report.total_major_nc, color: 'bg-red-50 text-red-700' },
                        { label: 'Gözlem', value: report.total_observations, color: 'bg-blue-50 text-blue-700' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                          <div className="text-xl font-bold">{s.value}</div>
                          <div className="text-[10px] font-semibold uppercase">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {[
                        { key: 'summary', label: 'Tetkik Özeti' },
                        { key: 'general_evaluation', label: 'Genel Değerlendirme' },
                        { key: 'strengths', label: 'Güçlü Yönler' },
                        { key: 'improvement_areas', label: 'İyileştirme Alanları' },
                        { key: 'conclusion', label: 'Sonuç ve Karar' },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">{field.label}</label>
                          <textarea
                            value={report[field.key] || ''}
                            onChange={e => updateReport({ [field.key]: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all resize-none"
                            placeholder={`${field.label}...`}
                          />
                        </div>
                      ))}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Hazırlayan (Tetkikçi)</label>
                          <input
                            type="text"
                            value={report.submitted_by || ''}
                            onChange={e => updateReport({ submitted_by: e.target.value })}
                            className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg"
                            placeholder="Kalite Yöneticisi"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Onaylayan</label>
                          <input
                            type="text"
                            value={report.reviewed_by || ''}
                            onChange={e => updateReport({ reviewed_by: e.target.value })}
                            className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg"
                            placeholder="Şirket Müdürü"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Rapor Tarihi</label>
                          <input
                            type="date"
                            value={report.report_date || ''}
                            onChange={e => updateReport({ report_date: e.target.value })}
                            className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={generateReport}
                    className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-semibold text-sm"
                  >
                    <Save className="w-4 h-4" />
                    Sayıları Yenile
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
