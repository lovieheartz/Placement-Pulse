import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE } from "@/lib/api";

export type Notification = {
  _id: string;
  title: string;
  content?: string;
  description?: string;
  type?: string;
  formLink?: string;
  deadline?: string;
  createdAt: string;
  isReadByUser?: boolean;
  createdByModel?: "Admin" | "Faculty" | string;
};

const authHeader = () => {
  const token = sessionStorage.getItem("authToken");
  return { Authorization: `Bearer ${token}` };
};

export function useNotifications() {
  const qc = useQueryClient();
  const token = sessionStorage.getItem("authToken");

  const listQuery = useQuery<Notification[]>({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/notifications/user`, {
        headers: authHeader(),
      });
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const notifications = listQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isReadByUser).length;
  const tpoUnread = notifications.filter(
    (n) => n.createdByModel === "Admin" && !n.isReadByUser
  ).length;
  const facultyUnread = notifications.filter(
    (n) => n.createdByModel === "Faculty" && !n.isReadByUser
  ).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await axios.put(
        `${API_BASE}/notifications/${id}/read`,
        {},
        { headers: authHeader() }
      );
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<Notification[]>(["notifications", "list"], (prev) =>
        (prev ?? []).map((n) =>
          n._id === id ? { ...n, isReadByUser: true } : n
        )
      );
    },
  });

  const markAllRead = () => {
    notifications.forEach((n) => {
      if (!n.isReadByUser) markRead.mutate(n._id);
    });
  };

  return {
    notifications,
    unreadCount,
    tpoUnread,
    facultyUnread,
    isLoading: listQuery.isLoading,
    markRead: markRead.mutate,
    markAllRead,
  };
}
