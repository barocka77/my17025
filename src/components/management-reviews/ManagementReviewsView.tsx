import { useState, useEffect } from 'react';
import { Presentation, Plus, CreditCard as Edit2, Trash2, Calendar, Users, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ManagementReviewModal from './ManagementReviewModal';
import ManagementReviewDetailView from './ManagementReviewDetailView';

interface Review {
  id: string;
  meeting_year: number;
  meeting_no: string;
  meeting_type: string;
  meeting_date: string | null;
  meeting_location: string;
  status: string;
  chairperson: string;
  participants: string[];
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  planned: { label: 'Planlandı', color: 'bg-slate-100 text-slate-600', icon: Clock },
  in_progress: { label: 'Devam Ediyor', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

export default function ManagementReviewsView() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<Review | undefined>(undefined);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    try {
      const { data } = await supabase
        .from('management_reviews')
        .select('id, meeting_year, meeting_no, meeting_type, meeting_date, meeting_location, status, chairperson, participants, created_at')
        .order('meeting_date', { ascending: false, nullsFirst: false })
        .order('meeting_no', { ascending: false });
      setReviews(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu YGG toplantısını ve tüm ilgili verileri silmek istediğinize emin misiniz?')) return;
    await supabase.from('management_reviews').delete().eq('id', id);
    fetchReviews();
  };

  const years = [...new Set(reviews.map(r => r.meeting_year))].sort((a, b) => b - a);
  const filtered = filterYear === 'all' ? reviews : reviews.filter(r => r.meeting_year === filterYear);

  const stats = {
    total: reviews.length,
    planned: reviews.filter(r => r.status === 'planned').length,
    in_progress: reviews.filter(r => r.status === 'in_progress').length,
    completed: reviews.filter(r => r.status === 'completed').length,
  };

  if (selectedReview) {
    return (
      <ManagementReviewDetailView
        review={selectedReview}
        onBack={() => { setSelectedReview(null); fetchReviews(); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 pt-16 md:pt-5 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Yönetimin Gözden Geçirmesi</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">PR01.10 Rev.01 — FR.19 / FR.20 — TS EN ISO/IEC 17025 §8.9</p>
          </div>
          <button
            onClick={() => { setEditData(undefined); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-800 transition-all font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni YGG Toplantısı
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Presentation className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Toplam</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Planlandı</span>
            </div>
            <div className="text-2xl font-bold">{stats.planned}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Devam Eden</span>
            </div>
            <div className="text-2xl font-bold">{stats.in_progress}</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Tamamlandı</span>
            </div>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </div>
        </div>

        {years.length > 1 && (
          <div className="flex gap-1 mt-4 flex-wrap">
            <button
              onClick={() => setFilterYear('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filterYear === 'all' ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Tümü
            </button>
            {years.map(y => (
              <button
                key={y}
                onClick={() => setFilterYear(y)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filterYear === y ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
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
              <Presentation className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-600 font-medium text-sm">Henüz YGG toplantısı kaydı yok</p>
              <p className="text-slate-400 text-[11px] mt-1">Yönetimin Gözden Geçirmesi toplantısı planlamak için butonu kullanın</p>
            </div>
          ) : (
            filtered.map(review => {
              const sc = STATUS_CONFIG[review.status] || STATUS_CONFIG.planned;
              const StatusIcon = sc.icon;
              return (
                <div key={review.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-emerald-700">{review.meeting_year}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {review.meeting_no && (
                          <span className="text-[12px] font-bold text-slate-700">{review.meeting_no}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {sc.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          review.meeting_type === 'periodic' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {review.meeting_type === 'periodic' ? 'Periyodik' : 'Olağanüstü'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {review.meeting_date && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(review.meeting_date).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                        {review.chairperson && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Users className="w-3 h-3" />
                            {review.chairperson}
                          </span>
                        )}
                        {review.meeting_location && (
                          <span className="text-[10px] text-slate-500">{review.meeting_location}</span>
                        )}
                      </div>
                      {(review.participants || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {review.participants.slice(0, 4).map((p: string) => (
                            <span key={p} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{p}</span>
                          ))}
                          {review.participants.length > 4 && (
                            <span className="text-[10px] text-slate-400">+{review.participants.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setEditData(review); setIsModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(review.id); }}
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-800 transition-colors"
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

      <ManagementReviewModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditData(undefined); }}
        onSuccess={fetchReviews}
        editData={editData}
      />
    </div>
  );
}
