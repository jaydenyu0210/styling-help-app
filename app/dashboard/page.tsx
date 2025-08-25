"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useTrialStatus } from '@/hooks/useTrialStatus';

const AUTH_TIMEOUT = 15000; // 15 seconds

export default function Dashboard() {

  
  const { user, isSubscriber, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { subscription, isLoading: isSubLoading, fetchSubscription } = useSubscription();
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { isInTrial, isLoading: isTrialLoading } = useTrialStatus();
  const [authTimeout, setAuthTimeout] = useState(false);

  // Local state for outfit workflow
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzingItems, setIsAnalyzingItems] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [pros, setPros] = useState<string | null>(null);
  const [cons, setCons] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // First check - Subscription and trial check
  useEffect(() => {
    if (isSubLoading || isTrialLoading) return;
    
    const hasValidSubscription = ['active', 'trialing'].includes(subscription?.status || '');
    
    console.log('Access check isInTrial:', {
      hasSubscription: !!subscription,
      status: subscription?.status,
      isInTrial: isInTrial,
      validUntil: subscription?.current_period_end
    });

    // Only redirect if there's no valid subscription AND no valid trial
    if (!hasValidSubscription && !isInTrial) {
      console.log('No valid subscription or trial, redirecting');
      router.replace('/profile');
    }
  }, [subscription, isSubLoading, isTrialLoading, router, isInTrial]);

  // Second check - Auth check
  useEffect(() => {
    if (isAuthLoading || isTrialLoading) return;

    console.log('Access check:', {
      isSubscriber,
      hasCheckedSubscription,
      isInTrial: isInTrial,
      authLoading: isAuthLoading,
    });

    if (!hasCheckedSubscription) {
      setHasCheckedSubscription(true);
      
      // Allow access for both subscribers and trial users
      if (!user || (!isSubscriber && !isInTrial && !isAuthLoading)) {
        console.log('No valid subscription or trial, redirecting');
        router.replace('/profile');
      }
    }
  }, [isSubscriber, isAuthLoading, hasCheckedSubscription, router, user, subscription, isTrialLoading, isInTrial]);

  // Add refresh effect
  useEffect(() => {
    const refreshSubscription = async () => {
      await fetchSubscription();
      setHasCheckedSubscription(true);
    };
    
    if (user?.id) {
      refreshSubscription();
    }
  }, [user?.id, fetchSubscription]);

  useEffect(() => {
    if (user?.id) {
      // Check if user has completed onboarding
      const checkOnboarding = async () => {
        const { data } = await supabase
          .from('user_preferences')
          .select('has_completed_onboarding')
          .eq('user_id', user.id)
          .single();
        
        setHasCompletedOnboarding(!!data?.has_completed_onboarding);
        console.log('hasCompletedOnboarding: ', hasCompletedOnboarding)
      };
      
      checkOnboarding();
    }
  }, [user?.id, hasCompletedOnboarding]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user && (isAuthLoading || isTrialLoading)) {
        setAuthTimeout(true);
      }
    }, AUTH_TIMEOUT);
    
    return () => clearTimeout(timer);
  }, [user, isAuthLoading, isTrialLoading]);

  // Helpers
  const canFinishUpload = useMemo(() => files.length >= 1 && files.length <= 3, [files.length]);
  const selectableItems = useMemo(() => detectedItems.map((i) => ({ name: i, selected: !!selectedItems[i] })), [detectedItems, selectedItems]);
  const canAnalyzeStyle = useMemo(() => selectableItems.some((i) => i.selected), [selectableItems]);

  const handleAddFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (files.length >= 3) {
      setError('You can upload up to 3 images.');
      event.target.value = '';
      return;
    }
    const nextFiles = [...files, file];
    const nextPreviews = [...previews, URL.createObjectURL(file)];
    setFiles(nextFiles);
    setPreviews(nextPreviews);
    // Reset downstream state when photos change
    setDetectedItems([]);
    setSelectedItems({});
    setScore(null);
    setPros(null);
    setCons(null);
    setSuggestion(null);
    // allow selecting the same file name again later
    event.target.value = '';
  };

  const removePhotoAtIndex = (index: number) => {
    const nextFiles = files.filter((_, i) => i !== index);
    const nextPreviews = previews.filter((_, i) => i !== index);
    setFiles(nextFiles);
    setPreviews(nextPreviews);
    // Reset downstream state when photos change
    setDetectedItems([]);
    setSelectedItems({});
    setScore(null);
    setPros(null);
    setCons(null);
    setSuggestion(null);
  };

  const fileToCompressedDataUrl = (file: File, maxSize = 1024, quality = 0.7) => new Promise<string>((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const fileToCompressedBlob = (file: File, maxSize = 1600, quality = 0.85) => new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const analyzeClothingItems = async () => {
    if (!canFinishUpload) {
      setError("Please upload 1 to 3 images.");
      return;
    }
    setIsAnalyzingItems(true);
    setError(null);
    try {
      const urls = await Promise.all(files.map((f) => fileToCompressedDataUrl(f)));
      setDataUrls(urls);
      const res = await fetch('/api/analyze/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: urls }),
      });
      if (!res.ok) {
        const err = await res.json().catch(async () => ({ details: await res.text().catch(() => '') }));
        throw new Error(`${err?.error || 'Failed to analyze images.'}${err?.details ? `: ${err.details}` : ''}`);
      }
      const json = await res.json();
      const items: string[] = Array.isArray(json.items) ? json.items : [];
      if (!items.length) {
        setDetectedItems([]);
        setSelectedItems({});
        setError("We couldn't recognize any clothing items. Please upload clothing-related photos (clear garments or full outfit). ");
        return;
      }
      setDetectedItems(items);
      setSelectedItems(items.reduce((acc, cur) => ({ ...acc, [cur]: true }), {}));
    } finally {
      setIsAnalyzingItems(false);
    }
  };

  const analyzeStylingTaste = async () => {
    if (!canAnalyzeStyle) return;
    setIsScoring(true);
    setScore(null);
    setPros(null);
    setCons(null);
    setSuggestion(null);
    try {
      const chosen = Object.keys(selectedItems).filter((k) => selectedItems[k]);
      const urls = dataUrls.length ? dataUrls : await Promise.all(files.map((f) => fileToCompressedDataUrl(f)));
      if (!urls.length) {
        setError('No images available to analyze.');
        return;
      }
      const res = await fetch('/api/analyze/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: urls, selectedItems: chosen }),
      });
      if (!res.ok) {
        const err = await res.json().catch(async () => ({ details: await res.text().catch(() => '') }));
        throw new Error(`${err?.error || 'Failed to score outfit.'}${err?.details ? `: ${err.details}` : ''}`);
      }
      const json = await res.json();
      setScore(json.score ?? null);
      setPros(json.pros ?? null);
      setCons(json.cons ?? null);
      setSuggestion(json.suggestion ?? null);
    } finally {
      setIsScoring(false);
    }
  };

  const saveOutfit = async () => {
    if (!user?.id) {
      setError("You must be logged in to save outfits.");
      return;
    }
    if (!files.length || !score) {
      setError("Upload photos and analyze style before saving.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);
    const withTimeout = async (promise: Promise<any>, ms = 30000, label = 'operation'): Promise<any> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
        promise.then((res) => { clearTimeout(timer); resolve(res); }).catch((err) => { clearTimeout(timer); reject(err); });
      });
    };
    try {
      const uploadedPaths: string[] = await Promise.all(
        files.map(async (file) => {
          const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
          const blob = await fileToCompressedBlob(file, 1400, 0.8);
          const { error } = await supabase.storage
            .from('outfits')
            .upload(path, blob, { upsert: false, contentType: 'image/jpeg' });
          if (error) throw error;
          return path;
        })
      );
      const publicUrls = uploadedPaths.map((p) => supabase.storage.from('outfits').getPublicUrl(p).data.publicUrl);
      const chosen = Object.keys(selectedItems).filter((k) => selectedItems[k]);
      const insertRes = await supabase.from('outfits').insert({
        user_id: user.id,
        outfit_images: publicUrls,
        selected_items: chosen,
        outfit_score: score,
        pros,
        cons,
        suggestion
      }).select();
      if (insertRes.error) throw insertRes.error;
      setSaveSuccess('Outfit saved successfully.');
      // Optionally clear state after save
      // setFiles([]); setPreviews([]); setDetectedItems([]); setSelectedItems({});
    } catch (e: any) {
      setError(e?.message || 'Failed to save outfit.');
    } finally {
      setIsSaving(false);
    }
  };

  // Update the loading check
  if (!user && (isAuthLoading || isTrialLoading) && !hasCheckedSubscription) {
    console.log('user: ', user)
    console.log('isAuthLoading: ', isAuthLoading)
    console.log('hasCheckedSubscription: ', hasCheckedSubscription)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mb-4 mx-auto"></div>
          <p className="text-foreground">
            {authTimeout ? 
              "Taking longer than usual? Try refreshing the page 😊." :
              "Verifying access..."}
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]">
      <div className="bg-white dark:bg-neutral-dark border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Outfit Analyzer</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Upload 1-3 photos, detect items, analyze style, and save.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-200 px-4 py-3">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-md bg-green-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-200 px-4 py-3">
            {saveSuccess}
          </div>
        )}

        <div className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Upload Photos</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Minimum 1, maximum 3 images.</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleAddFile}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 dark:file:bg-primary-light/10 file:text-primary dark:file:text-primary-light hover:file:bg-primary/20 dark:hover:file:bg-primary-light/20"
          />

          {previews.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removePhotoAtIndex(idx)}
                    className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              disabled={!canFinishUpload || isAnalyzingItems}
              onClick={analyzeClothingItems}
              className={`px-4 py-2 rounded-md text-white ${canFinishUpload && !isAnalyzingItems ? 'bg-primary hover:bg-primary/90' : 'bg-slate-400 cursor-not-allowed'}`}
            >
              {isAnalyzingItems ? 'Analyzing...' : 'Finish upload'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. Select Clothing Items</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Check at least one item to analyze.</p>
          {detectedItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No items detected yet.</p>
          ) : (
            <div className="space-y-2">
              {selectableItems.map(({ name, selected }) => (
                <label key={name} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => setSelectedItems((prev) => ({ ...prev, [name]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-slate-900 dark:text-white">{name}</span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              disabled={!canAnalyzeStyle || isScoring}
              onClick={analyzeStylingTaste}
              className={`px-4 py-2 rounded-md text-white ${canAnalyzeStyle && !isScoring ? 'bg-primary hover:bg-primary/90' : 'bg-slate-400 cursor-not-allowed'}`}
            >
              {isScoring ? 'Scoring...' : 'Analyze styling taste'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Results</h2>
          {score == null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No results yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-700 dark:text-slate-200 text-sm">Score:</span>
                <div className="text-amber-400" aria-label={`score-${score}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < score ? '★' : '☆'}</span>
                  ))}
                </div>
              </div>
              {pros && (
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Pros</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{pros}</p>
                </div>
              )}
              {cons && (
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Cons</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{cons}</p>
                </div>
              )}
              {suggestion && (
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Suggestion</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{suggestion}</p>
                </div>
              )}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveOutfit}
                  disabled={!score || isSaving || files.length === 0}
                  className={`px-4 py-2 rounded-md text-white ${score && files.length > 0 && !isSaving ? 'bg-primary hover:bg-primary/90' : 'bg-slate-400 cursor-not-allowed'}`}
                >
                  {isSaving ? 'Saving...' : 'Save outfit'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}