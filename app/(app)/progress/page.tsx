import { Suspense } from "react";
import { ProgressScreen } from "./progress-screen";

export default function ProgressPage() {
  return <Suspense><ProgressScreen /></Suspense>;
}
