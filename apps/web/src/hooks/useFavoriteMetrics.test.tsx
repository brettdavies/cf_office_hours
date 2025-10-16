/**
 * Tests for useFavoriteMetrics Hook
 *
 * Tests localStorage-based favorite metrics management.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFavoriteMetrics } from './useFavoriteMetrics';

describe('useFavoriteMetrics', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty favorites', () => {
    const { result } = renderHook(() => useFavoriteMetrics());

    expect(result.current.isFavorite('test-metric')).toBe(false);
  });

  it('should load favorites from localStorage on mount', () => {
    localStorage.setItem('coordinator-favorite-metrics', JSON.stringify(['metric1', 'metric2']));

    const { result } = renderHook(() => useFavoriteMetrics());

    expect(result.current.isFavorite('metric1')).toBe(true);
    expect(result.current.isFavorite('metric2')).toBe(true);
    expect(result.current.isFavorite('metric3')).toBe(false);
  });

  it('should add metric to favorites', () => {
    const { result } = renderHook(() => useFavoriteMetrics());

    act(() => {
      result.current.toggleFavorite('test-metric');
    });

    expect(result.current.isFavorite('test-metric')).toBe(true);
  });

  it('should remove metric from favorites', () => {
    const { result } = renderHook(() => useFavoriteMetrics());

    // Add favorite
    act(() => {
      result.current.toggleFavorite('test-metric');
    });

    expect(result.current.isFavorite('test-metric')).toBe(true);

    // Remove favorite
    act(() => {
      result.current.toggleFavorite('test-metric');
    });

    expect(result.current.isFavorite('test-metric')).toBe(false);
  });

  it('should persist favorites to localStorage', () => {
    const { result } = renderHook(() => useFavoriteMetrics());

    act(() => {
      result.current.toggleFavorite('metric1');
      result.current.toggleFavorite('metric2');
    });

    const stored = JSON.parse(localStorage.getItem('coordinator-favorite-metrics') || '[]');
    expect(stored).toContain('metric1');
    expect(stored).toContain('metric2');
  });

  it('should handle multiple toggles correctly', () => {
    const { result } = renderHook(() => useFavoriteMetrics());

    act(() => {
      result.current.toggleFavorite('metric1');
      result.current.toggleFavorite('metric2');
      result.current.toggleFavorite('metric1'); // Remove
      result.current.toggleFavorite('metric3');
    });

    expect(result.current.isFavorite('metric1')).toBe(false);
    expect(result.current.isFavorite('metric2')).toBe(true);
    expect(result.current.isFavorite('metric3')).toBe(true);
  });

  it('should handle invalid localStorage data gracefully', () => {
    localStorage.setItem('coordinator-favorite-metrics', 'invalid-json');

    const { result } = renderHook(() => useFavoriteMetrics());

    // Should initialize with empty array if parse fails
    expect(result.current.isFavorite('any-metric')).toBe(false);

    // Should still allow adding favorites
    act(() => {
      result.current.toggleFavorite('new-metric');
    });

    expect(result.current.isFavorite('new-metric')).toBe(true);
  });

  it('should persist state across hook re-renders', () => {
    const { result, rerender } = renderHook(() => useFavoriteMetrics());

    act(() => {
      result.current.toggleFavorite('persistent-metric');
    });

    rerender();

    expect(result.current.isFavorite('persistent-metric')).toBe(true);
  });
});
