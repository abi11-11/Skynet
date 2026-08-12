import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface FeedbackFormProps {
  bookingId: string;
  pilotId: string;
  onSubmitted: () => void;
}

export const FeedbackForm = ({ bookingId, pilotId, onSubmitted }: FeedbackFormProps) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { data: user } = await supabase.auth.getUser();

    const { error: submitError } = await supabase
      .from('pilot_reviews')
      .insert({
        booking_id: bookingId,
        pilot_id: pilotId,
        farm_manager_id: user.user?.id,
        rating,
        comment
      });

    setIsSubmitting(false);

    if (submitError) {
      setError(submitError.message);
    } else {
      onSubmitted();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 p-4 border rounded-xl bg-gray-50">
      <h4 className="text-lg font-medium text-gray-800 mb-2">Rate the Pilot</h4>
      <p className="text-sm text-gray-600 mb-4">Your feedback helps maintain a high-quality drone network.</p>

      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500 transition-colors`}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add an optional comment..."
        className="w-full p-3 border rounded-lg mb-4"
        style={{ width: '100%', minHeight: '80px' }}
      />

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: (isSubmitting || rating === 0) ? 'not-allowed' : 'pointer' }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
};
