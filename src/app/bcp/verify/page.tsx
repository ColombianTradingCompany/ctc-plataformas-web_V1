import { redirect } from "next/navigation";

// The verify step moved to the platform-level master flow. Keep the old URL alive.
export default function BcpVerifyRedirect() {
  redirect("/verify");
}
