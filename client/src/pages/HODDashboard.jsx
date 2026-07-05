import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { Building2, Users, GraduationCap, UserPlus, ArrowRight } from "lucide-react";

import { API_BASE } from "../lib/api";
import PortalLayout from "@/components/app/PortalLayout";
import { StatCard } from "@/components/app/DashboardCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("authToken")}` },
});

const HODDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const { data: profileData } = useQuery({
    queryKey: ["hodProfile"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/hod/profile`, authHeaders());
      return data.data;
    },
    enabled: !!user,
  });

  const { data: facultyData = [] } = useQuery({
    queryKey: ["hodFaculties"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/hod/my-faculties`, authHeaders());
      return data.data || [];
    },
    enabled: !!user,
  });

  const { data: studentsData = [] } = useQuery({
    queryKey: ["hodStudents"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/hod/students`, authHeaders());
      return data.data || [];
    },
    enabled: !!user,
  });

  const hodCourse = profileData?.course;
  const hodDepartment = profileData?.department;
  const departmentStudents = studentsData.filter(
    (s) => s.course === hodCourse && s.branch === hodDepartment
  );

  return (
    <PortalLayout role="hod" title="Dashboard" user={profileData || user}>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          tone="blue"
          label="Department"
          value={hodCourse || "N/A"}
          hint={hodDepartment || "Head of Department"}
        />
        <StatCard
          icon={GraduationCap}
          tone="amber"
          label="Students in your department"
          value={departmentStudents.length}
        />
        <StatCard
          icon={Users}
          tone="emerald"
          label="Faculty members"
          value={facultyData.length}
        />
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white shadow-sm">
          <div>
            <p className="text-sm font-medium text-white/80">Quick action</p>
            <p className="mt-1 text-lg font-semibold">Add Faculty</p>
          </div>
          <Button
            onClick={() => navigate("/hod/add-faculty")}
            className="mt-3 w-fit gap-1.5 bg-white text-violet-700 hover:bg-white/90"
            size="sm"
          >
            <UserPlus className="size-4" /> Add now
          </Button>
        </div>
      </div>

      {/* Recent faculty */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Faculty</h2>
          <button
            onClick={() => navigate("/hod/faculties")}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-4" />
          </button>
        </div>

        {facultyData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">Name</th>
                  <th className="px-3 py-2.5 font-semibold">Email</th>
                  <th className="px-3 py-2.5 font-semibold">Phone</th>
                  <th className="px-3 py-2.5 font-semibold">Course</th>
                  <th className="px-3 py-2.5 font-semibold">Department</th>
                </tr>
              </thead>
              <tbody>
                {facultyData.slice(0, 5).map((faculty) => (
                  <tr
                    key={faculty._id}
                    className="border-b border-border/60 transition-colors hover:bg-accent/40"
                  >
                    <td className="px-3 py-3 font-medium text-foreground">{faculty.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{faculty.email}</td>
                    <td className="px-3 py-3 text-muted-foreground">{faculty.phone || "-"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{faculty.course || "-"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{faculty.department || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No faculty members yet. Add your first faculty member!
          </p>
        )}
      </Card>
    </PortalLayout>
  );
};

export default HODDashboard;
