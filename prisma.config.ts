import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/garden_manager',
})
