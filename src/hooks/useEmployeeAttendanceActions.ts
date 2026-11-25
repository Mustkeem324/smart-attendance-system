'use client';

import { useState } from 'react';

export interface GpsSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  isWithinGeofence: boolean;
}

export interface AttendanceActionFeedback {
  type: 'success' | 'error';
  message: string;
}

interface UseEmployeeAttendanceActionsOptions {
  onSuccess?: () => Promise<void> | void;
}

/**
 * Shared client hook for attendance Check-In, Check-Out, and Break actions.
 * Used identically by both the Employee Dashboard overview widget and the dedicated Punch page.
 */
export function useEmployeeAttendanceActions({
  onSuccess,
}: UseEmployeeAttendanceActionsOptions = {}) {
  const [currentGps, setCurrentGps] = useState<GpsSnapshot | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraModalMode, setCameraModalMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [submitting, setSubmitting] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [feedback, setFeedback] = useState<AttendanceActionFeedback | null>(null);

  const openCheckIn = () => {
    setFeedback(null);
    if (!currentGps) {
      setFeedback({
        type: 'error',
        message: 'Location permission or GPS signal is required before check-in. Please allow location access and refresh GPS.',
      });
      return;
    }
    setCameraModalMode('CHECK_IN');
    setIsCameraModalOpen(true);
  };

  const openCheckOut = () => {
    setFeedback(null);
    setCameraModalMode('CHECK_OUT');
    setIsCameraModalOpen(true);
  };

  const submitPunchPhoto = async (photoBase64: string) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const endpoint =
        cameraModalMode === 'CHECK_IN'
          ? '/api/attendance/check-in'
          : '/api/attendance/check-out';

      const payload: any = {
        latitude: currentGps?.latitude,
        longitude: currentGps?.longitude,
        accuracy: currentGps?.accuracy,
        photo: photoBase64,
      };
      if (cameraModalMode === 'CHECK_IN') {
        payload.allowException = true;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message:
            data.message ||
            data.error ||
            (cameraModalMode === 'CHECK_IN' ? 'Check-in failed' : 'Check-out failed'),
        });
      } else {
        setFeedback({
          type: 'success',
          message:
            cameraModalMode === 'CHECK_IN'
              ? `Check-in recorded (${data.record?.status || 'PRESENT'}).`
              : `Check-out successful. Total logged hours: ${data.summary?.totalHours ?? data.record?.totalHours ?? 0} hrs.`,
        });
        if (onSuccess) await onSuccess();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error while updating attendance' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBreak = async (hasActiveBreak: boolean) => {
    setBreakLoading(true);
    setFeedback(null);
    try {
      const action = hasActiveBreak ? 'END' : 'START';
      const res = await fetch('/api/attendance/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, breakType: 'LUNCH' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Could not update break status.' });
      } else {
        setFeedback({
          type: 'success',
          message: action === 'START' ? 'Break timer started.' : 'Break ended and logged.',
        });
        if (onSuccess) await onSuccess();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update break timer.' });
    } finally {
      setBreakLoading(false);
    }
  };

  return {
    currentGps,
    setCurrentGps,
    isCameraModalOpen,
    setIsCameraModalOpen,
    cameraModalMode,
    submitting,
    breakLoading,
    feedback,
    setFeedback,
    openCheckIn,
    openCheckOut,
    submitPunchPhoto,
    toggleBreak,
  };
}
