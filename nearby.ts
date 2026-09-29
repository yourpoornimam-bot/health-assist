import type { APIRoute } from 'astro';
import { connectDB } from '../../lib/db';
import { Hospital, Pharmacy, Ambulance, Doctor } from '../../models';
export const prerender = false;
const M: any = { hospital: Hospital, pharmacy: Pharmacy, ambulance: Ambulance, doctor: Doctor };

// GET /api/nearby?kind=hospital&lat=..&lng=..&radiusKm=100&service=MRI&type=govt&availableNow=1
export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams, lat = parseFloat(q.get('lat') ?? ''), lng = parseFloat(q.get('lng') ?? '');
  const model = M[q.get('kind') ?? 'hospital'];
  if (!model || !Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ error: 'kind, lat and lng are required' }, { status: 400 });
  const radiusKm = Math.min(Math.max(parseFloat(q.get('radiusKm') ?? '100') || 100, 1), 1000);
  const filter: any = {};
  if (q.get('service')) filter['services.name'] = { $regex: q.get('service')!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (q.get('type')) filter.type = q.get('type');
  if (q.get('availableNow')) filter.availableNow = true;
  await connectDB();
  const rows = await model.aggregate([
    { $geoNear: { near: { type: 'Point', coordinates: [lng, lat] }, distanceField: 'distanceM', maxDistance: radiusKm * 1000, spherical: true, query: filter } },
    { $project: { passwordHash: 0 } },
    { $addFields: { distanceKm: { $round: [{ $divide: ['$distanceM', 1000] }, 1] } } },
    { $sort: { distanceM: 1 } }, // nearest first (ambulance hub uses this as-is)
    { $limit: 100 },
  ]);
  const svc = q.get('service')?.toLowerCase();
  // Comparison matrix: distance, price of the requested service, rating
  const out = rows.map((r: any) => ({ ...r, price: svc ? r.services?.find((s: any) => s.name.toLowerCase().includes(svc))?.price ?? null : null }));
  return Response.json({ count: out.length, results: out });
};
