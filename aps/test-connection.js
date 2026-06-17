import 'dotenv/config';
import { getAccessToken } from './auth.js';
import { listHubs } from './bids.js';

console.log('Testing APS connection...');

try {
  const token = await getAccessToken();
  console.log('✓ Auth token obtained:', token.substring(0, 20) + '...');

  const hubs = await listHubs();
  console.log('✓ Hubs found:', hubs.length);
  hubs.forEach((h) => console.log(`  - ${h.name} (${h.id})`));
} catch (err) {
  console.error('✗ Connection failed:', err.message);
  process.exit(1);
}
