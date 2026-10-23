import { HomeScreen } from "./home-screen";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  return <HomeScreen openRecovery={sp.recovery === "1"} />;
}
