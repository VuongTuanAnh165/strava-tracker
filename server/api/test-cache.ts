import { defineEventHandler } from 'h3'
import { useStorage } from '#imports'

export default defineEventHandler(async (event) => {
  const keys = await useStorage('cache').getKeys()
  return { keys }
})
