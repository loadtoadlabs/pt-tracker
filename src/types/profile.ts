export type CardioComponent = 'hamr' | 'two-mile-run';
export type StrengthComponent = 'push-ups' | 'hand-release-push-ups';
export type CoreComponent = 'plank' | 'sit-ups' | 'cross-leg-reverse-crunch';

export type EquipmentOption =
  | 'full-gym'
  | 'basic-gym'
  | 'dumbbells'
  | 'bodyweight'
  | 'track'
  | 'treadmill'
  | 'bike'
  | 'rower'
  | 'stair-climber';

export type MovementRestriction =
  | 'squat'
  | 'lunge'
  | 'kneel'
  | 'run'
  | 'jump'
  | 'overhead-press'
  | 'high-impact';

export type TrainingDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type UserProfile = {
  onboardingComplete: boolean;
  age: string;
  sex: 'male' | 'female' | '';
  heightInches: string;
  weightLb: string;
  waistInches: string;
  testDate: string;
  cardioComponent: CardioComponent | '';
  strengthComponent: StrengthComponent | '';
  coreComponent: CoreComponent | '';
  baselineCardio: string;
  baselineStrength: string;
  baselineCore: string;
  equipment: EquipmentOption[];
  trainingDays: TrainingDay[];
  movementRestrictions: MovementRestriction[];
  mobilityNotes: string;
};

export const emptyUserProfile: UserProfile = {
  onboardingComplete: false,
  age: '',
  sex: '',
  heightInches: '',
  weightLb: '',
  waistInches: '',
  testDate: '',
  cardioComponent: '',
  strengthComponent: '',
  coreComponent: '',
  baselineCardio: '',
  baselineStrength: '',
  baselineCore: '',
  equipment: [],
  trainingDays: [],
  movementRestrictions: [],
  mobilityNotes: '',
};
