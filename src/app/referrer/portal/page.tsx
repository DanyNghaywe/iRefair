import PortalClient from "./PortalClient";

export const dynamic = "force-dynamic";

type ReferrerPortalPageProps = {
  searchParams?: { token?: string | string[] };
};

export default function ReferrerPortalPage({ searchParams }: ReferrerPortalPageProps) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";
  return <PortalClient token={token} />;
}
