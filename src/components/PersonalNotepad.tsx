import { useState, useEffect } from 'react';
import { X, Plus, CreditCard as Edit2, Trash2, Save, StickyNote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function PersonalNotepad() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('personal_notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTitleFromContent = (content: string): string => {
    const trimmed = content.trim();
    if (!trimmed) return 'Başlıksız Not';

    const stopWords = new Set([
      've', 'veya', 'ile', 'bir', 'bu', 'şu', 'o', 'da', 'de', 'ki', 'mi', 'mu', 'mü',
      'ama', 'fakat', 'lakin', 'ancak', 'için', 'gibi', 'kadar', 'daha', 'çok', 'az',
      'en', 'her', 'hiç', 'bazı', 'tüm', 'bütün', 'olan', 'olarak', 'olan', 'olan',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is',
      'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would',
    ]);

    const allText = trimmed.replace(/[#*_`~\-]/g, ' ');
    const sentences = allText.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
    const firstSentence = sentences[0] || '';

    const words = firstSentence
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-ZÇçĞğİıÖöŞşÜü0-9]/g, ''))
      .filter(w => w.length > 2 && !stopWords.has(w.toLocaleLowerCase('tr-TR')));

    if (words.length === 0) {
      return firstSentence.slice(0, 50) || 'Başlıksız Not';
    }

    const keyWords = words.slice(0, 5);
    const title = keyWords.join(' ');
    return title.charAt(0).toLocaleUpperCase('tr-TR') + title.slice(1);
  };

  const createNote = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('personal_notes')
        .insert([
          {
            user_id: user.id,
            title: 'Yeni Not',
            content: '',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setSelectedNote(data);
      setEditTitle(data.title);
      setEditContent(data.content);
      setIsEditing(true);
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateNote = async () => {
    if (!selectedNote) return;

    const autoTitle = generateTitleFromContent(editContent);
    const finalTitle = editTitle && editTitle !== 'Yeni Not' ? editTitle : autoTitle;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('personal_notes')
        .update({
          title: finalTitle,
          content: editContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedNote.id);

      if (error) throw error;

      const updatedNote = {
        ...selectedNote,
        title: finalTitle,
        content: editContent,
        updated_at: new Date().toISOString(),
      };

      setNotes(notes.map(n => n.id === selectedNote.id ? updatedNote : n));
      setSelectedNote(updatedNote);
      setEditTitle(finalTitle);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Bu notu silmek istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('personal_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
    }
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="h-full flex bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-800">Notlarım</h2>
            </div>
            <button
              onClick={createNote}
              disabled={saving}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              title="Yeni Not"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600">Kişisel notlarınız sadece size görünür</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-3 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : notes.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <StickyNote className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">Henüz not yok</p>
              <p className="text-xs mt-1">Başlamak için yukarıdaki + butonuna tıklayın</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notes.map(note => (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedNote?.id === note.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-slate-800 text-sm line-clamp-1">
                      {note.title || 'Başlıksız Not'}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                    {note.content || 'İçerik yok'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatDate(note.updated_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-lg font-semibold text-slate-800 bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Not başlığı"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold text-slate-800">
                      {selectedNote.title || 'Başlıksız Not'}
                    </h3>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Son güncelleme: {formatDate(selectedNote.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm"
                      >
                        İptal
                      </button>
                      <button
                        onClick={updateNote}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                      >
                        <Save className="w-4 h-4" />
                        Kaydet
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startEditing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Düzenle
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    if (!editTitle || editTitle === 'Yeni Not' || editTitle === selectedNote?.title) {
                      setEditTitle(generateTitleFromContent(e.target.value));
                    }
                  }}
                  className="w-full h-full min-h-[400px] bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Notunuzu buraya yazın..."
                />
              ) : (
                <div className="prose prose-slate max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                    {selectedNote.content || 'Bu not boş'}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <StickyNote className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">Not Seçilmedi</p>
              <p className="text-sm mt-2">Sol taraftan bir not seçin veya yeni bir not oluşturun</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
