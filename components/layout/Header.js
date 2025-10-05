import Link from "next/link";
import useLogout from "../../hooks/useLogout";

export default function Header({
  username,
  loading = false,
  error = "",
  onToggleSidebar,
}) {
  const label = loading
    ? "Carregando…"
    : error
      ? "Nome Não Carregado"
      : (username ?? "User");
  const handleLogout = useLogout();

  return (
    <header className="sticky top-0 z-20 bg-gray-900/70 border-b border-gray-800 backdrop-blur">
      <div className="relative h-14 flex items-center">
        {/* Left: hamburger pinned */}
        <div className="absolute left-3 sm:left-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={onToggleSidebar}
            className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm hover:bg-gray-700"
          >
            ☰
          </button>

          <Link
            href="/home"
            className="text-sm text-gray-300 hover:text-white px-2 py-1 rounded-md hover:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            title="Ir para Home"
          >
            Home
          </Link>
        </div>
        {/* Right group: username (left) + logout (right), both pinned */}
        <div className="absolute right-3 sm:right-4 flex items-center gap-3">
          <span
            className="text-sm text-gray-300 truncate max-w-[40vw] sm:max-w-[30vw] text-right"
            title={typeof label === "string" ? label : ""}
          >
            {label}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-emerald-800 hover:bg-emerald-700 px-4 py-2 text-sm font-medium"
          >
            Log out
          </button>
        </div>

        {/* Optional: spacer to keep header height consistent */}
        <div className="w-full" aria-hidden />
      </div>
    </header>
  );
}
