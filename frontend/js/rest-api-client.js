// REST API client for CloudOps
// This uses the REST API endpoints instead of GraphQL

const API_BASE_URL = window.amplifyOutputs?.custom?.API?.endpoint || 'https://your-api-gateway-url';

/**
 * Make API request
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// ==================== USER OPERATIONS ====================

/**
 * Get a user by ID
 */
export async function getUser(userId) {
  return await apiRequest(`/users/${userId}`);
}

/**
 * List users with optional filters
 */
export async function listUsers(filters = {}) {
  const queryString = new URLSearchParams(filters).toString();
  const endpoint = `/users${queryString ? '?' + queryString : ''}`;
  return await apiRequest(endpoint);
}

/**
 * Create a new user
 */
export async function createUser(userData) {
  return await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Get user skills
 */
export async function getUserSkills(userId) {
  return await apiRequest(`/users/${userId}/skills`);
}

// ==================== PROJECT OPERATIONS ====================

/**
 * List projects with optional filters
 */
export async function listProjects(filters = {}) {
  const queryString = new URLSearchParams(filters).toString();
  const endpoint = `/projects${queryString ? '?' + queryString : ''}`;
  return await apiRequest(endpoint);
}

/**
 * Create a new project
 */
export async function createProject(projectData) {
  return await apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
}

/**
 * Get project skills
 */
export async function getProjectSkills(projectId) {
  return await apiRequest(`/projects/${projectId}/skills`);
}

// Export API base URL for custom requests
export { API_BASE_URL };
