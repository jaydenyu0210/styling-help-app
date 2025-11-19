"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, X } from 'lucide-react';

type Outfit = {
  id: string;
  outfit_images: string[];
  selected_items: string[] | null;
  outfit_score: number | null;
  pros: string | null;
  cons: string | null;
  suggestion: string | null;
  created_at: string;
};

export default function OutfitsPage() {
  const { user } = useAuth();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Outfit | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOutfits = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('outfits')
        .select('id, outfit_images, selected_items, outfit_score, pros, cons, suggestion, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      setOutfits(Array.isArray(data) ? data as any : []);
      setIsLoading(false);
    };
    fetchOutfits();
  }, [user?.id]);

  // Real-time subscriptions: reflect inserts and deletes immediately
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`outfits-changes-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'outfits',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const row = payload.new as any;
        setOutfits((prev) => [{
          id: row.id,
          outfit_images: row.outfit_images || [],
          selected_items: row.selected_items || [],
          outfit_score: row.outfit_score,
          pros: row.pros,
          cons: row.cons,
          suggestion: row.suggestion,
          created_at: row.created_at
        }, ...prev]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'outfits',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const row = payload.old as any;
        setOutfits((prev) => prev.filter(o => o.id !== row.id));
      })
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  }, [user?.id]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    const original = document.body.style.overflow;
    if (selected) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = original;
    };
  }, [selected]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]">
      <div className="bg-white dark:bg-neutral-dark border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Saved Outfits</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Your saved analyses and photos.</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-200 px-4 py-3">{error}</div>
        )}
        {isLoading ? (
          <div className="text-slate-600 dark:text-slate-300">Loading...</div>
        ) : outfits.length === 0 ? (
          <div className="text-slate-600 dark:text-slate-300">No outfits saved yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {outfits.map((o) => (
              <div key={o.id} className="relative bg-white dark:bg-neutral-dark rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <button
                  aria-label="Delete outfit"
                  className="absolute top-3 right-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-neutral-darker/50"
                  disabled={isDeletingId === o.id}
                  onClick={async () => {
                    if (!confirm('Delete this outfit?')) return;
                    setIsDeletingId(o.id);
                    const { error: delErr } = await supabase.from('outfits').delete().eq('id', o.id);
                    if (delErr) {
                      setError(delErr.message);
                    } else {
                      setOutfits((prev) => prev.filter((x) => x.id !== o.id));
                      // Fire-and-forget edge function (optional), ignore failures
                      try {
                        await supabase.functions.invoke('outfit-event', {
                          body: { type: 'deleted', outfitId: o.id, userId: user?.id }
                        });
                      } catch {}
                    }
                    setIsDeletingId(null);
                  }}
                >
                  <Trash2 className="h-5 w-5 text-slate-500" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {o.outfit_images?.slice(0,3).map((src, i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                      <img src={src} alt="outfit" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const total = 10;
                      const filled = Math.max(0, Math.min(total, Math.round(o.outfit_score || 0)));
                      return (
                        <>
                          <div className="text-amber-400 text-lg" aria-label={`score-${filled}-of-${total}`}>
                            {Array.from({ length: total }).map((_, i) => (
                              <span key={i}>{i < filled ? '★' : '☆'}</span>
                            ))}
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-300">{filled}/10</span>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-neutral-darker"
                    onClick={() => setSelected(o)}
                  >
                    Details
                  </button>
                </div>

                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Saved {new Date(o.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative z-10 max-w-3xl w-full mx-4 bg-white dark:bg-neutral-dark rounded-xl border border-slate-200 dark:border-slate-700 p-5 max-h-[90vh] overflow-y-auto">
            <button
              aria-label="Close details"
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-neutral-darker/50"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Outfit Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {selected.outfit_images?.slice(0,3).map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <img src={src} alt="outfit" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              {(() => {
                const total = 10;
                const filled = Math.max(0, Math.min(total, Math.round(selected.outfit_score || 0)));
                return (
                  <>
                    <div className="text-amber-400 text-lg" aria-label={`score-${filled}-of-${total}`}>
                      {Array.from({ length: total }).map((_, i) => (
                        <span key={i}>{i < filled ? '★' : '☆'}</span>
                      ))}
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{filled}/10</span>
                  </>
                );
              })()}
            </div>

            {selected.selected_items && selected.selected_items.length > 0 && (
              <div className="mb-3 text-sm text-slate-700 dark:text-slate-200">
                <div className="font-medium mb-1">Selected items:</div>
                <ul className="list-disc pl-5 space-y-1">
                  {selected.selected_items.map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>
              </div>
            )}

            {selected.pros && (
              <div className="mb-3">
                <div className="font-medium text-slate-900 dark:text-white">Pros</div>
                <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{selected.pros}</pre>
              </div>
            )}
            {selected.cons && (
              <div className="mb-3">
                <div className="font-medium text-slate-900 dark:text-white">Cons</div>
                <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{selected.cons}</pre>
              </div>
            )}
            {selected.suggestion && (
              <div className="mb-1">
                <div className="font-medium text-slate-900 dark:text-white">Suggestion</div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selected.suggestion}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


