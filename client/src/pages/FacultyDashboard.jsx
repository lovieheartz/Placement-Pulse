import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Users,
  ClipboardList,
  FilePlus2,
  User,
  Sparkles,
} from "lucide-react";

import { API_BASE } from "../lib/api";
import PortalLayout from "@/components/app/PortalLayout";
import { DashboardCard } from "@/components/app/DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("authToken");

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["facultyProfile"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/faculty/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  const user = {
    name: profileData?.name,
    email: profileData?.email,
    profilePicture: profileData?.avatar || null,
  };
  const firstName = (user.name || "Faculty").split(" ")[0];

  const tools = [
    { title: "My Students", description: "View and manage your assigned students.", icon: Users, tone: "blue", to: "/faculty/students" },
    { title: "Aptitude Tests", description: "Create and manage aptitude tests with AI.", icon: ClipboardList, tone: "violet", to: "/faculty/aptitude-tests" },
    { title: "Create Test", description: "Build a new AI-assisted aptitude test.", icon: FilePlus2, tone: "emerald", to: "/faculty/aptitude-tests/create" },
    { title: "Profile Settings", description: "Update your profile information.", icon: User, tone: "indigo", to: "/faculty/profile" },
  ];

  return (
    <PortalLayout role="faculty" title="Dashboard" user={user}>
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="size-3.5" />
            Faculty Workspace
          </span>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            Welcome, {firstName} 👋
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-blue-100">
            Manage your students, build assessments, and keep everyone informed.
          </p>
        </div>
      </div>

      <h3 className="mb-4 text-lg font-semibold text-foreground">Quick access</h3>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
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
      )}
    </PortalLayout>
  );
};

export default FacultyDashboard;
