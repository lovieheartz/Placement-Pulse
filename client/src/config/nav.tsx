import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Bell,
  BellRing,
  ClipboardList,
  BarChart3,
  FileCheck2,
  FilePlus2,
  Cpu,
  Target,
  Mic,
  History,
  User,
  Users,
  UserPlus,
  UserX,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Lock,
  Send,
  GraduationCap,
  Award,
} from "lucide-react";

export type Role = "student" | "faculty" | "hod" | "admin";

export type NavLeaf = {
  id: string;
  title: string;
  icon: LucideIcon;
  to: string;
  badgeKey?: "tpo" | "faculty" | "notifications";
};

export type NavItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  to?: string;
  isNew?: boolean;
  badgeKey?: "tpo" | "faculty" | "notifications";
  children?: NavLeaf[];
};

export type NavGroup = {
  heading?: string;
  items: NavItem[];
};

export type PortalMeta = {
  label: string;
  icon: LucideIcon;
  home: string;
};

export const PORTAL_META: Record<Role, PortalMeta> = {
  student: { label: "Student Portal", icon: LayoutDashboard, home: "/student-dashboard" },
  faculty: { label: "Faculty Portal", icon: Briefcase, home: "/faculty-dashboard" },
  hod: { label: "HOD Portal", icon: Briefcase, home: "/hod/dashboard" },
  admin: { label: "Admin Portal", icon: ShieldCheck, home: "/home" },
};

export type FlatNavEntry = {
  id: string;
  title: string;
  icon: LucideIcon;
  to: string;
  group: string;
};

/** Flatten a role's nav (parents + children that have a route) for search. */
export function flattenNav(role: Role): FlatNavEntry[] {
  const out: FlatNavEntry[] = [];
  const seen = new Set<string>();
  for (const group of NAV[role]) {
    const groupName = group.heading || "General";
    for (const item of group.items) {
      if (item.to && !seen.has(item.to)) {
        seen.add(item.to);
        out.push({ id: item.id, title: item.title, icon: item.icon, to: item.to, group: groupName });
      }
      for (const child of item.children || []) {
        if (child.to && !seen.has(child.to)) {
          seen.add(child.to);
          out.push({ id: child.id, title: child.title, icon: child.icon, to: child.to, group: item.title });
        }
      }
    }
  }
  return out;
}

