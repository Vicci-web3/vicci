import { join } from 'path'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'

export interface AppOptions extends FastifyServerOptions {
  // Add custom options here
}

// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  // Place your custom code here

  // Register plugins
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  // Register routes
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts
  })
}

export default app
export { app, options } 