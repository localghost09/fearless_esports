import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata: Metadata = {
  title: "Your account",
  description: "Captain profile, squads and booking history.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <ProfileClient />
      </div>
    </div>
  );
}
