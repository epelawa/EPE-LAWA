import { notFound } from "next/navigation";

export default function UnknownAdminRoute(): never {
  notFound();
}
