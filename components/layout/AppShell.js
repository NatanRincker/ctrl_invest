// components/layout/AppShell.js
import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({
  children,
  username,
  userLoading,
  userError,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0f0e] text-gray-100">
      <Header
        username={username}
        loading={userLoading}
        error={userError}
        onToggleSidebar={() => setOpen(true)}
      />
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
