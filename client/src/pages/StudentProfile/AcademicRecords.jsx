import React, { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { GraduationCap, School, BookOpenCheck } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import BoardMarksheetManager from './BoardMarksheetManager';
import SemesterResultManager from './SemesterResultManager';
import { API_BASE } from '../../config/api';

const TABS = [
  { id: 'classX', label: 'Class X (10th)', icon: School },
  { id: 'classXII', label: 'Class XII (12th)', icon: BookOpenCheck },
  { id: 'semesters', label: 'Semesters', icon: GraduationCap },
];

const AcademicRecords = () => {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('classX');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get(`${API_BASE}/student-profile/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  const cgpa = profileData?.semesterMarks?.cgpa;

  return (
    <PortalLayout role="student" title="Academic Records" user={profileData}>
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Academic Records"
          subtitle="Upload your marksheets — AI fills in everything and saves it to your profile"
          icon={GraduationCap}
          actions={cgpa != null ? <Badge variant="default" className="text-sm">CGPA {Number(cgpa).toFixed(2)}</Badge> : null}
        />

        {/* Tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            {tab === 'classX' && (
              <BoardMarksheetManager classType="classX" label="Class X (10th)" profileData={profileData} />
            )}
            {tab === 'classXII' && (
              <BoardMarksheetManager classType="classXII" label="Class XII (12th)" profileData={profileData} />
            )}
            {tab === 'semesters' && (
              <SemesterResultManager profileData={profileData} />
            )}
          </>
        )}

        <GlassPanel className="mt-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Everything you save here is written straight
            to your profile — it shows up under <span className="font-medium text-foreground">Update Profile → Academic</span> and
            is visible to the placement cell. Upload each semester's grade card separately and your CGPA updates automatically.
          </p>
        </GlassPanel>
      </div>
    </PortalLayout>
  );
};

export default AcademicRecords;
