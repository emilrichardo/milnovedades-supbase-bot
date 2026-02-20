import * as migration_20260219_223816_payload_init from './20260219_223816_payload_init'

export const migrations = [
  {
    up: migration_20260219_223816_payload_init.up,
    down: migration_20260219_223816_payload_init.down,
    name: '20260219_223816_payload_init',
  },
]
