/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React from 'react';

export interface BottomSheetDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheetDrawer: React.FC<BottomSheetDrawerProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
}) => {
  if (!open) return null;

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-panel">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="section-header">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="brand-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="btn" onClick={onClose}>
            收合抽屜
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
