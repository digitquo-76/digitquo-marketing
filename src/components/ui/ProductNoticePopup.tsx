'use client';

import { useEffect, useState } from 'react';

const noticeStorageKey = 'digitquo_product_notice_seen';

export function ProductNoticePopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(noticeStorageKey)) return;

    sessionStorage.setItem(noticeStorageKey, 'true');
    setVisible(true);

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!visible) return null;

  return (
    <div className="product-notice-popup" role="status" aria-live="polite">
      More products will be added soon.
    </div>
  );
}
