import { defineBackend } from '@aws-amplify/backend';
import { defineFunction } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

/**
 * Define the RDS connector function
 */
const rdsConnector = defineFunction({
  name: 'rdsConnector',
  entry: './functions/rds-connector/handler.js',
  environment: {
    RDS_ENDPOINT: 'your-rds-endpoint.rds.amazonaws.com',
    RDS_DATABASE: 'cloudops',
    RDS_USER: 'postgres',
    RDS_PASSWORD: 'your-password'
  }
});

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  rdsConnector
});

/**
 * Grant RDS and Secrets Manager permissions to the Lambda function
 */
backend.rdsConnector.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'rds-data:ExecuteStatement',
      'rds-data:BatchExecuteStatement',
      'secretsmanager:GetSecretValue',
      'ec2:CreateNetworkInterface',
      'ec2:DescribeNetworkInterfaces',
      'ec2:DeleteNetworkInterface'
    ],
    resources: ['*']
  })
);

/**
 * Create REST API with Lambda integration
 */
const api = new apigateway.RestApi(backend.stack, 'CloudOpsAPI', {
  restApiName: 'CloudOps Service',
  description: 'REST API for CloudOps application',
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'Authorization'],
  },
});

// Lambda integration
const lambdaIntegration = new apigateway.LambdaIntegration(backend.rdsConnector.resources.lambda);

// Users endpoints
const users = api.root.addResource('users');
users.addMethod('GET', lambdaIntegration); // List users
users.addMethod('POST', lambdaIntegration); // Create user

const user = users.addResource('{userId}');
user.addMethod('GET', lambdaIntegration); // Get user by ID

const userSkills = user.addResource('skills');
userSkills.addMethod('GET', lambdaIntegration); // Get user skills

// Projects endpoints
const projects = api.root.addResource('projects');
projects.addMethod('GET', lambdaIntegration); // List projects
projects.addMethod('POST', lambdaIntegration); // Create project

const project = projects.addResource('{projectId}');
project.addMethod('GET', lambdaIntegration); // Get project by ID

const projectSkills = project.addResource('skills');
projectSkills.addMethod('GET', lambdaIntegration); // Get project skills

// Add API endpoint to outputs
backend.addOutput({
  custom: {
    API: {
      endpoint: api.url,
      name: api.restApiName,
    }
  }
});
