import PortalClient from "./PortalClient";

type ReferrerPortalPageProps = {
  searchParams?: { token?: string | string[] };
};

export default function ReferrerPortalPage({ searchParams }: ReferrerPortalPageProps) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";
  return <PortalClient token={token} />;
}
