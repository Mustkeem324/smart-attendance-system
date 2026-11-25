'use client';

import React from 'react';
import NotificationCenterView from '@/components/notifications/NotificationCenterView';

export default function LiveNotificationsPage() {
  return (
    <NotificationCenterView
      scope="PERSONAL"
      title="Live Notifications & Inbox"
      subtitle="Real-time attendance, leave, task, support, and announcement notifications. Click any item to read full details."
    />
  );
}
