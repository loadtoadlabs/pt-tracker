export type CardioComponent = 'hamr' | 'two-mile-run' | 'two-km-walk';
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

export type BaselinePerformance = {
  twoMileRunTime: string;
  hamrLevel: string;
  hamrShuttle: string;
  twoKmWalkTime: string;
  strengthReps: string;
  coreReps: string;
  plankTime: string;
};

export type UserProfile = {
  onboardingComplete: boolean;
  ageOnTestDate: string;
  sex: 'male' | 'female' | '';
  heightInches: string;
  weightLb: string;
  waistInches: string;
  testDate: string;
  cardioComponent: CardioComponent | '';
  strengthComponent: StrengthComponent | '';
  coreComponent: CoreComponent | '';
  baseline: BaselinePerformance;
  equipment: EquipmentOption[];
  trainingDays: TrainingDay[];
  movementRestrictions: MovementRestriction[];
  mobilityNotes: string;
};

export const emptyUserProfile: UserProfile = {
  onboardingComplete: false,
  ageOnTestDate: '',
  sex: '',
  heightInches: '',
  weightLb: '',
  waistInches: '',
  testDate: '',
  cardioComponent: '',
  strengthComponent: '',
  coreComponent: '',
  baseline: {
    twoMileRunTime: '',
    hamrLevel: '',
    hamrShuttle: '',
    twoKmWalkTime: '',
    strengthReps: '',
    coreReps: '',
    plankTime: '',
  },
  equipment: [],
  trainingDays: [],
  movementRestrictions: [],
  mobilityNotes: '',
};
