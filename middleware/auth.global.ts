export default defineNuxtRouteMiddleware(async (to) => {
  // Access control belongs to the server API. Running this UX guard only in the
  // browser also keeps server-rendered navigation independent of auth-provider
  // availability.
  if (import.meta.server) return
  if (['/login', '/recovery', '/reset'].includes(to.path)) return
  try {
    const session = await $fetch<{
      data: { authenticated: boolean; setupRequired: boolean }
    }>('/api/v1/auth/session')
    if (!session.data.authenticated) return navigateTo('/login')
    if (session.data.setupRequired && to.path !== '/setup')
      return navigateTo('/setup')
    if (!session.data.setupRequired && to.path === '/setup')
      return navigateTo('/')
  } catch {
    return navigateTo('/login')
  }
})
