import useSWR from "swr";

async function fetchAPI(key) {
  const response = await fetch(key);
  const responseBody = await response.json();
  return responseBody;
}
export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
    </>
  );
}

function UpdatedAt() {
  const { data, isLoading } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });
  let updatadAtText;
  if (isLoading) {
    updatadAtText = "Carregando...";
  } else {
    updatadAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  }
  return (
    <>
      <div>Última atualização em: {updatadAtText}</div>
      <pre>{JSON.stringify(data, null, 2)}</pre>;
    </>
  );
}
