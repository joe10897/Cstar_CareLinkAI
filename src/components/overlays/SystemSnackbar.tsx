/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React from 'react';

export interface SystemSnackbarProps {
  message: string | null;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

export const SystemSnackbar: React.FC<SystemSnackbarProps> = ({
  message,
  detail,
  actionLabel,
  onAction,
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <div className="snackbar-float" role="status" aria-live="polite">
      <div className="snackbar-float__content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <div>
          <div className="snackbar-float__title">{message}</div>
          {detail && <div className="snackbar-float__detail">{detail}</div>}
        </div>
      </div>
      <div className="pet-pill-group">
        {actionLabel && onAction && (
          <button type="button" className="snackbar-float__btn" onClick={onAction}>
            {actionLabel}
          </button>
        )}
        <button type="button" className="snackbar-float__btn" onClick={onDismiss}>
          關閉
        </button>
      </div>
    </div>
  );
};
