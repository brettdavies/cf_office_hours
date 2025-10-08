/**
 * Coordinator Matching Page
 *
 * Allows coordinators to find and review recommended mentor-mentee matches
 * with algorithm comparison. This page consumes pre-calculated match scores
 * from the match cache (Stories 0.22-0.25).
 */

// External dependencies
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Internal modules
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UserSelector } from '@/components/coordinator/UserSelector';
import { AlgorithmSelector } from '@/components/coordinator/AlgorithmSelector';
import { MatchResultsGrid } from '@/components/coordinator/MatchResultsGrid';
import { MatchExplanationModal } from '@/components/coordinator/MatchExplanationModal';
import { useAuth } from '@/hooks/useAuth';
import { useFindMatches, useGetAlgorithms } from '@/hooks/useMatching';

export function CoordinatorMatchingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState<'mentor' | 'mentee'>('mentee');
  const [algorithmVersion, setAlgorithmVersion] = useState<string>('tag-based-v1');
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [explainUserId1, setExplainUserId1] = useState<string | null>(null);
  const [explainUserId2, setExplainUserId2] = useState<string | null>(null);

  // Fetch available algorithms
  const { data: algorithmsData } = useGetAlgorithms();

  // Fetch matches using the custom hook
  const { data: matchesData, isLoading: isLoadingMatches } = useFindMatches(
    selectedUserId,
    targetRole,
    algorithmVersion
  );

  // Auto-select algorithm on load
  useEffect(() => {
    if (algorithmsData?.algorithms && algorithmsData.algorithms.length > 0) {
      // If only one algorithm, use it
      if (algorithmsData.algorithms.length === 1) {
        setAlgorithmVersion(algorithmsData.algorithms[0].version);
        if (import.meta.env.DEV) {
          console.log('[CoordinatorMatching] Auto-selected single algorithm', {
            version: algorithmsData.algorithms[0].version,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // If multiple algorithms, use first alphabetically
        const sortedAlgorithms = [...algorithmsData.algorithms].sort((a, b) =>
          a.version.localeCompare(b.version)
        );
        setAlgorithmVersion(sortedAlgorithms[0].version);
        if (import.meta.env.DEV) {
          console.log('[CoordinatorMatching] Auto-selected first alphabetical algorithm', {
            version: sortedAlgorithms[0].version,
            totalAlgorithms: algorithmsData.algorithms.length,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }, [algorithmsData]);

  // Dev logging: Page load
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[CoordinatorMatching] Page loaded', {
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // Redirect if not coordinator
  useEffect(() => {
    if (!isLoading && user && user.role !== 'coordinator') {
      if (import.meta.env.DEV) {
        console.log('[CoordinatorMatching] Non-coordinator access denied, redirecting', {
          role: user.role,
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
      }
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  // Dev logging: User selection change
  useEffect(() => {
    if (selectedUserId && import.meta.env.DEV) {
      console.log('[CoordinatorMatching] User selected', {
        userId: selectedUserId,
        targetRole,
        timestamp: new Date().toISOString(),
      });
    }
  }, [selectedUserId, targetRole]);

  // Dev logging: Algorithm change
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[CoordinatorMatching] Algorithm changed', {
        version: algorithmVersion,
        timestamp: new Date().toISOString(),
      });
    }
  }, [algorithmVersion]);

  // Handle user selection change
  const handleUserChange = (userId: string, newTargetRole: 'mentor' | 'mentee') => {
    setSelectedUserId(userId);
    setTargetRole(newTargetRole);
  };

  // Handle algorithm change
  const handleAlgorithmChange = (version: string) => {
    setAlgorithmVersion(version);
  };

  // Handle explain match click
  const handleExplainMatch = (userId1: string, userId2: string) => {
    setExplainUserId1(userId1);
    setExplainUserId2(userId2);
    setExplainModalOpen(true);
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not coordinator (will redirect)
  if (!user || user.role !== 'coordinator') {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Card>
        <CardHeader>
          <h1 className="text-3xl font-bold">Find Matches</h1>
          <p className="text-muted-foreground">
            Find and review recommended mentor-mentee matches with algorithm comparison
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Algorithm Selector - moved to top */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Algorithm</h2>
              <AlgorithmSelector value={algorithmVersion} onChange={handleAlgorithmChange} />
            </div>

            {/* User Selection */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Select User</h2>
              <UserSelector
                value={selectedUserId}
                onChange={handleUserChange}
                algorithmVersion={algorithmVersion}
              />
            </div>

            {/* Match Results */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Match Results</h2>
              <MatchResultsGrid
                matches={matchesData?.matches || []}
                isLoading={isLoadingMatches}
                onExplainMatch={handleExplainMatch}
                selectedUserId={selectedUserId}
                algorithmVersion={algorithmVersion}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Explanation Modal */}
      <MatchExplanationModal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        userId1={explainUserId1}
        userId2={explainUserId2}
        algorithmVersion={algorithmVersion}
      />
    </div>
  );
}

export default CoordinatorMatchingPage;
