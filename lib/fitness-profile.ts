export const fitnessGoals = ["muscle_gain", "fat_loss", "strength", "general_fitness"] as const;
export const experienceLevels = ["beginner", "intermediate", "advanced"] as const;
export const equipmentOptions = ["full_gym", "home_dumbbells", "bodyweight"] as const;

export type FitnessGoal = (typeof fitnessGoals)[number];
export type ExperienceLevel = (typeof experienceLevels)[number];
export type EquipmentOption = (typeof equipmentOptions)[number];

export type FitnessProfileInput = {
  goal: FitnessGoal;
  experience: ExperienceLevel;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: EquipmentOption;
  limitations: string;
  preferredExercises: string;
};

export type FitnessProfile = FitnessProfileInput & {
  updatedAt: number;
};

export const defaultFitnessProfile: FitnessProfileInput = {
  goal: "muscle_gain",
  experience: "beginner",
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: "full_gym",
  limitations: "",
  preferredExercises: "",
};

export const fitnessGoalLabels: Record<FitnessGoal, string> = {
  muscle_gain: "Build muscle",
  fat_loss: "Fat-loss support",
  strength: "Get stronger",
  general_fitness: "General fitness",
};

export const experienceLabels: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const equipmentLabels: Record<EquipmentOption, string> = {
  full_gym: "Full gym",
  home_dumbbells: "Home + dumbbells",
  bodyweight: "Bodyweight only",
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

export function validateFitnessProfile(value: unknown): { profile?: FitnessProfileInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "Profile details are required" };
  const candidate = value as Partial<Record<keyof FitnessProfileInput, unknown>>;
  if (!fitnessGoals.includes(candidate.goal as FitnessGoal)) return { error: "Choose a valid fitness goal" };
  if (!experienceLevels.includes(candidate.experience as ExperienceLevel)) return { error: "Choose a valid experience level" };
  if (!equipmentOptions.includes(candidate.equipment as EquipmentOption)) return { error: "Choose a valid equipment option" };
  const daysPerWeek = Number(candidate.daysPerWeek);
  const sessionMinutes = Number(candidate.sessionMinutes);
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 2 || daysPerWeek > 6) return { error: "Training days must be between 2 and 6" };
  if (!Number.isInteger(sessionMinutes) || sessionMinutes < 20 || sessionMinutes > 180) return { error: "Session length must be between 20 and 180 minutes" };
  const limitations = cleanText(candidate.limitations, 500);
  const preferredExercises = cleanText(candidate.preferredExercises, 300);
  return {
    profile: {
      goal: candidate.goal as FitnessGoal,
      experience: candidate.experience as ExperienceLevel,
      daysPerWeek,
      sessionMinutes,
      equipment: candidate.equipment as EquipmentOption,
      limitations,
      preferredExercises,
    },
  };
}

export function fitnessProfileContext(profile: FitnessProfile | FitnessProfileInput) {
  const limitations = profile.limitations || "none reported";
  const preferences = profile.preferredExercises || "no exercise preferences saved";
  return [
    `Goal: ${fitnessGoalLabels[profile.goal]}`,
    `Experience: ${experienceLabels[profile.experience]}`,
    `Schedule: ${profile.daysPerWeek} days per week, ${profile.sessionMinutes} minutes per session`,
    `Equipment: ${equipmentLabels[profile.equipment]}`,
    `Limitations: ${limitations}`,
    `Preferred exercises: ${preferences}`,
  ].join("\n");
}
