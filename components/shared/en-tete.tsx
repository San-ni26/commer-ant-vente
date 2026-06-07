// src/components/shared/en-tete.tsx - CORRIGÉ
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth"
import { LogOut } from "lucide-react"

export async function EnTete() {
  const session = await auth()
  const role = (session?.user as any)?.role as string

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Bienvenue, {session?.user?.name}
          </h2>
          <p className="text-sm text-gray-500">
            {role === "ADMIN" && "Administrateur"}
            {role === "COMMERCANT" && "Commerçant"}
            {role === "EMPLOYE" && "Employé"}
          </p>
        </div>
        
        <form action={async () => {
          "use server"
          await signOut({ redirectTo: "/connexion" })
        }}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </form>
      </div>
    </header>
  )
}