export const NAV: Record<Role, NavGroup[]> = {
  student: [
    {
      items: [
        { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, to: "/student-dashboard" },
      ],
    },
    {
      heading: "Academics",
      items: [
        { id: "academic-records", title: "Academic Records", icon: GraduationCap, to: "/student/academic-records", isNew: true },
        { id: "assignments", title: "Assignments", icon: ClipboardList, to: "/student/assignments", isNew: true },
        { id: "grades", title: "My Grades", icon: Award, to: "/student/grades" },
        {
          id: "tests",
          title: "Tests",
          icon: FileText,
          children: [
            { id: "tests-list", title: "Aptitude Tests", icon: ClipboardList, to: "/student/tests" },
            { id: "tests-history", title: "Test History", icon: BarChart3, to: "/student/test-history" },
          ],
        },
        {
          id: "noc",
          title: "NOC",
          icon: FileText,
          children: [
            { id: "noc-apply", title: "Apply NOC", icon: FilePlus2, to: "/student/apply-noc" },
            { id: "noc-track", title: "Track NOC", icon: FileCheck2, to: "/student/track-noc" },
          ],
        },
        {
          id: "notifications",
          title: "Notifications",
          icon: Bell,
          badgeKey: "notifications",
          children: [
            { id: "notif-tpo", title: "TPO Notifications", icon: BellRing, to: "/student/notifications/tpo", badgeKey: "tpo" },
            { id: "notif-faculty", title: "Faculty Notifications", icon: User, to: "/student/notifications/faculty", badgeKey: "faculty" },
          ],
        },
      ],
    },
    {
      heading: "AI Tools",
      items: [
        {
          id: "ai",
          title: "AI Tools",
          icon: Cpu,
          isNew: true,
          children: [
            { id: "ai-resume", title: "Resume Analyzer", icon: Target, to: "/student/resume-analyzer" },
            { id: "ai-interview", title: "Mock Interview", icon: Mic, to: "/student/mock-interview" },
            { id: "ai-history", title: "Interview History", icon: History, to: "/student/interview-history" },
          ],
        },
      ],
    },
    {
      heading: "Account",
      items: [{ id: "profile", title: "Update Profile", icon: User, to: "/student/profile" }],
    },
  ],

  faculty: [
    {
      items: [
        { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, to: "/faculty-dashboard" },
        { id: "students", title: "Students", icon: Users, to: "/faculty/students" },
      ],
    },
    {
      heading: "Assessments",
      items: [
        { id: "tests", title: "Aptitude Tests", icon: ClipboardList, to: "/faculty/aptitude-tests" },
        { id: "assignments", title: "Assignments", icon: GraduationCap, to: "/faculty/assignments", isNew: true },
      ],
    },
    {
      heading: "Account",
      items: [{ id: "profile", title: "Update Profile", icon: User, to: "/faculty/profile" }],
    },
  ],

  hod: [
    {
      items: [{ id: "dashboard", title: "Dashboard", icon: LayoutDashboard, to: "/hod/dashboard" }],
    },
    {
      heading: "Management",
      items: [
        {
          id: "faculty",
          title: "Faculty",
          icon: Users,
          children: [
            { id: "faculty-list", title: "My Faculty", icon: Users, to: "/hod/faculties" },
            { id: "faculty-add", title: "Add Faculty", icon: UserPlus, to: "/hod/add-faculty" },
          ],
        },
        {
          id: "students",
          title: "Students",
          icon: UserCheck,
          children: [
            { id: "students-all", title: "All Students", icon: Users, to: "/hod/students" },
            { id: "students-blocked", title: "Blocked Students", icon: UserX, to: "/hod/blocked-students" },
          ],
        },
      ],
    },
    {
      heading: "Communication",
      items: [
        { id: "send-notif", title: "Send Notification", icon: Send, to: "/hod/send-notification" },
        { id: "notif-history", title: "Notification History", icon: History, to: "/hod/notification-history" },
      ],
    },
    {
      heading: "Assessments",
      items: [
        { id: "tests", title: "Aptitude Tests", icon: ClipboardList, to: "/hod/aptitude-tests" },
        { id: "assignments", title: "Assignments", icon: GraduationCap, to: "/hod/assignments", isNew: true },
      ],
    },
    {
      heading: "Account",
      items: [{ id: "profile", title: "Update Profile", icon: User, to: "/hod/profile" }],
    },
  ],

  admin: [
    {
      items: [{ id: "dashboard", title: "Dashboard", icon: LayoutDashboard, to: "/home" }],
    },
    {
      heading: "People",
      items: [
        {
          id: "hods",
          title: "HOD",
          icon: Briefcase,
          children: [
            { id: "hod-list", title: "HOD List", icon: Users, to: "/admin/hods" },
            { id: "hod-add", title: "Add HOD", icon: UserPlus, to: "/admin/add-hod" },
          ],
        },
        {
          id: "faculty",
          title: "Faculty",
          icon: Users,
          children: [
            { id: "faculty-list", title: "Faculty List", icon: Users, to: "/admin/faculty" },
            { id: "faculty-add", title: "Add Faculty", icon: UserPlus, to: "/admin/add-faculty" },
          ],
        },
        {
          id: "students",
          title: "Students",
          icon: UserCheck,
          children: [
            { id: "students-list", title: "Student List", icon: Users, to: "/admin/students" },
            { id: "students-blocked", title: "Blocked Students", icon: Lock, to: "/admin/students/blocked" },
          ],
        },
        {
          id: "admins",
          title: "Admin",
          icon: ShieldCheck,
          children: [
            { id: "admin-list", title: "Admin List", icon: Users, to: "/admin/admins" },
            { id: "admin-add", title: "Add Admin", icon: UserPlus, to: "/admin/add-admin" },
          ],
        },
      ],
    },
    {
      heading: "Operations",
      items: [
        { id: "send-notif", title: "Send Notification", icon: Send, to: "/admin/send-notification" },
        { id: "notif-history", title: "Notification History", icon: History, to: "/admin/notification-history" },
        { id: "noc", title: "NOC Requests", icon: FileText, to: "/admin/manage-noc" },
        { id: "tests", title: "Aptitude Tests", icon: ClipboardList, to: "/admin/aptitude-tests" },
      ],
    },
  ],
};
