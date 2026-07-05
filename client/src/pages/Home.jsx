import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Bell,
  FileText,
  Users,
  GraduationCap,
  Briefcase,
  ClipboardList,
  History,
  Sparkles,
} from "lucide-react";

import { API_BASE } from "../lib/api";
import PortalLayout from "@/components/app/PortalLayout";
import { DashboardCard } from "@/components/app/DashboardCard";
import { Button } from "@/components/ui/button";

const Home = () => {
  const { user: authUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const token = sessionStorage.getItem("authToken");
  const role = JSON.parse(sessionStorage.getItem("user") || "{}")?.role;

  const endpoint =
    role === "admin"
      ? "/admin/profile"
      : role === "faculty"
      ? "/faculty/profile"
      : role === "student"
      ? "/student/profile"
      : null;

  const { data: user, isError, error } = useQuery({
    queryKey: ["profile", role],
    queryFn: async () => {
      if (!endpoint) throw new Error("Unknown user role.");
      const res = await axios.get(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token && !!endpoint,
  });

  if (isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <h2 className="text-xl font-semibold text-destructive">
          {error?.message || "User data not found."}
        </h2>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const displayUser = user || authUser || {};
  const firstName = (displayUser.name || "Admin").split(" ")[0];

  const tools = [
    { title: "Send Notifications", description: "Send announcements to students and faculty.", icon: Bell, tone: "rose", to: "/admin/send-notification" },
    { title: "NOC Requests", description: "Review and approve NOC requests.", icon: FileText, tone: "blue", to: "/admin/manage-noc" },
    { title: "Student Management", description: "View and manage student records.", icon: GraduationCap, tone: "amber", to: "/admin/students" },
    { title: "Faculty Management", description: "View and manage faculty members.", icon: Users, tone: "emerald", to: "/admin/faculty" },
    { title: "HOD Management", description: "View and manage HODs by department.", icon: Briefcase, tone: "violet", to: "/admin/hods" },
    { title: "Assessment Center", description: "Create and manage aptitude tests.", icon: ClipboardList, tone: "indigo", to: "/admin/aptitude-tests" },
    { title: "Notification History", description: "Review previously sent announcements.", icon: History, tone: "blue", to: "/admin/notification-history" },
  ];

  return (
    <PortalLayout role="admin" title="Dashboard" user={displayUser}>
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="size-3.5" />
            Placement Control Center
          </span>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            Welcome, {firstName} 👋
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-blue-100">
            Oversee students, faculty, HODs, notifications, NOC approvals, and
            assessments from a single command center.
          </p>
        </div>
      </div>

      <h3 className="mb-4 text-lg font-semibold text-foreground">Quick access</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool) => (
          <DashboardCard
            key={tool.title}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            tone={tool.tone}
            onClick={() => navigate(tool.to)}
          />
        ))}
      </div>
    </PortalLayout>
  );
};

export default Home;
