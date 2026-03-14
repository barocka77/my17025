import { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp,
  Star, ShoppingCart, ClipboardCheck, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const EVAL_CRITERIA = [
  { key: 'score_quality', label: 'Kalite / Uygunluk' },
  { key: 'score_delivery', label: 'Teslimat / Zamanlama' },
  { key: 'score_price', label: 'Fiyat / Maliyet' },
  { key: 'score_communication', label: 'İletişim / Yanıt Verme' },
  { key: 'score_documentation', label: 'Dokümantasyon (Sertifika vb.)' },
  { key: 'score_accreditation', label: 'Akreditasyon / Yeterlilik' },
];

const EVAL_TYPES: Record<string, string> = {
  initial: 'İlk Değerlendirme',
  periodic: 'Periyodik Değerlendirme',
  ad_hoc: 'Olağanüstü Değerlendirme',
};

const EVAL_RESULTS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Onaylandı', color: 'bg-green-100 text-green-700' },
  conditional: { label: 'Şartlı', color: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
};

const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'bg-slate-100 text-slate-600' },
  approved: { label: 'Onaylandı', color: 'bg-blue-100 text-blue-700' },
  ordered: { label: 'Sipariş Verildi', color: 'bg-amber-100 text-amber-700' },
  received: { label: 'Teslim Alındı', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
};

const ITEM_TYPES: Record<string, string> = {
  material: 'Malzeme',
  equipment: 'Cihaz / Donanım',
  calibration: 'Kalibrasyon Hizmeti',
  service: 'Hizmet',
  other: 'Diğer',
};

interface Props {
  supplier: any;
  onBack: () => void;
}

type Tab = 'evaluations' | 'orders';

