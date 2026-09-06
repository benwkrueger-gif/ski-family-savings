import { Suspense } from "react";
import AdminLoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
