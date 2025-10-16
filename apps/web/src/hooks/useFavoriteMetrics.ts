/**
 * useFavoriteMetrics Hook
 *
 * Manages favorite/starred metrics and charts with localStorage persistence.
 * Provides methods to toggle favorites and check if a metric is favorited.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'coordinator-favorite-metrics';

export function useFavoriteMetrics() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(new Set(parsed));
      }
    } catch (error) {
      console.error('Failed to load favorite metrics from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites)));
      } catch (error) {
        console.error('Failed to save favorite metrics to localStorage:', error);
      }
    }
  }, [favorites, isLoaded]);

  const toggleFavorite = useCallback((metricId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (metricId: string) => {
      return favorites.has(metricId);
    },
    [favorites]
  );

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    isLoaded,
  };
}
