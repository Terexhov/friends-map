export default function StarRating({ value, onChange, readonly = false, size = 'md' }) {
  return (
    <div className={`star-rating ${readonly ? 'readonly' : 'interactive'} size-${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= Math.round(value || 0) ? 'filled' : 'empty'}`}
          onClick={() => !readonly && onChange?.(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
