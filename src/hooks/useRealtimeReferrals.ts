/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import { useEffect, useState } from 'react';
import { carelinkStore, type ClinicReferral } from '../services/carelinkStore';

export function useRealtimeReferrals(): {
  referrals: ClinicReferral[];
  redAlertCount: number;
  refreshReferrals: () => void;
} {
  const [referrals, setReferrals] = useState<ClinicReferral[]>(() =>
    carelinkStore.getClinicReferrals()
  );

  useEffect(() => {
    const unsubscribe = carelinkStore.subscribeReferrals((updated) => {
      setReferrals(updated);
    });
    return unsubscribe;
  }, []);

  const refreshReferrals = () => {
    setReferrals(carelinkStore.getClinicReferrals());
  };

  const redAlertCount = referrals.filter(
    (item) => item.urgency_level === 'red' && item.status === 'pending'
  ).length;

  return {
    referrals,
    redAlertCount,
    refreshReferrals,
  };
}
