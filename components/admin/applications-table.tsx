"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

type Application = {
  id: number;
  name: string;
  phone: string;
  email: string;
  sslcUrl?: string | null;
  hscUrl?: string | null;
  amount?: number;
  paid: boolean;
  createdAt: string;
  status?: "pending" | "approved" | "rejected";
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

const LS_KEY = "approved_pending_status";

function getStatusFromLocalStorage(): Record<number, Application["status"]> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStatusToLocalStorage(statuses: Record<number, Application["status"]>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(statuses));
  } catch {
    // ignore
  }
}

export default function ApplicationsTable() {
  const [apps, setApps] = useState<Application[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [statuses, setStatuses] = useState<Record<number, Application["status"]>>({});

  // ✅ Load saved approval states from localStorage
  useEffect(() => {
    const stored = getStatusFromLocalStorage();
    setStatuses(stored);
  }, []);

  // ✅ Fetch applications from Supabase API
  const fetchApplications = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/applications?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(search)}`
      );
      const json = await res.json();
      if (json.success) {
        setApps(json.data || []);
        setPagination(json.pagination);
      }
    } catch (e) {
      console.error("Error fetching applications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(1, q);
  }, [q]);

  // ✅ Handle Approve / Reject actions
  const updateStatus = (id: number, newStatus: Application["status"]) => {
    setStatuses((prev) => {
      const updated = { ...prev, [id]: newStatus };
      saveStatusToLocalStorage(updated);
      return updated;
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-medium">Applications</h2>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, or phone"
          className="w-[260px]"
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>10th Marksheet</TableHead>
              <TableHead>12th Marksheet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : apps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No applications found
                </TableCell>
              </TableRow>
            ) : (
              apps.map((r) => {
                const status = statuses[r.id] || "pending";
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      {r.sslcUrl ? (
                        <a
                          href={r.sslcUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-primary underline"
                        >
                          View <Download className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Nill</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.hscUrl ? (
                        <a
                          href={r.hscUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-primary underline"
                        >
                          View <Download className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Nill</span>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {status === "approved" && (
                        <span className="text-green-600 font-medium">Approved</span>
                      )}
                      {status === "rejected" && (
                        <span className="text-red-600 font-medium">Rejected</span>
                      )}
                      {status === "pending" && (
                        <span className="text-yellow-600 font-medium">Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mr-2"
                        onClick={() => updateStatus(r.id, "approved")}
                        disabled={status === "approved"}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => updateStatus(r.id, "rejected")}
                        disabled={status === "rejected"}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between mt-4 items-center">
        <div className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrev || loading}
            onClick={() => fetchApplications(pagination.page - 1, q)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext || loading}
            onClick={() => fetchApplications(pagination.page + 1, q)}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
