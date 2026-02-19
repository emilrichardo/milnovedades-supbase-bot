import * as migration_20260219_223816_payload_init from './20260219_223816_payload_init';
import * as migration_20260219_224819_add_sync_global_table from './20260219_224819_add_sync_global_table';

export const migrations = [
  {
    up: migration_20260219_223816_payload_init.up,
    down: migration_20260219_223816_payload_init.down,
    name: '20260219_223816_payload_init',
  },
  {
    up: migration_20260219_224819_add_sync_global_table.up,
    down: migration_20260219_224819_add_sync_global_table.down,
    name: '20260219_224819_add_sync_global_table'
  },
];
