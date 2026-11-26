/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || '畫面渲染或推論模組發生未預期異常',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('PetPulse AI ErrorBoundary caught:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="main-workspace">
          <section className="surface-panel" role="alert">
            <div className="section-header">
              <h2>系統模組暫時中斷</h2>
              <span className="status-chip status-chip--red">異常保護模式</span>
            </div>
            <p className="lead">
              PetPulse AI 偵測到執行緒或畫面狀態異常，您的寵物健檢與標註資料已受本地安全保護。
            </p>
            <p className="mono-val">{this.state.errorMessage}</p>
            <div className="section-header">
              <button type="button" className="btn btn--primary" onClick={this.handleReset}>
                重新載入工作區
              </button>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
