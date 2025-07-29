import { useEffect, useState } from "react";
import { NotificationService, NotificationDto } from "../services/notificationService";

export function useInfiniteNotifications(service: NotificationService) {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMore = async () => {
    if (loading || !hasNext) return;
    setLoading(true);
    try {
      const res = await service.fetchNotifications(cursor);
      setNotifications((prev) => [...prev, ...(res.data || [])]);
      setCursor(res.nextCursor);
      setHasNext(res.hasNext);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 최초 1회
  useEffect(() => {
    fetchMore();
    // eslint-disable-next-line
  }, []);

  return { notifications, fetchMore, hasNext, loading, error };
}
