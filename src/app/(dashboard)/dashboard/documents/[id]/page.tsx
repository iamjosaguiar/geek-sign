import { redirect } from "next/navigation";

interface DocumentPageProps {
  params: { id: string };
}

export default function DocumentPage({ params }: DocumentPageProps) {
  redirect(`/dashboard/envelopes/${params.id}`);
}
