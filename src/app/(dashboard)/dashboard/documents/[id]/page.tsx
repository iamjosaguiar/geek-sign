import { redirect } from "next/navigation";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  redirect(`/dashboard/envelopes/${id}`);
}
