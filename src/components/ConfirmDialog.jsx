import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep',
  onConfirm,
  onCancel,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') onCancel();
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onCancel();
  };

  return (
    <div className="overlay" onKeyDown={handleKeyDown} onMouseDown={handleBackdropClick}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title" className="dialog__title">
          {title}
        </h2>
        <p className="dialog__message">{message}</p>
        <div className="dialog__actions">
          <button type="button" className="button" ref={cancelButtonRef} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="button button--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
