import * as migration_20260223_144702_init from './20260223_144702_init';

export const migrations = [
  {
    up: migration_20260223_144702_init.up,
    down: migration_20260223_144702_init.down,
    name: '20260223_144702_init'
  },
];
