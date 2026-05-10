import type { Metadata } from "next";

import { RegisterForm } from "./register-form";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Daftar",
};

export default function RegisterPage() {
  const showGoogle = env.GOOGLE_CLIENT_ID.length > 0 && env.GOOGLE_CLIENT_SECRET.length > 0;
  return <RegisterForm showGoogle={showGoogle} />;
}
