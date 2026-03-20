// MOCK DATA TOGGLE: 
// In a real database-connected environment, this array would be populated 
// dynamically by fetching the current user's enrolled classes from DynamoDB.
// 
// To view the Empty Dashboard and Sidebar States, uncomment the empty array below:
//export const MOCK_ENROLLED_CLASSES: any[] = [];

export const MOCK_ENROLLED_CLASSES = [
  {
    id: "csci1010",
    name: "CSCI 1010",
    title: "Algorithmic Problem Solving. Introduction to problem-solving concepts and program design.",
    color: "purple",
    theme: "purple",
    icon: "💻",
    students: 47
  },
  {
    id: "math1065",
    name: "MATH 1065",
    title: "College Algebra. Functions, graphs, equations, and inequalities. Essential for STEM.",
    color: "gold",
    theme: "gold",
    icon: "📐",
    students: 112
  }
];
