export default defineEventHandler((event) => {
  event.context.requestId = crypto.randomUUID()
})
