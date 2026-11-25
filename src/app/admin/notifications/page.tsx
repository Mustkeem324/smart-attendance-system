'use client';

import React from 'react';
import NotificationCenterView from '@/components/notifications/NotificationCenterView';

export default function AdminNotificationsPage() {
  return (
    <NotificationCenterView
      scope="ORG"
      title="Admin Live Notification Center"
      subtitle="Real-time organization compliance alerts, leave & support queues, missing punches, and live stream events."
    />
  );
}
