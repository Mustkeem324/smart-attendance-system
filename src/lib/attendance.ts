import { AttendanceStatus, Shift } from '@prisma/client';

export interface ShiftEvaluationResult {
  status: AttendanceStatus;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  totalWorkingHours: number;
  overtimeHours: number;
}

/**
 * Parses "HH:mm" time string into minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Calculates attendance status, lateness, early departure, and hours.
 */
export function evaluateShiftAttendance(
  checkInDate: Date,
  checkOutDate: Date | null,
  shift: Shift
): ShiftEvaluationResult {
  const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  const shiftStartMinutes = timeStringToMinutes(shift.startTime);
  const shiftEndMinutes = timeStringToMinutes(shift.endTime);

  // Late calculation
  let lateMinutes = 0;
  if (!shift.isFlexible) {
    const diff = checkInMinutes - shiftStartMinutes;
    if (diff > shift.gracePeriodMinutes) {
      lateMinutes = diff;
    }
  }

  let totalWorkingHours = 0;
  let earlyDepartureMinutes = 0;
  let overtimeHours = 0;

  if (checkOutDate) {
    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    totalWorkingHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

    const checkOutMinutes = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();
    
    // Normal same-day shift
    if (!shift.isOvernight) {
      if (checkOutMinutes < shiftEndMinutes) {
        earlyDepartureMinutes = Math.max(0, shiftEndMinutes - checkOutMinutes);
      }
    } else {
      // Overnight shift e.g. 22:00 to 07:00 next day
      const targetDurationHours = ((24 * 60 - shiftStartMinutes) + shiftEndMinutes) / 60;
      if (totalWorkingHours < targetDurationHours - 0.25) {
        earlyDepartureMinutes = Math.round((targetDurationHours - totalWorkingHours) * 60);
      }
    }

    if (totalWorkingHours > shift.fullDayThresholdHours) {
      overtimeHours = Math.round((totalWorkingHours - shift.fullDayThresholdHours) * 100) / 100;
    }
  }

  // Determine Attendance Status
  let status: AttendanceStatus = AttendanceStatus.PRESENT;

  if (lateMinutes > 0) {
    status = AttendanceStatus.LATE;
  }

  if (checkOutDate) {
    if (totalWorkingHours < shift.halfDayThresholdHours) {
      status = AttendanceStatus.HALF_DAY;
    } else if (earlyDepartureMinutes > 30) {
      status = AttendanceStatus.EARLY_DEPARTURE;
    }
  }

  return {
    status,
    lateMinutes,
    earlyDepartureMinutes,
    totalWorkingHours,
    overtimeHours,
  };
}
