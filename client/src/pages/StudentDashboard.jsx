import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  FileText,
  Video,
  History,
  ClipboardList,
  BarChart3,
  FilePlus2,
  FileCheck2,
  Bell,
  User,
  Sparkles,
} from "lucide-react";

import { API_BASE } from "../lib/api";
import PortalLayout from "@/components/app/PortalLayout";
import { DashboardCard } from "@/components/app/DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = sessionStorage.getItem("authToken");

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  const displayUser = profileData || user || {};
  const firstName = (displayUser.name || "Student").split(" ")[0];

  const tools = [
    {
      title: "AI Resume Analyzer",
      description: "Get AI-powered resume analysis with ATS scoring.",
      icon: FileText,
      tone: "violet",
      badge: "AI",
      to: "/student/resume-analyzer",
    },
    {
      title: "AI Mock Interview",
      description: "Practice interviews with an AI voice assistant.",
      icon: Video,
      tone: "indigo",
      badge: "AI",
      to: "/student/mock-interview",
    },
    {
      title: "Interview History",
      description: "Review your past AI interview sessions and feedback.",
      icon: History,
      tone: "blue",
      to: "/student/interview-history",
    },
    {
      title: "Enrolled Tests",
      description: "View and attempt your enrolled aptitude tests.",
      icon: ClipboardList,
      tone: "emerald",
      to: "/student/tests",
    },
    {
      title: "Test History",
      description: "View your test results and performance analytics.",
      icon: BarChart3,
      tone: "amber",
      to: "/student/test-history",
    },
    {
      title: "Apply for NOC",
      description: "Submit new NOC applications for placements.",
      icon: FilePlus2,
      tone: "blue",
      to: "/student/apply-noc",
    },
    {
      title: "Track NOC",
      description: "Track the status of your NOC applications.",
      icon: FileCheck2,
      tone: "emerald",
      to: "/student/track-noc",
    },
    {
      title: "Notifications",
      description: "View notifications from TPO and faculty.",
      icon: Bell,
      tone: "rose",
      to: "/student/notifications",
    },
    {
      title: "Update Profile",
      description: "Manage your profile and personal information.",
      icon: User,
      tone: "indigo",
      to: "/student/profile",
    },
  ];

  return (
    <PortalLayout role="student" title="Dashboard" user={displayUser}>
      {/* Welcome hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 size-40 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="size-3.5" />
            Placement Suite
          </span>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            Welcome back, {firstName} 👋
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-blue-100">
            Prepare smarter with AI tools, track your NOC applications, and stay
            on top of every placement opportunity — all in one place.
          </p>
        </div>
      </div>

      {/* Tools */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Quick access</h3>
      </div>

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
              badge={tool.badge}
              onClick={() => navigate(tool.to)}
            />
          ))}
        </div>
      )}
    </PortalLayout>
  );
};

export default StudentDashboard;
