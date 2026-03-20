/**
 * Major → Year → Recommended Classes mapping
 * 
 * Used during onboarding to suggest classes based on the student's
 * major and year of study. Only a few popular majors are pre-populated
 * for the hackathon demo. Others will get a generic "search" experience.
 */

import type { CourseClass } from "@/types";

// Predefined classes with full metadata (used to seed DynamoDB)
export const ECU_CLASSES: CourseClass[] = [
  // Computer Science
  {
    classId: "csci1010",
    courseCode: "CSCI 1010",
    courseName: "Algorithmic Problem Solving",
    department: "Computer Science",
    creditHours: 3,
    description: "Introduction to problem-solving concepts and programming fundamentals.",
    relatedMajors: ["Computer Science", "Software Engineering", "Information and Cybersecurity Technology"],
    enrolledCount: 0,
  },
  {
    classId: "csci2540",
    courseCode: "CSCI 2540",
    courseName: "Data Abstraction and Object-Oriented Programming",
    department: "Computer Science",
    creditHours: 3,
    description: "Object-oriented programming, data structures, and algorithm design.",
    relatedMajors: ["Computer Science", "Software Engineering"],
    enrolledCount: 0,
  },
  {
    classId: "csci2530",
    courseCode: "CSCI 2530",
    courseName: "Assembly Language and Computer Organization",
    department: "Computer Science",
    creditHours: 3,
    description: "Computer architecture, assembly language programming, and machine-level representation.",
    relatedMajors: ["Computer Science", "Electrical Engineering"],
    enrolledCount: 0,
  },
  {
    classId: "csci3310",
    courseCode: "CSCI 3310",
    courseName: "Automata, Computability, and Formal Languages",
    department: "Computer Science",
    creditHours: 3,
    description: "Formal languages, finite automata, context-free grammars, and computability theory.",
    relatedMajors: ["Computer Science"],
    enrolledCount: 0,
  },
  {
    classId: "csci3610",
    courseCode: "CSCI 3610",
    courseName: "Data Communications and Networking",
    department: "Computer Science",
    creditHours: 3,
    description: "Network protocols, architectures, and data communication systems.",
    relatedMajors: ["Computer Science", "Information and Cybersecurity Technology"],
    enrolledCount: 0,
  },

  // Mathematics
  {
    classId: "math1065",
    courseCode: "MATH 1065",
    courseName: "College Algebra",
    department: "Mathematics",
    creditHours: 3,
    description: "Functions, graphs, equations, and inequalities. Essential foundation for calculus.",
    relatedMajors: ["Mathematics", "Computer Science", "Biology", "Chemistry", "Physics", "Economics"],
    enrolledCount: 0,
  },
  {
    classId: "math2119",
    courseCode: "MATH 2119",
    courseName: "Elements of Linear Algebra",
    department: "Mathematics",
    creditHours: 3,
    description: "Systems of linear equations, matrices, vector spaces, and eigenvalues.",
    relatedMajors: ["Mathematics", "Computer Science", "Physics"],
    enrolledCount: 0,
  },
  {
    classId: "math2171",
    courseCode: "MATH 2171",
    courseName: "Calculus I",
    department: "Mathematics",
    creditHours: 4,
    description: "Limits, derivatives, and integrals of single-variable functions.",
    relatedMajors: ["Mathematics", "Computer Science", "Physics", "Chemistry", "Electrical Engineering", "Mechanical Engineering"],
    enrolledCount: 0,
  },
  {
    classId: "math2172",
    courseCode: "MATH 2172",
    courseName: "Calculus II",
    department: "Mathematics",
    creditHours: 4,
    description: "Techniques of integration, sequences, series, and parametric equations.",
    relatedMajors: ["Mathematics", "Computer Science", "Physics", "Electrical Engineering"],
    enrolledCount: 0,
  },

  // English
  {
    classId: "engl1100",
    courseCode: "ENGL 1100",
    courseName: "Foundations of College Writing",
    department: "English",
    creditHours: 3,
    description: "Development of writing skills through analysis and composition.",
    relatedMajors: [], // Required for all majors
    enrolledCount: 0,
  },

  // Biology
  {
    classId: "biol1050",
    courseCode: "BIOL 1050",
    courseName: "General Biology I",
    department: "Biology",
    creditHours: 4,
    description: "Cell biology, genetics, evolution, and ecology.",
    relatedMajors: ["Biology", "Biochemistry", "Nursing (BSN)", "Environmental Health", "Public Health Education"],
    enrolledCount: 0,
  },
  {
    classId: "biol1051",
    courseCode: "BIOL 1051",
    courseName: "General Biology II",
    department: "Biology",
    creditHours: 4,
    description: "Organismal biology, plant and animal physiology, and biodiversity.",
    relatedMajors: ["Biology", "Biochemistry", "Nursing (BSN)"],
    enrolledCount: 0,
  },

  // Chemistry
  {
    classId: "chem1150",
    courseCode: "CHEM 1150",
    courseName: "General Chemistry I",
    department: "Chemistry",
    creditHours: 4,
    description: "Atomic structure, stoichiometry, chemical bonding, and thermochemistry.",
    relatedMajors: ["Chemistry", "Biochemistry", "Biology", "Nursing (BSN)", "Environmental Health"],
    enrolledCount: 0,
  },

  // Business
  {
    classId: "acct2401",
    courseCode: "ACCT 2401",
    courseName: "Financial Accounting",
    department: "Accounting",
    creditHours: 3,
    description: "Introduction to financial accounting principles, reporting, and analysis.",
    relatedMajors: ["Accounting", "Business Administration", "Finance", "Management", "Marketing", "Entrepreneurship"],
    enrolledCount: 0,
  },
  {
    classId: "mgt3303",
    courseCode: "MGT 3303",
    courseName: "Principles of Management",
    department: "Management",
    creditHours: 3,
    description: "Planning, organizing, leading, and controlling in organizations.",
    relatedMajors: ["Management", "Business Administration", "Entrepreneurship", "Marketing", "Supply Chain Management"],
    enrolledCount: 0,
  },

  // Nursing
  {
    classId: "nurs1001",
    courseCode: "NURS 1001",
    courseName: "Introduction to Professional Nursing",
    department: "Nursing",
    creditHours: 1,
    description: "Overview of nursing profession, roles, and responsibilities.",
    relatedMajors: ["Nursing (BSN)"],
    enrolledCount: 0,
  },

  // Psychology
  {
    classId: "psyc1000",
    courseCode: "PSYC 1000",
    courseName: "Introduction to Psychology",
    department: "Psychology",
    creditHours: 3,
    description: "Survey of major areas of psychology including learning, cognition, and behavior.",
    relatedMajors: ["Psychology", "Neuroscience", "Criminal Justice", "Sociology", "Social Work"],
    enrolledCount: 0,
  },
];

