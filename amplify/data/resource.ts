import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Custom types for RDS database entities
  User: a.customType({
    id: a.string().required(),
    nome: a.string().required(),
    email: a.string().required(),
    tipo_usuario: a.string().required(),
    telefone: a.string(),
    cidade: a.string().required(),
    estado: a.string().required(),
    nacionalidade: a.string(),
    escolaridade: a.string().required(),
    curso: a.string().required(),
    instituicao: a.string().required(),
    ano_formacao: a.integer(),
    tipo_disponibilidade: a.string(),
    modalidade_preferida: a.string(),
    created_at: a.datetime()
  }),

  Project: a.customType({
    id: a.string().required(),
    id_proprietario: a.string().required(),
    titulo: a.string().required(),
    description: a.string().required(),
    start_date: a.date(),
    duration: a.string(),
    min_participants: a.integer().required(),
    max_participants: a.integer().required(),
    status: a.string(),
    req_min_education: a.string(),
    req_min_publications: a.integer(),
    req_institution_origin: a.string(),
    req_nationality: a.string(),
    req_min_experience_years: a.integer(),
    req_availability: a.string(),
    strict_area: a.boolean(),
    strict_education: a.boolean(),
    strict_publications: a.boolean(),
    strict_languages: a.boolean(),
    strict_skills: a.boolean(),
    strict_institution: a.boolean(),
    strict_location: a.boolean(),
    created_at: a.datetime(),
    proprietario_nome: a.string(),
    proprietario_email: a.string()
  }),

  Skill: a.customType({
    id: a.integer().required(),
    name: a.string().required()
  }),

  // User Queries
  getUser: a
    .query()
    .arguments({ userId: a.string().required() })
    .returns(a.ref('User'))
    .handler(a.handler.function('rdsConnector'))
    .authorization((allow) => [allow.guest()]),

  listUsers: a
    .query()
    .arguments({
      tipo_usuario: a.string(),
      cidade: a.string(),
      escolaridade: a.string()
    })
    .returns(a.ref('User').array())
    .handler(a.handler.function('rdsConnector'))
    .authorization((allow) => [allow.guest()]),

  createUser: a
    .mutation()
    .arguments({
      nome: a.string().required(),
      email: a.string().required(),
      password_hash: a.string().required(),
      tipo_usuario: a.string().required(),
      cidade: a.string().required(),
      estado: a.string().required(),
      escolaridade: a.string().required(),
      curso: a.string().required(),
      instituicao: a.string().required(),
      nacionalidade: a.string(),
      ano_formacao: a.integer(),
      tipo_disponibilidade: a.string(),
      modalidade_preferida: a.string(),
      telefone: a.string()
    })
    .returns(a.ref('User'))
    .handler(a.handler.function('rdsConnector'))
    .authorization((allow) => [allow.guest()]),

  // Project Queries
  listProjects: a
    .query()
    .arguments({
      status: a.string(),
      id_proprietario: a.string()
    })
    .returns(a.ref('Project').array())
    .handler(a.handler.function('rdsConnector'))
    .authorization((allow) => [allow.guest()]),

  createProject: a
    .mutation()
    .arguments({
      id_proprietario: a.string().required(),
      titulo: a.string().required(),
      description: a.string().required(),
      min_participants: a.integer().required(),
      max_participants: a.integer().required(),
      start_date: a.date(),
      duration: a.string(),
      status: a.string(),
      req_min_education: a.string(),
      req_min_publications: a.integer(),
      req_institution_origin: a.string(),
      req_nationality: a.string(),
      req_min_experience_years: a.integer(),
      req_availability: a.string(),
      strict_area: a.boolean(),
      strict_education: a.boolean(),
      strict_publications: a.boolean(),
      strict_languages: a.boolean(),
      strict_skills: a.boolean(),
      strict_institution: a.boolean(),
      strict_location: a.boolean()
    })
    .returns(a.ref('Project'))
    .handler(a.handler.function('rdsConnector'))
    .authorization((allow) => [allow.guest()]),

  // Skills Queries
  getUserSkills: a
    .query()
    .arguments({ userId: a.string().required() })
    .returns(a.ref('Skill').array())
    .handler(a.handler.function('rdsConnector'))
    .authorization((allow) => [allow.guest()]),

  getProjectSkills: a
    .query()
    .arguments({ projectId: a.string().required() })
    .returns(a.ref('Skill').array())
    .handler(a.handler.function('rdsConnector'))
    .authorization((allow) => [allow.guest()])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
