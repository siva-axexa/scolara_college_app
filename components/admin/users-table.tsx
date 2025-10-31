"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  isActive: boolean;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export default function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
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

  // Fetch users
  const fetchUsers = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(search)}`
      );
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
        setPagination(json.pagination);
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, q); // reset to first page when search changes
  }, [q]);

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-medium">Users</h2>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email"
          className="w-[260px]"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.firstName}</TableCell>
                  <TableCell>{r.lastName}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.mobile}</TableCell>
                  <TableCell>{r.isActive ? "Active" : "Inactive"}</TableCell>
                  <TableCell>
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages} (
          {pagination.total} total)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrev || loading}
            onClick={() => fetchUsers(pagination.page - 1, q)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext || loading}
            onClick={() => fetchUsers(pagination.page + 1, q)}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
