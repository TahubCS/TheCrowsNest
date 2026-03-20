/**
 * Seed Script — Populates TheCrowsNestClasses table with predefined classes
 * 
 * Run with: node scripts/seed-classes.js
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "TheCrowsNestClasses";

const CLASSES = [
  { classId: "csci1010", courseCode: "CSCI 1010", courseName: "Algorithmic Problem Solving", department: "Computer Science", creditHours: 3, description: "Introduction to problem-solving concepts and programming fundamentals.", relatedMajors: ["Computer Science", "Software Engineering", "Information and Cybersecurity Technology"], enrolledCount: 0 },
  { classId: "csci2540", courseCode: "CSCI 2540", courseName: "Data Abstraction and Object-Oriented Programming", department: "Computer Science", creditHours: 3, description: "Object-oriented programming, data structures, and algorithm design.", relatedMajors: ["Computer Science", "Software Engineering"], enrolledCount: 0 },
  { classId: "csci2530", courseCode: "CSCI 2530", courseName: "Assembly Language and Computer Organization", department: "Computer Science", creditHours: 3, description: "Computer architecture, assembly language programming.", relatedMajors: ["Computer Science", "Electrical Engineering"], enrolledCount: 0 },
  { classId: "csci3310", courseCode: "CSCI 3310", courseName: "Automata, Computability, and Formal Languages", department: "Computer Science", creditHours: 3, description: "Formal languages, finite automata, context-free grammars.", relatedMajors: ["Computer Science"], enrolledCount: 0 },
  { classId: "csci3610", courseCode: "CSCI 3610", courseName: "Data Communications and Networking", department: "Computer Science", creditHours: 3, description: "Network protocols, architectures, and data communication.", relatedMajors: ["Computer Science", "Information and Cybersecurity Technology"], enrolledCount: 0 },
  { classId: "math1065", courseCode: "MATH 1065", courseName: "College Algebra", department: "Mathematics", creditHours: 3, description: "Functions, graphs, equations, and inequalities.", relatedMajors: ["Mathematics", "Computer Science", "Biology", "Chemistry", "Physics", "Economics"], enrolledCount: 0 },
  { classId: "math2119", courseCode: "MATH 2119", courseName: "Elements of Linear Algebra", department: "Mathematics", creditHours: 3, description: "Systems of linear equations, matrices, vector spaces.", relatedMajors: ["Mathematics", "Computer Science", "Physics"], enrolledCount: 0 },
  { classId: "math2171", courseCode: "MATH 2171", courseName: "Calculus I", department: "Mathematics", creditHours: 4, description: "Limits, derivatives, and integrals.", relatedMajors: ["Mathematics", "Computer Science", "Physics", "Chemistry", "Electrical Engineering"], enrolledCount: 0 },
  { classId: "math2172", courseCode: "MATH 2172", courseName: "Calculus II", department: "Mathematics", creditHours: 4, description: "Techniques of integration, sequences, series.", relatedMajors: ["Mathematics", "Computer Science", "Physics"], enrolledCount: 0 },
  { classId: "engl1100", courseCode: "ENGL 1100", courseName: "Foundations of College Writing", department: "English", creditHours: 3, description: "Development of writing skills through analysis and composition.", relatedMajors: [], enrolledCount: 0 },
  { classId: "biol1050", courseCode: "BIOL 1050", courseName: "General Biology I", department: "Biology", creditHours: 4, description: "Cell biology, genetics, evolution, and ecology.", relatedMajors: ["Biology", "Biochemistry", "Nursing (BSN)"], enrolledCount: 0 },
  { classId: "biol1051", courseCode: "BIOL 1051", courseName: "General Biology II", department: "Biology", creditHours: 4, description: "Organismal biology, physiology, and biodiversity.", relatedMajors: ["Biology", "Biochemistry", "Nursing (BSN)"], enrolledCount: 0 },
  { classId: "chem1150", courseCode: "CHEM 1150", courseName: "General Chemistry I", department: "Chemistry", creditHours: 4, description: "Atomic structure, stoichiometry, bonding.", relatedMajors: ["Chemistry", "Biochemistry", "Biology", "Nursing (BSN)"], enrolledCount: 0 },
  { classId: "acct2401", courseCode: "ACCT 2401", courseName: "Financial Accounting", department: "Accounting", creditHours: 3, description: "Financial accounting principles and reporting.", relatedMajors: ["Accounting", "Business Administration", "Finance"], enrolledCount: 0 },
  { classId: "mgt3303", courseCode: "MGT 3303", courseName: "Principles of Management", department: "Management", creditHours: 3, description: "Planning, organizing, leading in organizations.", relatedMajors: ["Management", "Business Administration", "Entrepreneurship"], enrolledCount: 0 },
  { classId: "nurs1001", courseCode: "NURS 1001", courseName: "Introduction to Professional Nursing", department: "Nursing", creditHours: 1, description: "Overview of nursing profession and responsibilities.", relatedMajors: ["Nursing (BSN)"], enrolledCount: 0 },
  { classId: "psyc1000", courseCode: "PSYC 1000", courseName: "Introduction to Psychology", department: "Psychology", creditHours: 3, description: "Survey of major areas of psychology.", relatedMajors: ["Psychology", "Neuroscience", "Criminal Justice"], enrolledCount: 0 },
];

async function seed() {
  console.log(`Seeding ${CLASSES.length} classes into ${TABLE_NAME}...`);
  
  for (const cls of CLASSES) {
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: cls }));
    console.log(`  ✅ ${cls.courseCode} — ${cls.courseName}`);
  }
  
  console.log(`\nDone! ${CLASSES.length} classes seeded.`);
}

seed().catch(console.error);
