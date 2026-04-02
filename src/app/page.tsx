import { currentUser } from "@clerk/nextjs/server";
import { LandingPage } from "~/components/landing-page";

export default async function Home() {
  const user = await currentUser();

  return <LandingPage isLoggedIn={!!user} />;
}
