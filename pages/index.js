export default function Index() {
  return null; // never renders—SSR redirect happens
}

export async function getServerSideProps({ req }) {
  const sessionId = req.cookies?.session_id; // works in Next Pages Router

  if (!sessionId) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  return {
    redirect: { destination: "/home", permanent: false },
  };
}
