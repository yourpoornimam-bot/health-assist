import { Schema, model, models } from 'mongoose';
const point = { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } }; // [lng, lat]
const base = { name: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true }, passwordHash: { type: String, required: true, select: false }, address: String };
const mk = (n: string, def: any, geo = false) => {
  const s = new Schema(def, { timestamps: true });
  if (geo) s.index({ location: '2dsphere' });
  return models[n] || model(n, s);
};
const ref = (m: string, extra = {}) => ({ type: Schema.Types.ObjectId, ref: m, ...extra });
export const User = mk('User', { ...base, age: Number, gender: String, bloodGroup: String, premium: { type: Boolean, default: false }, location: point }, true);
export const Doctor = mk('Doctor', { ...base, licenseNumber: { type: String, unique: true }, specialization: String, education: [{ degree: String, institute: String, year: Number }],
  experienceYears: Number, councilId: String, availableNow: { type: Boolean, default: false }, verified: { type: Boolean, default: false }, rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }, location: point }, true);
export const Service = mk('Service', { name: { type: String, unique: true }, category: String });
export const Hospital = mk('Hospital', { ...base, ownerName: String, registrationId: String, licenseNumber: String, type: { type: String, enum: ['govt', 'private', 'clinic', 'lab'] },
  open24x7: Boolean, services: [{ service: ref('Service'), name: String, price: Number }], rating: { type: Number, default: 0 }, ratingCount: { type: Number, default: 0 }, location: point }, true);
export const Pharmacy = mk('Pharmacy', { ...base, ownerName: String, drugLicense: String, gstNumber: String, rating: Number, location: point }, true);
export const Ambulance = mk('Ambulance', { operator: String, phone: String, pricePerKm: Number, baseFare: Number, available: Boolean, location: point }, true);
export const MedicineInventory = mk('MedicineInventory', { pharmacy: ref('Pharmacy', { index: true }), medicine: { type: String, index: 'text' }, strength: String, price: Number, stock: Number, homeDelivery: Boolean });
export const Booking = mk('Booking', { patient: ref('User'), doctor: ref('Doctor'), mode: { type: String, enum: ['virtual', 'offline'] },
  slot: Date, status: { type: String, enum: ['pending', 'confirmed', 'done', 'cancelled'], default: 'pending' }, notes: String });
export const BiometricLog = mk('BiometricLog', { user: ref('User', { index: true }), type: { type: String, enum: ['water', 'steps', 'exercise', 'sleep', 'food'] }, value: Number, meta: Object, at: { type: Date, default: Date.now } });
export const PeriodTracker = mk('PeriodTracker', { user: ref('User', { unique: true }), cycleLength: { type: Number, default: 28 }, periodLength: Number,
  cycles: [{ start: Date, end: Date }], pregnancy: { active: Boolean, lmp: Date, obstetrician: ref('Doctor') } });
export const FamilyTree = mk('FamilyTree', { owner: ref('User', { index: true }), members: [{ relation: { type: String, enum: ['parent', 'child', 'spouse', 'sibling'] }, name: String, conditions: [String] }],
  vault: [{ title: String, kind: String, encryptedBlob: String, iv: String, tag: String }] });
export const Review = mk('Review', { author: ref('User'), targetModel: { type: String, enum: ['Doctor', 'Hospital', 'Pharmacy'] }, target: Schema.Types.ObjectId, stars: { type: Number, min: 1, max: 5 }, comment: String });
export const GovScheme = mk('GovScheme', { name: String, level: { type: String, enum: ['central', 'state'] }, state: String, eligibility: [String], benefits: String, officialUrl: String, verifiedAt: Date });