/**
 * Major → Year → Recommended class IDs
 * 
 * Only popular majors are mapped for the hackathon demo.
 * Returns classIds (not full objects).
 */
export const MAJOR_CLASS_MAP: Record<string, Record<string, string[]>> = {
  "Computer Science": {
    Freshman: ["csci1010", "math1065", "engl1100"],
    Sophomore: ["csci2540", "csci2530", "math2171"],
    Junior: ["csci3310", "csci3610", "math2119"],
    Senior: ["csci3310", "csci3610"],
  },
  "Software Engineering": {
    Freshman: ["csci1010", "math1065", "engl1100"],
    Sophomore: ["csci2540", "csci2530", "math2171"],
    Junior: ["csci3310", "csci3610"],
    Senior: [],
  },
  "Biology": {
    Freshman: ["biol1050", "chem1150", "math1065", "engl1100"],
    Sophomore: ["biol1051", "math2171"],
    Junior: [],
    Senior: [],
  },
  "Nursing (BSN)": {
    Freshman: ["nurs1001", "biol1050", "chem1150", "engl1100"],
    Sophomore: ["biol1051"],
    Junior: [],
    Senior: [],
  },
  "Psychology": {
    Freshman: ["psyc1000", "engl1100", "math1065"],
    Sophomore: ["biol1050"],
    Junior: [],
    Senior: [],
  },
  "Accounting": {
    Freshman: ["acct2401", "engl1100", "math1065"],
    Sophomore: ["mgt3303"],
    Junior: [],
    Senior: [],
  },
  "Business Administration": {
    Freshman: ["acct2401", "engl1100", "math1065"],
    Sophomore: ["mgt3303"],
    Junior: [],
    Senior: [],
  },
};

/**
 * Get recommended classes for a major + year combo
 */
export function getRecommendedClassIds(major: string, year: string): string[] {
  return MAJOR_CLASS_MAP[major]?.[year] || [];
}

/**
 * Get all class data as a lookup map by classId
 */
export function getClassLookup(): Record<string, CourseClass> {
  const lookup: Record<string, CourseClass> = {};
  for (const cls of ECU_CLASSES) {
    lookup[cls.classId] = cls;
  }
  return lookup;
}