export default function SupplierDetailView({ supplier, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('evaluations');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, [supplier.id]);

  const fetchAll = async () => {
    try {
      const [evRes, ordRes] = await Promise.all([
        supabase.from('supplier_evaluations').select('*').eq('supplier_id', supplier.id).order('evaluation_date', { ascending: false }),
        supabase.from('purchase_orders').select('*').eq('supplier_id', supplier.id).order('order_date', { ascending: false }),
      ]);
      setEvaluations(evRes.data || []);
      setOrders(ordRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const calcTotal = (form: any) => {
    const scores = EVAL_CRITERIA.map(c => parseFloat(form[c.key]) || 0).filter(s => s > 0);
    if (scores.length === 0) return 0;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const addEvaluation = async () => {
    const { data, error } = await supabase
      .from('supplier_evaluations')
      .insert([{
        supplier_id: supplier.id,
        evaluation_date: new Date().toISOString().split('T')[0],
        evaluation_type: 'periodic',
        evaluator_name: '',
        score_quality: 0, score_delivery: 0, score_price: 0,
        score_communication: 0, score_documentation: 0, score_accreditation: 0,
        total_score: 0, result: 'approved',
        strengths: '', weaknesses: '', action_taken: '', notes: '',
      }])
      .select().single();
    if (!error && data) {
      setEvaluations(prev => [data, ...prev]);
      setExpandedEval(data.id);
    }
  };

  const updateEval = async (id: string, changes: any) => {
    const updated = evaluations.find(e => e.id === id);
    if (!updated) return;
    const merged = { ...updated, ...changes };
    const total = parseFloat(calcTotal(merged));
    const finalChanges = { ...changes, total_score: total };
    setEvaluations(prev => prev.map(e => e.id === id ? { ...e, ...finalChanges } : e));
    await supabase.from('supplier_evaluations').update({ ...finalChanges, updated_at: new Date().toISOString() }).eq('id', id);
  };

  const deleteEval = async (id: string) => {
    if (!confirm('Bu değerlendirmeyi silmek istediğinize emin misiniz?')) return;
    await supabase.from('supplier_evaluations').delete().eq('id', id);
    setEvaluations(prev => prev.filter(e => e.id !== id));
  };

  const addOrder = async () => {
    const orderNo = `SA-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([{
        supplier_id: supplier.id,
        order_no: orderNo,
        order_date: new Date().toISOString().split('T')[0],
        item_description: '',
        item_type: 'material',
        quantity: '1',
        unit: '',
        special_requirements: '',
        requires_calibration_cert: false,
        requires_training: false,
        requested_by: '',
        approved_by: '',
        status: 'draft',
        inspection_result: '',
        notes: '',
      }])
      .select().single();
    if (!error && data) {
      setOrders(prev => [data, ...prev]);
      setExpandedOrder(data.id);
    }
  };

  const updateOrder = async (id: string, changes: any) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o));
    await supabase.from('purchase_orders').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Bu satınalma formunu silmek istediğinize emin misiniz?')) return;
    await supabase.from('purchase_orders').delete().eq('id', id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const categoryLabels: Record<string, string> = {
    calibration_lab: 'Kalibrasyon Lab.',
    material: 'Malzeme / Sarf',
    equipment: 'Cihaz / Donanım',
    service: 'Hizmet',
    other: 'Diğer',
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    approved: { label: 'Onaylı', color: 'bg-green-100 text-green-700' },
    conditional: { label: 'Şartlı', color: 'bg-amber-100 text-amber-700' },
    suspended: { label: 'Askıya Alındı', color: 'bg-red-100 text-red-600' },
    removed: { label: 'Çıkarıldı', color: 'bg-slate-100 text-slate-500' },
  };

  const sc = statusConfig[supplier.status] || statusConfig.approved;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
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
          <span className="text-[12px] font-semibold text-slate-700">{supplier.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">{supplier.name}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc.color}`}>{sc.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                {categoryLabels[supplier.category] || supplier.category}
              </span>
              {supplier.is_accredited && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Akredite</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1">
              {supplier.supplier_no && <span className="text-[10px] text-slate-500">No: {supplier.supplier_no}</span>}
              {supplier.contact_person && <span className="text-[10px] text-slate-500">{supplier.contact_person}</span>}
              {supplier.phone && <span className="text-[10px] text-slate-500">{supplier.phone}</span>}
              {supplier.email && <span className="text-[10px] text-slate-500">{supplier.email}</span>}
            </div>
            {supplier.is_accredited && supplier.accreditation_no && (
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] text-blue-600">
                  {supplier.accreditation_body} — {supplier.accreditation_no}
                  {supplier.accreditation_expiry && ` (Son: ${new Date(supplier.accreditation_expiry).toLocaleDateString('tr-TR')})`}
                </span>
                {supplier.accreditation_expiry && new Date(supplier.accreditation_expiry) < new Date() && (
                  <span className="text-[10px] text-red-600 font-semibold">— SÜRESİ DOLMUŞ</span>
                )}
              </div>
            )}
            {supplier.warning_notes && (
              <div className="flex items-start gap-1 mt-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-[10px] text-amber-700">{supplier.warning_notes}</span>
              </div>
            )}
          </div>
          {supplier.last_evaluation_score && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <Star className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-sm font-bold text-slate-700">{supplier.last_evaluation_score}/5</div>
                <div className="text-[9px] text-slate-400 uppercase">Son Değerlendirme</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 mt-4">
          {([
            { key: 'evaluations', label: `FR.08 — Değerlendirme (${evaluations.length})`, icon: Star },
            { key: 'orders', label: `FR.09 — Satınalma (${orders.length})`, icon: ShoppingCart },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'evaluations' && (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-slate-500">FR.08 — Tedarikçi Değerlendirme Formu (§5.3 kriterleri)</p>
              <button onClick={addEvaluation}
                className="flex items-center gap-1.5 bg-orange-600 text-white px-3 py-2 rounded-lg text-[11px] font-semibold hover:bg-orange-700 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Değerlendirme Ekle
              </button>
            </div>

            {evaluations.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <Star className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-slate-500 text-sm font-medium">Henüz değerlendirme yok</p>
                <p className="text-slate-400 text-[11px] mt-1">Periyodik değerlendirmeyi ekleyin</p>
              </div>
            ) : (
              evaluations.map(ev => {
                const isExpanded = expandedEval === ev.id;
                const rStyle = EVAL_RESULTS[ev.result] || EVAL_RESULTS.approved;
                return (
                  <div key={ev.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50"
                      onClick={() => setExpandedEval(isExpanded ? null : ev.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-bold text-slate-800">
                            {ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString('tr-TR') : '—'}
                          </span>
                          <span className="text-[10px] text-slate-500">{EVAL_TYPES[ev.evaluation_type]}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${rStyle.color}`}>{rStyle.label}</span>
                        </div>
                        {ev.total_score > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-amber-400" />
                            <span className="text-[11px] font-semibold text-slate-600">Ortalama: {ev.total_score} / 5</span>
                            {ev.evaluator_name && <span className="text-[10px] text-slate-400 ml-1">— {ev.evaluator_name}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); deleteEval(ev.id); }}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Tarih</label>
                            <input type="date" value={ev.evaluation_date || ''} onChange={e => updateEval(ev.id, { evaluation_date: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Tür</label>
                            <select value={ev.evaluation_type} onChange={e => updateEval(ev.id, { evaluation_type: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                              {Object.entries(EVAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Değerlendiren</label>
                            <input type="text" value={ev.evaluator_name} onChange={e => updateEval(ev.id, { evaluator_name: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" placeholder="Ad Soyad" />
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 mb-2 uppercase">Değerlendirme Kriterleri (1–5 Puan)</p>
                          <div className="grid grid-cols-2 gap-2">
                            {EVAL_CRITERIA.map(c => (
                              <div key={c.key} className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-slate-100">
                                <label className="text-[10px] font-medium text-slate-600 flex-1">{c.label}</label>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                      key={n}
                                      type="button"
                                      onClick={() => updateEval(ev.id, { [c.key]: n })}
                                      className={`w-6 h-6 rounded text-[10px] font-bold border transition-all ${
                                        (ev[c.key] || 0) >= n
                                          ? 'bg-orange-500 text-white border-orange-500'
                                          : 'bg-white text-slate-300 border-slate-200 hover:border-slate-400'
                                      }`}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          {ev.total_score > 0 && (
                            <div className={`mt-2 px-3 py-2 rounded-lg text-[11px] font-semibold text-center ${
                              ev.total_score >= 4 ? 'bg-green-50 text-green-700' :
                              ev.total_score >= 2.5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                            }`}>
                              Ortalama Puan: {ev.total_score} / 5
                              {ev.total_score >= 4 ? ' — Onaylandı' : ev.total_score >= 2.5 ? ' — Şartlı' : ' — Reddedildi'}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Sonuç Kararı</label>
                          <select value={ev.result} onChange={e => updateEval(ev.id, { result: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                            <option value="approved">Onaylandı</option>
                            <option value="conditional">Şartlı</option>
                            <option value="rejected">Reddedildi</option>
                          </select>
                        </div>

                        {[
                          { key: 'strengths', label: 'Güçlü Yönler', placeholder: 'Olumlu gözlemler...' },
                          { key: 'weaknesses', label: 'Zayıf Yönler / Uygunsuzluklar', placeholder: 'Eksikler veya sorunlar...' },
                          { key: 'action_taken', label: 'Alınan / Planlanan Aksiyon', placeholder: 'Düzeltici faaliyetler veya aksiyonlar...' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">{f.label}</label>
                            <textarea value={ev[f.key] || ''} onChange={e => updateEval(ev.id, { [f.key]: e.target.value })}
                              rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                              placeholder={f.placeholder} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-slate-500">FR.09 — Satınalma Formu (§5.1 satınalma ve girdi kontrol)</p>
              <button onClick={addOrder}
                className="flex items-center gap-1.5 bg-orange-600 text-white px-3 py-2 rounded-lg text-[11px] font-semibold hover:bg-orange-700 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Sipariş / Talep Ekle
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-slate-500 text-sm font-medium">Henüz satınalma kaydı yok</p>
                <p className="text-slate-400 text-[11px] mt-1">Bu tedarikçiye satınalma talebi oluşturun</p>
              </div>
            ) : (
              orders.map(order => {
                const isExpanded = expandedOrder === order.id;
                const oStyle = ORDER_STATUSES[order.status] || ORDER_STATUSES.draft;
                return (
                  <div key={order.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-bold text-slate-800">{order.order_no}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${oStyle.color}`}>{oStyle.label}</span>
                          <span className="text-[10px] text-slate-500">{ITEM_TYPES[order.item_type]}</span>
                          {order.inspection_result === 'pass' && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">Girdi Kontrol: Uygun</span>}
                          {order.inspection_result === 'fail' && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-semibold">Girdi Kontrol: Uygun Değil</span>}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {order.item_description || <span className="italic text-slate-400">Açıklama girilmedi</span>}
                        </p>
                        <div className="flex gap-3 mt-0.5">
                          {order.order_date && <span className="text-[10px] text-slate-400">{new Date(order.order_date).toLocaleDateString('tr-TR')}</span>}
                          {order.requested_by && <span className="text-[10px] text-slate-400">Talep: {order.requested_by}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); deleteOrder(order.id); }}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Sipariş No</label>
                            <input type="text" value={order.order_no} onChange={e => updateOrder(order.id, { order_no: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Ürün / Hizmet Türü</label>
                            <select value={order.item_type} onChange={e => updateOrder(order.id, { item_type: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                              {Object.entries(ITEM_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Durum</label>
                            <select value={order.status} onChange={e => updateOrder(order.id, { status: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                              {Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Ürün / Hizmet Açıklaması</label>
                          <textarea value={order.item_description} onChange={e => updateOrder(order.id, { item_description: e.target.value })}
                            rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Marka, model, özellikler..." />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Miktar</label>
                            <input type="text" value={order.quantity} onChange={e => updateOrder(order.id, { quantity: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" placeholder="1" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Birim</label>
                            <input type="text" value={order.unit} onChange={e => updateOrder(order.id, { unit: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" placeholder="adet, kg..." />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Talep Tarihi</label>
                            <input type="date" value={order.order_date || ''} onChange={e => updateOrder(order.id, { order_date: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Talep Eden</label>
                            <input type="text" value={order.requested_by} onChange={e => updateOrder(order.id, { requested_by: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" placeholder="Ad Soyad" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Onaylayan</label>
                            <input type="text" value={order.approved_by} onChange={e => updateOrder(order.id, { approved_by: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" placeholder="Şirket Müdürü" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Teslim Tarihi</label>
                            <input type="date" value={order.received_date || ''} onChange={e => updateOrder(order.id, { received_date: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Özel Gereksinimler</label>
                          <textarea value={order.special_requirements} onChange={e => updateOrder(order.id, { special_requirements: e.target.value })}
                            rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Kalibrasyon sertifikası, şartname, özel değer vb..." />
                        </div>

                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={order.requires_calibration_cert}
                              onChange={e => updateOrder(order.id, { requires_calibration_cert: e.target.checked })}
                              className="w-3.5 h-3.5 accent-orange-600" />
                            <span className="text-[11px] font-medium text-slate-600">Kalibrasyon Sertifikası İsteniyor</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={order.requires_training}
                              onChange={e => updateOrder(order.id, { requires_training: e.target.checked })}
                              className="w-3.5 h-3.5 accent-orange-600" />
                            <span className="text-[11px] font-medium text-slate-600">Eğitim Talep Ediliyor</span>
                          </label>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3 bg-white">
                          <p className="text-[10px] font-semibold text-slate-600 mb-2 uppercase">Girdi Kontrolü (§5.1)</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Kontrol Sonucu</label>
                              <select value={order.inspection_result} onChange={e => updateOrder(order.id, { inspection_result: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                                <option value="">Henüz Yapılmadı</option>
                                <option value="pass">Uygun</option>
                                <option value="fail">Uygun Değil</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Kontrol Tarihi</label>
                              <input type="date" value={order.inspection_date || ''} onChange={e => updateOrder(order.id, { inspection_date: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Kontrol Eden</label>
                              <input type="text" value={order.inspected_by} onChange={e => updateOrder(order.id, { inspected_by: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" placeholder="Ad Soyad" />
                            </div>
                          </div>
                          <div className="mt-2">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Kontrol Notu</label>
                            <textarea value={order.inspection_notes} onChange={e => updateOrder(order.id, { inspection_notes: e.target.value })}
                              rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                              placeholder="Kontrol detayları, uygunsuzluklar..." />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
