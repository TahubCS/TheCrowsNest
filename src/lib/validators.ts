/**
 * ECU Email Validator
 * Shared between server and client branches.
 * 
 * Client usage: import and call on input change to show
 * red outline + error message in real-time.
 */

export function validateEcuEmail(email: string): {
  valid: boolean;
  message: string;
} {
  if (!email || email.trim() === "") {
    return { valid: false, message: "Email is required." };
  }

  const trimmed = email.trim().toLowerCase();

  if (!trimmed.includes("@")) {
    return { valid: false, message: "Please enter a valid email address." };
  }

  if (!trimmed.endsWith("@students.ecu.edu")) {
    return {
      valid: false,
      message: "Only ECU students can register. Please use your @students.ecu.edu email.",
    };
  }

  return { valid: true, message: "" };
}

/**
 * Basic password strength check
 */
export function validatePassword(password: string): {
  valid: boolean;
  message: string;
} {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters." };
  }
  return { valid: true, message: "" };
}
