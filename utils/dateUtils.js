/**
 * Date validation utilities for member import
 */

/**
 * Validates birth date and checks if person is at least 18 years old
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @returns {Object} - Validation result with isValid and message
 */
function validateBirthDate(birthDate) {
  try {
    // Check if date is valid
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        message: 'Invalid date format'
      };
    }

    // Check if date is in the future
    const today = new Date();
    if (date > today) {
      return {
        isValid: false,
        message: 'Birth date cannot be in the future'
      };
    }

    // Check if date is before 1900
    const minDate = new Date('1900-01-01');
    if (date < minDate) {
      return {
        isValid: false,
        message: 'Birth date must be after 1900-01-01'
      };
    }

    // Calculate age
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      actualAge = age - 1;
    }

    // Check if person is at least 18 years old
    if (actualAge < 18) {
      return {
        isValid: false,
        message: 'Member must be at least 18 years old'
      };
    }

    return {
      isValid: true,
      message: 'Valid birth date',
      age: actualAge
    };

  } catch (error) {
    return {
      isValid: false,
      message: 'Error validating birth date: ' + error.message
    };
  }
}

/**
 * Formats date to YYYY-MM-DD format
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  if (!date) return null;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  return d.toISOString().split('T')[0];
}

/**
 * Validates date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid format
 */
function isValidDateFormat(dateString) {
  if (!dateString) return false;
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
}

module.exports = {
  validateBirthDate,
  formatDate,
  isValidDateFormat
};


