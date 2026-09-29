import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
export type Role = 'patient' | 'doctor' | 'center' | 'pharmacy';
const rx = { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, phone: /^[6-9]\d{9}$/, gst: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/ };
export const requiredFields: Record<Role, string[]> = {
  patient: ['name', 'email', 'phone', 'age', 'gender', 'bloodGroup', 'address'],
  doctor: ['name', 'email', 'phone', 'licenseNumber', 'specialization', 'education', 'experienceYears', 'councilId', 'address'],
  center: ['name', 'ownerName', 'email', 'registrationId', 'licenseNumber', 'type', 'services', 'phone', 'address'],
  pharmacy: ['name', 'ownerName', 'email', 'drugLicense', 'gstNumber', 'phone', 'address'],
};
export function validate(role: Role, b: any): Record<string, string> {
  const e: Record<string, string> = {};
  for (const f of [...requiredFields[role], 'password']) {
    const v = b?.[f];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length)) e[f] = `${f} is required`;
  }
  if (!e.email && !rx.email.test(b.email)) e.email = 'Email format is invalid';
  if (!e.phone && !rx.phone.test(String(b.phone))) e.phone = 'Enter a valid 10-digit Indian mobile number';
  if (!e.password && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(b.password)) e.password = 'Password needs 8+ characters with letters and digits';
  if (role === 'patient' && !e.age && !(Number(b.age) > 0 && Number(b.age) < 121)) e.age = 'Age must be between 1 and 120';
  if (role === 'patient' && !e.bloodGroup && !/^(A|B|AB|O)[+-]$/.test(b.bloodGroup)) e.bloodGroup = 'Blood group must look like O+, AB-';
  if (role === 'pharmacy' && !e.gstNumber && !rx.gst.test(String(b.gstNumber).toUpperCase())) e.gstNumber = 'GST number format is invalid';
  if (role === 'center' && !e.type && !['govt', 'private', 'clinic', 'lab'].includes(b.type)) e.type = 'Type must be govt, private, clinic or lab';
  return e;
}
export const hash = (p: string) => bcrypt.hash(p, 12);
export const verify = (p: string, h: string) => bcrypt.compare(p, h);
const secret = () => import.meta.env.JWT_SECRET as string;
export const sign = (id: string, role: Role) => jwt.sign({ sub: id, role }, secret(), { expiresIn: '7d' });
export function requireRole(request: Request, ...roles: Role[]) {
  const t = request.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  try { const p = jwt.verify(t, secret()) as any; if (roles.length && !roles.includes(p.role)) return null; return p as { sub: string; role: Role }; }
  catch { return null; }
}
