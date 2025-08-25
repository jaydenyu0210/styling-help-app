"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
              <div key={o.id} className="bg-white dark:bg-neutral-dark rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {o.outfit_images?.slice(0,3).map((src, i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                      <img src={src} alt="outfit" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-medium">Score:</span> {o.outfit_score ?? 'N/A'}
                  </div>
                  {o.selected_items && o.selected_items.length > 0 && (
                    <div className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">Selected items:</span> {o.selected_items.join(', ')}
                    </div>
                  )}
                  {o.pros && (
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Pros</div>
                      <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{o.pros}</pre>
                    </div>
                  )}
                  {o.cons && (
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Cons</div>
                      <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{o.cons}</pre>
                    </div>
                  )}
                  {o.suggestion && (
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Suggestion</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{o.suggestion}</p>
                    </div>
                  )}
                  <div className="text-xs text-slate-500 dark:text-slate-400">Saved {new Date(o.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


