import { listCustomers } from "@/lib/repo";
import { ClientesManager } from "./ClientesManager";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const customers = await listCustomers();
  return <ClientesManager customers={customers} />;
}
