import { redirect } from "next/navigation";

// The login moved to the platform-level master door. Keep the old URL alive.
export default function BcpLoginRedirect() {
  redirect("/login");
}
