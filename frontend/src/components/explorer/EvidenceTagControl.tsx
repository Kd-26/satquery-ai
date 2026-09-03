'use client';

import React, { useState } from 'react';
import { Badge } from '../ui/Badge';

interface EvidenceTagControlProps {
  nodeId: string;
}

export function EvidenceTagControl({ nodeId }: EvidenceTagControlProps) {
  const [tag, setTag] = useState<'accepted' | 'rejected' | 'needs_review' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTag = async (selectedTag: 'accepted' | 'rejected' | 'needs_review') => {
    setIsSubmitting(true);
    setTag(selectedTag);
    
    // In a real app, this makes the POST request
    try {
      console.log(`POST /api/v1/evidence-nodes/${nodeId}/feedback`, { tag: selectedTag });
      // await fetch(...)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
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
  );
}
