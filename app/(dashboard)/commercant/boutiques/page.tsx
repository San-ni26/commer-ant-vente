// src/app/(dashboard)/merchant/shops/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ShopList } from "@/components/shops/ShopList"

export default async function ShopsPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Mes Boutiques</h1>
      <ShopList />
    </div>
  )
}