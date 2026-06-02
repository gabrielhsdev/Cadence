import React from 'react';

interface Props {
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children: React.ReactNode;
  confirmDisabled?: boolean;
  confirmClassName?: string;
  confirmStyle?: React.CSSProperties;
  cancelLabel?: string;
}

export default function ConfirmModal({
  title,
  confirmLabel,
  onConfirm,
  onClose,
  children,
  confirmDisabled = false,
  confirmClassName = 'btn btn-primary',
  confirmStyle,
  cancelLabel = 'Cancel',
}: Props): React.ReactElement {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-subtitle" style={{ marginBottom: 20, lineHeight: 1.6 }}>
          {children}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>{cancelLabel}</button>
          <button
            className={confirmClassName}
            style={confirmStyle}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
