'use client';

import React, { useState } from 'react';
import { Badge } from '../ui/Badge';

interface EvidenceTagControlProps {
  nodeId: string;
}

export function EvidenceTagControl({ nodeId }: EvidenceTagControlProps) {
  const [tag, setTag] = useState<'accepted' | 'rejected' | 'needs_review' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTag = async (selectedTag: 'accepted' | 'rejected' | 'needs_review') => {
    setIsSubmitting(true);
    setError(null);
    const previous = tag;
    setTag(selectedTag); // optimistic update

    try {
      const res = await fetch(`/api/v1/evidence-nodes/${nodeId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: selectedTag }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to submit feedback');
      }
    } catch (err) {
      setTag(previous); // revert optimistic update on failure
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[EvidenceTagControl] Failed to POST feedback for node ${nodeId}:`, err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary mr-1">Feedback:</span>
        <button
          onClick={() => handleTag('accepted')}
          disabled={isSubmitting}
          className={`transition-opacity ${tag && tag !== 'accepted' ? 'opacity-50' : 'opacity-100 hover:opacity-80'}`}
        >
          <Badge variant={tag === 'accepted' ? 'success' : 'default'} className="cursor-pointer">
            {tag === 'accepted' ? '✓ Accepted' : 'Accept'}
          </Badge>
        </button>

        <button
          onClick={() => handleTag('needs_review')}
          disabled={isSubmitting}
          className={`transition-opacity ${tag && tag !== 'needs_review' ? 'opacity-50' : 'opacity-100 hover:opacity-80'}`}
        >
          <Badge variant={tag === 'needs_review' ? 'warning' : 'default'} className="cursor-pointer">
            {tag === 'needs_review' ? '⚠ Needs Review' : 'Review'}
          </Badge>
        </button>

        <button
          onClick={() => handleTag('rejected')}
          disabled={isSubmitting}
          className={`transition-opacity ${tag && tag !== 'rejected' ? 'opacity-50' : 'opacity-100 hover:opacity-80'}`}
        >
          <Badge variant={tag === 'rejected' ? 'danger' : 'default'} className="cursor-pointer">
            {tag === 'rejected' ? '✗ Rejected' : 'Reject'}
          </Badge>
        </button>
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
