import type { APIRoute } from 'astro';
import { connectDB } from '../../../../lib/db';
import { validate, hash, verify, sign, type Role } from '../../../../lib/auth';
import { User, Doctor, Hospital, Pharmacy } from '../../../../models';
export const prerender = false;
const M: Record<Role, any> = { patient: User, doctor: Doctor, center: Hospital, pharmacy: Pharmacy };
const json = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ params, request }) => {
  const role = params.role as Role, action = params.action;
  if (!M[role]) return json({ error: 'Unknown portal' }, 404);
  const b = await request.json().catch(() => null);
  if (!b) return json({ error: 'Invalid JSON body' }, 400);
  await connectDB();
  if (action === 'register') {
    const errors = validate(role, b);
    if (Object.keys(errors).length) return json({ errors }, 422);
    if (await M[role].exists({ email: b.email.toLowerCase() })) return json({ errors: { email: 'Email already registered' } }, 409);
    const { password, ...rest } = b;
    const doc = await M[role].create({ ...rest, passwordHash: await hash(password) });
    return json({ token: sign(doc.id, role), id: doc.id }, 201);
  }
  if (action === 'login') {
    const errors: Record<string, string> = {};
    if (!b.email?.trim()) errors.email = 'Email is required';
    if (!b.password) errors.password = 'Password is required';
    if (Object.keys(errors).length) return json({ errors }, 422);
    const doc = await M[role].findOne({ email: b.email.toLowerCase() }).select('+passwordHash');
    if (!doc || !(await verify(b.password, doc.passwordHash))) return json({ error: 'Incorrect email or password' }, 401);
    return json({ token: sign(doc.id, role), id: doc.id });
  }
  return json({ error: 'Unknown action' }, 404);
};
