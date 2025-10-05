// components/layout/Sidebar.js
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Sidebar({ open, onClose }) {
  const router = useRouter();

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const nav = [{ href: "/home", label: "Home" }];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 bg-gray-900 border-r border-gray-800
                    transform transition-transform duration-200
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm font-medium">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <nav className="p-2">
          {nav.map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`block rounded-lg px-3 py-2 text-sm mb-1 ${
                  active
                    ? "bg-emerald-900/30 text-white border border-emerald-800"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
