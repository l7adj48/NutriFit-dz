import { AppState, DishItem, FoodItem } from '../types';

export type VerificationTone = 'gold' | 'green' | 'amber' | 'red' | 'dim';

export interface ProvenanceRow {
  label: string;
  value: string;
  tone?: VerificationTone;
}

export interface ProvenanceInfo {
  label: string;
  tone: VerificationTone;
  rows: ProvenanceRow[];
}

export interface ReadinessCheck {
  label: string;
  done: boolean;
  detail?: string;
}

export interface LaunchReadiness {
  verifiedPct: number;
  approvedZones: number;
  totalZones: number;
  checks: ReadinessCheck[];
  ready: boolean;
}

const BASIS_LABELS: Record<string, string> = {
  raw: 'نيء',
  cooked: 'مطبوخ',
  as_sold: 'كما يباع',
  unspecified: 'غير محدد',
};

export function getFoodProvenance(food: FoodItem): ProvenanceInfo {
  const verified = food.nutritionDataStatus === 'verified';
  const basis = food.nutritionBasis ?? 'unspecified';
  const source = food.nutritionSource && food.nutritionSource !== 'TODO_VERIFY'
    ? food.nutritionSource
    : null;

  const rows: ProvenanceRow[] = [
    {
      label: 'حالة التوثيق',
      value: verified ? 'موثق' : 'بانتظار المصدر',
      tone: verified ? 'green' : 'amber',
    },
    {
      label: 'حالة الوزن',
      value: BASIS_LABELS[basis] ?? basis,
      tone: basis === 'unspecified' ? 'red' : 'gold',
    },
    {
      label: 'المصدر',
      value: source ?? 'لم يُحدد بعد',
      tone: source ? 'green' : 'red',
    },
  ];
  if (food.sourceRecordId) {
    rows.push({ label: 'رقم السجل', value: food.sourceRecordId });
  }
  if (food.ediblePortionPct !== undefined) {
    rows.push({ label: 'الجزء المأكول', value: `${food.ediblePortionPct}%` });
  }
  if (food.cookingYield !== undefined) {
    rows.push({ label: 'مردود الطهي', value: String(food.cookingYield) });
  }
  return {
    label: verified ? 'موثق' : 'غير موثق',
    tone: verified ? 'green' : 'amber',
    rows,
  };
}

export function getDishProvenance(dish: DishItem, foods: FoodItem[]): ProvenanceInfo {
  const rows: ProvenanceRow[] = [];
  let verifiedCount = 0;
  let unverifiedCount = 0;
  let missingCount = 0;
  for (const [fid] of dish.ing) {
    const f = foods.find((x) => x.id === fid);
    if (!f) {
      missingCount++;
      continue;
    }
    if (f.nutritionDataStatus === 'verified') verifiedCount++;
    else unverifiedCount++;
  }
  const total = dish.ing.length;
  const tone: VerificationTone =
    total === 0
      ? 'red'
      : unverifiedCount === 0 && missingCount === 0
        ? 'green'
        : 'amber';
  rows.push({ label: 'عدد المكونات', value: String(total) });
  rows.push({
    label: 'مكونات موثقة',
    value: String(verifiedCount),
    tone: verifiedCount === total ? 'green' : 'amber',
  });
  if (unverifiedCount) {
    rows.push({ label: 'مكونات غير موثقة', value: String(unverifiedCount), tone: 'amber' });
  }
  if (missingCount) {
    rows.push({ label: 'مكونات مفقودة', value: String(missingCount), tone: 'red' });
  }
  return {
    label: tone === 'green' ? 'كامل الوصفة موثق' : 'الوصفة تحتوي مكونات غير موثقة',
    tone,
    rows,
  };
}

export function getLaunchReadiness(state: AppState): LaunchReadiness {
  const foods = state.foods;
  const verifiedCount = foods.filter((f) => f.nutritionDataStatus === 'verified').length;
  const verifiedPct = foods.length === 0 ? 0 : Math.round((verifiedCount / foods.length) * 100);
  const approvedZones = state.zones.filter((z) => z.active).length;
  const totalZones = state.zones.length;
  const checks: ReadinessCheck[] = [
    {
      label: 'بيانات غذائية موثقة لكل مكوّن',
      done: foods.length > 0 && verifiedCount === foods.length,
      detail: `${verifiedCount}/${foods.length} مكوّن موثق`,
    },
    {
      label: 'نطاق خدمة معتمد واحد على الأقل',
      done: approvedZones > 0,
      detail: `${approvedZones}/${totalZones} منطقة نشطة`,
    },
    {
      label: 'طاقة يومية مضبوطة (> 0)',
      done: state.cap > 0,
      detail: `${state.cap} علبة/يوم`,
    },
    {
      label: 'ملف العميل الغذائي مكتمل',
      done: state.ob >= 6,
      detail: state.ob >= 6 ? 'مكتمل' : 'قيد الإدخال',
    },
  ];
  return {
    verifiedPct,
    approvedZones,
    totalZones,
    checks,
    ready: checks.every((c) => c.done),
  };
}
