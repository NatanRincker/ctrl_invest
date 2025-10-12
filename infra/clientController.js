export const apiGet = async (endpoint, cookie) => {
  const r = await fetch(endpoint, {
    method: "GET",
    headers: { cookie },
    redirect: "manual",
  });
  // Handle auth redirect/401
  if (r.status === 401) {
    return { unauthorized: true };
  }
  if (!r.ok) {
    return { error: `HTTP ${r.status}` };
  }
  try {
    return { data: await r.json() };
  } catch {
    return { data: null };
  }
};

const clientController = { apiGet };
export default clientController;
