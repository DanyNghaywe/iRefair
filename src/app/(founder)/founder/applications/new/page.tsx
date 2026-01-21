import { Suspense } from "react";

import CreateApplicationClient from "./CreateApplicationClient";

export default function CreateApplicationPage() {
  return (
    <Suspense fallback={<div className="founder-page" />}>
      <CreateApplicationClient />
    </Suspense>
  );
}
