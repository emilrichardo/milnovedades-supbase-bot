import * as migration_20260223_144702_init from './20260223_144702_init';
import * as migration_20260306_153951 from './20260306_153951';

export const migrations = [
  {
    up: migration_20260223_144702_init.up,
    down: migration_20260223_144702_init.down,
    name: '20260223_144702_init',
  },
  {
    up: migration_20260306_153951.up,
    down: migration_20260306_153951.down,
    name: '20260306_153951'
  },
];
