"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Upload, Star, TrendingUp, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  console.log('Dashboard: Component rendered, isLoading:', isAuthLoading, 'user:', !!user);

  // Use useEffect for redirect to avoid React render error
  useEffect(() => {
    if (!isAuthLoading && !user) {
      console.log('Dashboard: No user found, redirecting to login')
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  // Show loading while auth is initializing
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-300">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // If no user after loading is complete, show loading while redirect happens
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-300">
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  console.log('Dashboard: Rendering dashboard for user:', user?.email);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]">
      {/* Dashboard Header */}
      <div className="bg-white dark:bg-neutral-dark border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Style Analysis Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Welcome, {user?.user_metadata?.full_name || user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Outfits</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Average Rating</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">-</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Style Score</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">-</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Upload New Outfit
            </h2>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Upload your outfit photos
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Drag and drop your images here, or click to browse
              </p>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Choose Files
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Calendar className="h-5 w-5 text-slate-400 mr-3" />
                <div>
                  <p className="text-slate-900 dark:text-white font-medium">No recent activity</p>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">Upload your first outfit to get started</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <h3 className="font-medium text-slate-900 dark:text-white mb-1">Style Analysis</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Get AI feedback on your outfit</p>
            </button>
            <button className="p-4 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <h3 className="font-medium text-slate-900 dark:text-white mb-1">Style Trends</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Discover current fashion trends</p>
            </button>
            <button className="p-4 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <h3 className="font-medium text-slate-900 dark:text-white mb-1">Wardrobe Tips</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Learn styling best practices</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}