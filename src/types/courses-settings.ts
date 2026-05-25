export type CoursesAccessMode = 'paid' | 'free';

export type CoursesAccessModeSettings = {
  courses_access_mode: CoursesAccessMode;
  updated_at?: string;
  updated_by_admin_id?: number;
};
