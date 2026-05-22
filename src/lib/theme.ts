export const academicGradients = {
  bg: 'bg-gradient-bg',
  card: 'bg-gradient-card',
  accent: 'bg-gradient-accent',
  success: 'bg-gradient-success',
  warning: 'bg-gradient-warning',
  error: 'bg-gradient-error',
} as const;

export type AcademicGradeLevel = 'success' | 'warning' | 'error';

export function getGradeStyle(grade: number | null): AcademicGradeLevel {
  if (grade === null) return 'error';
  if (grade >= 6.5) return 'success';
  if (grade >= 5.0) return 'warning';
  return 'error';
}
