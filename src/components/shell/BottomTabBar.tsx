/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface BottomTabBarProps {
  onTriggerTap?: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ onTriggerTap }) => {
  const location = useLocation();
  const path = location.pathname;

  const isHome = path === '/' || path.startsWith('/app/home') || path.startsWith('/app/daily');
  const isFgs = path.startsWith('/app/fgs-scan') || path.startsWith('/app/fgs-scanner');
  const isChat = path.startsWith('/app/chat');
  const isTrends = path.startsWith('/app/trends') || path.startsWith('/app/blood-test');
  const isSitters = path.startsWith('/app/sitters') || path.startsWith('/app/sitter') || path.startsWith('/app/clinics');

  return (
    <nav className="bottom-tab-bar" aria-label="飼主端五大核心導覽列">
      <div className="bottom-tab-bar__inner">
        <Link
          to="/app/home"
          className={isHome ? 'bottom-tab-link is-active' : 'bottom-tab-link'}
          onClick={onTriggerTap}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>日常打卡</span>
        </Link>

        <Link
          to="/app/fgs-scan"
          className={isFgs ? 'bottom-tab-link is-active' : 'bottom-tab-link'}
          onClick={onTriggerTap}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <circle cx="9.5" cy="10.5" r="1" />
            <circle cx="14.5" cy="10.5" r="1" />
            <path d="M9.5 14.5c1.5 1.2 3.5 1.2 5 0" />
          </svg>
          <span>貓臉快篩</span>
        </Link>

        <Link
          to="/app/chat"
          className={isChat ? 'bottom-tab-link is-active' : 'bottom-tab-link'}
          onClick={onTriggerTap}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
          </svg>
          <span>AI 問診</span>
        </Link>

        <Link
          to="/app/trends"
          className={isTrends ? 'bottom-tab-link is-active' : 'bottom-tab-link'}
          onClick={onTriggerTap}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 3 5-6" />
          </svg>
          <span>數據追蹤</span>
        </Link>

        <Link
          to="/app/sitters"
          className={isSitters ? 'bottom-tab-link is-active' : 'bottom-tab-link'}
          onClick={onTriggerTap}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 13c2.5 0 4.5 1.8 4.5 4.2 0 1.4-1 2.3-2.4 2.3h-4.2C8.5 19.5 7.5 18.6 7.5 17.2 7.5 14.8 9.5 13 12 13Z" />
            <circle cx="7" cy="10" r="1.4" />
            <circle cx="10.5" cy="7.5" r="1.4" />
            <circle cx="13.5" cy="7.5" r="1.4" />
            <circle cx="17" cy="10" r="1.4" />
          </svg>
          <span>到府保姆</span>
        </Link>
      </div>
    </nav>
  );
};
