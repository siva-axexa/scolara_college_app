"use client";

import { useMemo, useState, useEffect } from "react";
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

type PhoneLogin = {
  id: string;
  phoneNumber: string;
  isActive: boolean;
  verified: boolean;
  createdAt: string;
};

// Format numbers to Indian format: +91 98765 43210
function formatIndianPhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  // If local 10-digit, assume India
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  // If starts with 91 and length 12 (e.g., 919876543210)
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  // If starts with +91 already (handle variants)
  if (raw.trim().startsWith("+91")) {
    const local = digits.replace(/^91/, "").slice(-10);
    if (local.length === 10) return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  // Fallback to original
  return raw;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function PhoneLoginsTable() {
  const [q, setQ] = useState("");
  const [phones, setPhones] = useState<PhoneLogin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Fetch phones data from API
  const fetchPhones = async (page: number = 1, search: string = "", limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Only add search param if it's not empty
      if (search && search.trim() !== "") {
        params.append("search", search);
      }

      const response = await fetch(`/api/admin/loggedin-phones?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || "Failed to fetch phones data");
        } catch (parseError) {
          // If not JSON, use as is
          throw new Error(errorText || "Failed to fetch phones data");
        }
      }

      const result = await response.json();
      if (result.success) {
        setPhones(result.data || []);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      } else {
        throw new Error(result.message || "Failed to fetch phones data");
      }
    } catch (err: any) {
      console.error("Error fetching phones:", err);
      setError(err.message || "Unknown error");
      setPhones([]);
      setPagination((p) => ({ ...p, total: 0, totalPages: 0 }));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPhones(1, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Reset to first page on new search
      fetchPhones(1, q);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchPhones(newPage, q, pagination.limit);
  };

  // CSV export for current page
  const exportCsv = () => {
    if (!phones || phones.length === 0) return;
    const header = ["phoneNumber", "isActive", "verified", "createdAt"];
    const rows = phones.map((p) => [
      p.phoneNumber,
      p.isActive ? "true" : "false",
      p.verified ? "true" : "false",
      p.createdAt,
    ]);

    const csvContent =
      [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = `loggedin-phones_page-${pagination.page || 1}.csv`;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-medium">Logged-in Phone Numbers</h2>
        <Input
          value={q}
          onChange={(e) => {
            // Only allow numbers
            const numericValue = e.target.value.replace(/[^\d]/g, "");
            setQ(numericValue);
          }}
          placeholder="Search by phone (numbers only)"
          className="w-[260px]"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          Error: {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : phones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No logged-in phones found
                </TableCell>
              </TableRow>
            ) : (
              phones.map((r) => (
                <TableRow key={r.id || r.phoneNumber}>
                  <TableCell>{formatIndianPhone(r.phoneNumber)}</TableCell>
                  <TableCell>{r.isActive ? "Yes" : "No"}</TableCell>
                  <TableCell>{r.verified ? "Yes" : "No"}</TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pagination.total === 0 ? (
            <>Showing 0 entries</>
          ) : (
            <>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev || loading}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext || loading}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={exportCsv} disabled={loading || phones.length === 0}>
          Export CSV
        </Button>
      </div>
    </Card>
  );
}
