const { Client } = require('pg');

const dbConfig = {
  host: process.env.RDS_ENDPOINT,
  port: 5432,
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

exports.handler = async (event) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    // Handle both GraphQL (Amplify Data) and REST API Gateway events
    let operation, args;
    
    if (event.operation) {
      // GraphQL event from Amplify Data
      operation = event.operation;
      args = event.arguments || {};
    } else if (event.httpMethod) {
      // REST API Gateway event
      const path = event.path;
      const method = event.httpMethod;
      const pathParams = event.pathParameters || {};
      const queryParams = event.queryStringParameters || {};
      const body = event.body ? JSON.parse(event.body) : {};
      
      // Route based on path and method
      if (path === '/users' && method === 'GET') {
        operation = 'listUsers';
        args = queryParams;
      } else if (path === '/users' && method === 'POST') {
        operation = 'createUser';
        args = body;
      } else if (path.match(/\/users\/[^/]+$/) && method === 'GET') {
        operation = 'getUser';
        args = { userId: pathParams.userId };
      } else if (path.match(/\/users\/[^/]+\/skills/) && method === 'GET') {
        operation = 'getUserSkills';
        args = { userId: pathParams.userId };
      } else if (path === '/projects' && method === 'GET') {
        operation = 'listProjects';
        args = queryParams;
      } else if (path === '/projects' && method === 'POST') {
        operation = 'createProject';
        args = body;
      } else if (path.match(/\/projects\/[^/]+\/skills/) && method === 'GET') {
        operation = 'getProjectSkills';
        args = { projectId: pathParams.projectId };
      } else {
        throw new Error(`Unknown route: ${method} ${path}`);
      }
    } else {
      throw new Error('Unknown event type');
    }
    
    // Execute operation
    let result;
    switch (operation) {
      case 'getUser':
        result = await getUser(client, args.userId);
        break;
      case 'listUsers':
        result = await listUsers(client, args);
        break;
      case 'createUser':
        result = await createUser(client, args);
        break;
      case 'listProjects':
        result = await listProjects(client, args);
        break;
      case 'createProject':
        result = await createProject(client, args);
        break;
      case 'getUserSkills':
        result = await getUserSkills(client, args.userId);
        break;
      case 'getProjectSkills':
        result = await getProjectSkills(client, args.projectId);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    // Return appropriate response format
    if (event.httpMethod) {
      // REST API Gateway response
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result)
      };
    } else {
      // GraphQL response
      return result;
    }
  } catch (error) {
    console.error('Database error:', error);
    
    if (event.httpMethod) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: error.message })
      };
    } else {
      throw error;
    }
  } finally {
    await client.end();
  }
};

async function getUser(client, userId) {
  const result = await client.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

async function listUsers(client, filters = {}) {
  let query = 'SELECT * FROM users WHERE 1=1';
  const params = [];
  
  if (filters.tipo_usuario) {
    params.push(filters.tipo_usuario);
    query += ` AND tipo_usuario = $${params.length}`;
  }
  
  if (filters.cidade) {
    params.push(filters.cidade);
    query += ` AND cidade = $${params.length}`;
  }
  
  if (filters.escolaridade) {
    params.push(filters.escolaridade);
    query += ` AND escolaridade = $${params.length}`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = await client.query(query, params);
  return result.rows;
}

async function createUser(client, data) {
  const result = await client.query(
    `INSERT INTO users 
    (nome, email, password_hash, tipo_usuario, cidade, estado, 
     nacionalidade, escolaridade, curso, instituicao, ano_formacao,
     tipo_disponibilidade, modalidade_preferida, telefone)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      data.nome, 
      data.email, 
      data.password_hash, 
      data.tipo_usuario,
      data.cidade, 
      data.estado, 
      data.nacionalidade || 'Brasileiro',
      data.escolaridade, 
      data.curso,
      data.instituicao,
      data.ano_formacao || null,
      data.tipo_disponibilidade || null,
      data.modalidade_preferida || null,
      data.telefone || null
    ]
  );
  return result.rows[0];
}

async function listProjects(client, filters = {}) {
  let query = `
    SELECT p.*, u.nome as proprietario_nome, u.email as proprietario_email
    FROM projects p
    LEFT JOIN users u ON p.id_proprietario = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (filters.status) {
    params.push(filters.status);
    query += ` AND p.status = $${params.length}`;
  }
  
  if (filters.id_proprietario) {
    params.push(filters.id_proprietario);
    query += ` AND p.id_proprietario = $${params.length}`;
  }
  
  query += ' ORDER BY p.created_at DESC';
  
  const result = await client.query(query, params);
  return result.rows;
}

async function createProject(client, data) {
  const result = await client.query(
    `INSERT INTO projects 
    (id_proprietario, titulo, description, start_date, duration,
     min_participants, max_participants, status, req_min_education,
     req_min_publications, req_institution_origin, req_nationality,
     req_min_experience_years, req_availability, strict_area,
     strict_education, strict_publications, strict_languages,
     strict_skills, strict_institution, strict_location)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *`,
    [
      data.id_proprietario,
      data.titulo,
      data.description,
      data.start_date || null,
      data.duration || null,
      data.min_participants,
      data.max_participants,
      data.status || 'OPEN',
      data.req_min_education || null,
      data.req_min_publications || 0,
      data.req_institution_origin || null,
      data.req_nationality || null,
      data.req_min_experience_years || null,
      data.req_availability || null,
      data.strict_area || false,
      data.strict_education || false,
      data.strict_publications || false,
      data.strict_languages || false,
      data.strict_skills || false,
      data.strict_institution || false,
      data.strict_location || false
    ]
  );
  return result.rows[0];
}

async function getUserSkills(client, userId) {
  const result = await client.query(
    `SELECT s.id, s.name
     FROM user_skills us
     JOIN skills s ON us.skill_id = s.id
     WHERE us.user_id = $1`,
    [userId]
  );
  return result.rows;
}

async function getProjectSkills(client, projectId) {
  const result = await client.query(
    `SELECT s.id, s.name
     FROM project_skills ps
     JOIN skills s ON ps.skill_id = s.id
     WHERE ps.project_id = $1`,
    [projectId]
  );
  return result.rows;
}
