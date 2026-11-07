import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { AdminLogin } from "@/components/admin/AdminLogin";
import {
  isAdminAuthenticated,
  isAdminHostAllowed,
  isLocalRequest,
} from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  await connection();

  if (!(await isAdminHostAllowed())) {
    notFound();
  }

  if (!(await isAdminAuthenticated())) {
    return <AdminLogin localOnly={await isLocalRequest()} />;
  }

  return <AdminConsole />;
}

function AdminLoading() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center px-4">
      <p className="text-sm text-muted">Carregando…</p>
    </div>
  );
}
