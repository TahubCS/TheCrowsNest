/**
 * Predefined ECU Majors
 * 
 * Organized by college/school. Used in onboarding dropdown.
 * Source: ECU undergraduate catalog + admissions.
 */

export interface EcuMajor {
  name: string;
  college: string;
}

export const ECU_MAJORS: EcuMajor[] = [
  // Thomas Harriot College of Arts & Sciences
  { name: "African and African American Studies", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Anthropology", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Applied Atmospheric Science", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Applied Sociology", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Biochemistry", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Biology", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Chemistry", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Communication Studies", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Community and Regional Planning", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Computer Science", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Criminal Justice", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Economics", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "English", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Environmental Studies", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Foreign Languages and Literatures", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "General Studies", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Geography", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Geology", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "History", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Mathematics", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Multidisciplinary Studies", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Neuroscience", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Philosophy", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Physics", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Political Science", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Professional Writing and Information Design", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Psychology", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Security Studies", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "Sociology", college: "Thomas Harriot College of Arts & Sciences" },
  { name: "University Studies", college: "Thomas Harriot College of Arts & Sciences" },

  // College of Engineering & Technology
  { name: "Biochemical Engineering", college: "College of Engineering & Technology" },
  { name: "Biomedical Engineering", college: "College of Engineering & Technology" },
  { name: "Construction Management", college: "College of Engineering & Technology" },
  { name: "Design", college: "College of Engineering & Technology" },
  { name: "Distribution and Logistics", college: "College of Engineering & Technology" },
  { name: "Electrical Engineering", college: "College of Engineering & Technology" },
  { name: "Environmental Engineering", college: "College of Engineering & Technology" },
  { name: "Industrial Engineering Technology", college: "College of Engineering & Technology" },
  { name: "Industrial and Systems Engineering", college: "College of Engineering & Technology" },
  { name: "Industrial Technology", college: "College of Engineering & Technology" },
  { name: "Information and Cybersecurity Technology", college: "College of Engineering & Technology" },
  { name: "Mechanical Engineering", college: "College of Engineering & Technology" },
  { name: "Software Engineering", college: "College of Engineering & Technology" },

  // College of Business
  { name: "Accounting", college: "College of Business" },
  { name: "Business Administration", college: "College of Business" },
  { name: "Entrepreneurship", college: "College of Business" },
  { name: "Finance", college: "College of Business" },
  { name: "Hospitality Management", college: "College of Business" },
  { name: "Management", college: "College of Business" },
  { name: "Management Information Systems", college: "College of Business" },
  { name: "Marketing", college: "College of Business" },
  { name: "Supply Chain Management", college: "College of Business" },

  // College of Education
  { name: "Art Education", college: "College of Education" },
  { name: "Elementary Education", college: "College of Education" },
  { name: "Family and Consumer Sciences Education", college: "College of Education" },
  { name: "Physical Education", college: "College of Education" },
  { name: "Science Teacher Education", college: "College of Education" },
  { name: "Special Education", college: "College of Education" },

  // College of Fine Arts & Communication
  { name: "Art", college: "College of Fine Arts & Communication" },
  { name: "Music", college: "College of Fine Arts & Communication" },
  { name: "Music Education", college: "College of Fine Arts & Communication" },
  { name: "Music Therapy", college: "College of Fine Arts & Communication" },

  // College of Health & Human Performance
  { name: "Environmental Health", college: "College of Health & Human Performance" },
  { name: "Health Information Management", college: "College of Health & Human Performance" },
  { name: "Health Services Management", college: "College of Health & Human Performance" },
  { name: "Parks, Recreation and Leisure Studies", college: "College of Health & Human Performance" },
  { name: "Public Health Education", college: "College of Health & Human Performance" },
  { name: "Therapeutic Recreation", college: "College of Health & Human Performance" },

  // College of Nursing
  { name: "Nursing (BSN)", college: "College of Nursing" },

  // College of Allied Health Sciences
  { name: "Clinical Laboratory Science", college: "College of Allied Health Sciences" },
  { name: "Dietetics", college: "College of Allied Health Sciences" },
];

/**
 * Study levels
 */
export const STUDY_LEVELS = [
  "Undergraduate",
  "Masters",
  "Doctoral",
] as const;

/**
 * Year of study options
 */
export const YEARS_OF_STUDY = {
  Undergraduate: ["Freshman", "Sophomore", "Junior", "Senior"],
  Masters: ["Year 1", "Year 2"],
  Doctoral: ["Year 1", "Year 2", "Year 3", "Year 4+"],
} as const;

/**
 * Helper: get major names as string array (for simple dropdown)
 */
export function getMajorNames(): string[] {
  return ECU_MAJORS.map((m) => m.name);
}

/**
 * Helper: get majors grouped by college
 */
export function getMajorsByCollege(): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const major of ECU_MAJORS) {
    if (!grouped[major.college]) {
      grouped[major.college] = [];
    }
    grouped[major.college].push(major.name);
  }
  return grouped;
}
