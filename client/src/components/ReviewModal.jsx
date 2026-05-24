import { useState } from "react";
import { Star, X } from "lucide-react";
import { toast } from "sonner";
import { submitReview } from "../api/rides.js";
import { assetUrl } from "../api/client.js";

export function ReviewModal({ isOpen, onClose, rideId, reviewees, onSuccess }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !reviewees || reviewees.length === 0) return null;

  const currentReviewee = reviewees[currentIndex];
  const isLast = currentIndex === reviewees.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setCurrentIndex((i) => i + 1);
      setRating(0);
      setHoverRating(0);
      setComment("");
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    setSubmitting(true);
    try {
      await submitReview(rideId, {
        revieweeId: currentReviewee.id,
        rating,
        comment,
      });
      toast.success(`Review for ${currentReviewee.fullName} submitted!`);
      handleNext();
    } catch (error) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const avatarSrc = assetUrl(currentReviewee?.avatarUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Rate Your Ride
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {reviewees.length > 1
              ? `Review passenger ${currentIndex + 1} of ${reviewees.length}`
              : "How was your experience?"}
          </p>

          <div className="mt-6 flex flex-col items-center">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-brand-100 bg-slate-100 dark:border-brand-900/30 dark:bg-slate-800">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={currentReviewee.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-brand-600">
                  {currentReviewee.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="mt-3 font-semibold text-slate-900 dark:text-white">
              {currentReviewee.fullName}
            </p>
          </div>

          <div className="mt-6 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-10 w-10 ${
                    (hoverRating || rating) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200 dark:text-slate-700"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mt-6 text-left">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Add a comment <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="What went well? What could be improved?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={300}
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {comment.length}/300
            </p>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={handleSkip}
            >
              Skip
            </button>
            <button
              type="button"
              disabled={submitting || rating === 0}
              className="inline-flex justify-center rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
