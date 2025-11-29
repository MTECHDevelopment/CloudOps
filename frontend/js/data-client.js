// Data client for interacting with Amplify Gen 2 backend
import { generateClient } from 'aws-amplify/data';

// Generate the typed client
const client = generateClient();

// ==================== USER OPERATIONS ====================

/**
 * Get a user by ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} User data
 */
export async function getUser(userId) {
  try {
    const { data, errors } = await client.queries.getUser({ userId });
    if (errors) {
      console.error('Error fetching user:', errors);
      throw new Error(errors[0].message);
    }
    return data;
  } catch (error) {
    console.error('Error in getUser:', error);
    throw error;
  }
}

/**
 * List users with optional filters
 * @param {Object} filters - Optional filters (tipo_usuario, cidade, escolaridade)
 * @returns {Promise<Array>} Array of users
 */
export async function listUsers(filters = {}) {
  try {
    const { data, errors } = await client.queries.listUsers(filters);
    if (errors) {
      console.error('Error listing users:', errors);
      throw new Error(errors[0].message);
    }
    return data;
  } catch (error) {
    console.error('Error in listUsers:', error);
    throw error;
  }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
export async function createUser(userData) {
  try {
    const { data, errors } = await client.mutations.createUser(userData);
    if (errors) {
      console.error('Error creating user:', errors);
      throw new Error(errors[0].message);
    }
    return data;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

// ==================== PROJECT OPERATIONS ====================

/**
 * List projects with optional filters
 * @param {Object} filters - Optional filters (status, id_proprietario)
 * @returns {Promise<Array>} Array of projects
 */
export async function listProjects(filters = {}) {
  try {
    const { data, errors } = await client.queries.listProjects(filters);
    if (errors) {
      console.error('Error listing projects:', errors);
      throw new Error(errors[0].message);
    }
    return data;
  } catch (error) {
    console.error('Error in listProjects:', error);
    throw error;
  }
}

/**
 * Create a new project
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
export async function createProject(projectData) {
  try {
    const { data, errors } = await client.mutations.createProject(projectData);
    if (errors) {
      console.error('Error creating project:', errors);
      throw new Error(errors[0].message);
    }
    return data;
  } catch (error) {
    console.error('Error in createProject:', error);
    throw error;
  }
}

// ==================== SKILLS OPERATIONS ====================

/**
 * Get user skills
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of skills
 */
export async function getUserSkills(userId) {
  try {
    const { data, errors } = await client.queries.getUserSkills({ userId });
    if (errors) {
      console.error('Error fetching user skills:', errors);
      throw new Error(errors[0].message);
    }
    return data;
  } catch (error) {
    console.error('Error in getUserSkills:', error);
    throw error;
  }
}

/**
 * Get project skills
 * @param {string} projectId - The project ID
 * @returns {Promise<Array>} Array of skills
 */
export async function getProjectSkills(projectId) {
  try {
    const { data, errors } = await client.queries.getProjectSkills({ projectId });
    if (errors) {
      console.error('Error fetching project skills:', errors);
      throw new Error(errors[0].message);
    }
    return data;
  } catch (error) {
    console.error('Error in getProjectSkills:', error);
    throw error;
  }
}

// Export the client for custom operations
export { client };
