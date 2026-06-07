// prisma.config.ts
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Pas besoin de spécifier le output, utilisez le défaut
})