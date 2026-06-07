// src/components/shared/protection-admin.tsx
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
const session = await auth()
if (!session) redirect("/connexion")