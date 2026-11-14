import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getScrimBySlug } from "@/lib/data";
import { RegisterClient } from "@/components/scrims/register-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scrim = await getScrimBySlug(slug);
  return {
    title: scrim ? `Register · ${scrim.title}` : "Register",
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scrim = await getScrimBySlug(slug);
  if (!scrim) notFound();
  if (scrim.status === "completed" || scrim.status === "cancelled") {
    redirect(`/scrims/${scrim.slug}/standings`);
  }
  if (scrim.status === "live" || new Date(scrim.startAt).getTime() < Date.now()) {
    redirect(`/scrims/${scrim.slug}`);
  }

  return <RegisterClient scrim={scrim} />;
}
