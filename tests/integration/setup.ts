import { afterAll } from 'vitest'
import { resetDb } from './helpers'

// Leave the DB empty so pgTAP runs after integration don't collide with test rows.
afterAll(resetDb)
