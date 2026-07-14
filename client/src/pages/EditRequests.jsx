import React, { useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  ShieldCheck, Unlock, Ban, ExternalLink, Clock, Loader2, Mail,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE } from '../config/api';
import { resolveFileUrl } from '../lib/api';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` } });
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const EditRequests = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const queryClient = useQueryClient();

  const role = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return 'hod';
    if (location.pathname.startsWith('/faculty')) return 'faculty';
    return 'admin';
  }, [location.pathname]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['editRequests'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/student-profile/edit-requests`, authHeaders());
      return data.data || [];
    },
    enabled: !!user,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ req, approve }) => {
      const { data } = await axios.post(
        `${API_BASE}/student-profile/edit-requests/resolve`,
        {
          studentId: req.studentId,
          recordType: req.recordType,
          semesterNumber: req.semesterNumber,
          approve,
        },
        authHeaders()
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Done.');
      queryClient.invalidateQueries(['editRequests']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to resolve request.'),
  });

  const busy = (req) =>
    resolveMutation.isPending &&
    resolveMutation.variables?.req?.studentId === req.studentId &&
    resolveMutation.variables?.req?.recordType === req.recordType &&
    resolveMutation.variables?.req?.semesterNumber === req.semesterNumber;

  return (
    <PortalLayout role={role} title="Edit Requests" user={user}>
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Marksheet Edit Requests"
          subtitle="Students must get permission to change a locked academic record"
          icon={ShieldCheck}
          actions={requests.length > 0 ? <Badge variant="warning">{requests.length} pending</Badge> : null}
        />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : requests.length === 0 ? (
          <GlassPanel>
            <EmptyState
              icon={ShieldCheck}
              title="No pending requests"
              description="When a student asks to edit a locked marksheet, it'll show up here for approval."
            />
          </GlassPanel>
        ) : (
          <div className="space-y-4">
            {requests.map((req, i) => (
              <GlassPanel key={`${req.studentId}-${req.recordType}-${req.semesterNumber ?? i}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{req.studentName || 'Student'}</h3>
                      <Badge variant="default">{req.label}</Badge>
                      <Badge variant="warning"><Clock className="mr-1 size-3" /> {fmt(req.requestedAt)}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="size-3.5" /> {req.studentEmail}
                    </p>
                    {req.reason && (
                      <p className="mt-2 rounded-lg bg-muted/40 p-3 text-sm text-foreground">
                        <span className="font-medium">Reason: </span>{req.reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {req.fileUrl && (
                    <a href={resolveFileUrl(req.fileUrl)} target="_blank" rel="noreferrer">
                      <Button type="button" variant="outline" size="sm">
                        <ExternalLink className="size-4" /> View uploaded file
                      </Button>
                    </a>
                  )}
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={busy(req)}
                    onClick={() => resolveMutation.mutate({ req, approve: false })}
                  >
                    <Ban className="size-4" /> Deny
                  </Button>
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    disabled={busy(req)}
                    onClick={() => resolveMutation.mutate({ req, approve: true })}
                  >
                    {busy(req) ? <Loader2 className="size-4 animate-spin" /> : <Unlock className="size-4" />} Grant edit access
                  </Button>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default EditRequests;
