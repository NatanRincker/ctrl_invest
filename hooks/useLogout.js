import { useRouter } from "next/router";
import { useCallback } from "react";

export default function useLogout() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/v1/sessions", {
        method: "DELETE",
        credentials: "include", // ensures cookie is sent if you ever go cross-origin
      });
    } catch (error) {
      console.error(error);
    } finally {
      router.replace("/login");
    }
  }, [router]);

  return handleLogout;
}
