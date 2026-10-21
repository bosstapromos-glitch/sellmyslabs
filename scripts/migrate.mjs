import {readFile} from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL before migrating.');
const sql=neon(process.env.DATABASE_URL);
const schema=await readFile(new URL('./schema.sql',import.meta.url),'utf8');
for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))await sql.query(statement);
console.log('SellMySlabs schema is ready.');
