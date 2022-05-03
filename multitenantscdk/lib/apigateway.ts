import {
    RestApi,
    LambdaIntegration,
    CognitoUserPoolsAuthorizer
} from 'aws-cdk-lib/aws-apigateway';
import {Function, Code, Runtime} from 'aws-cdk-lib/aws-lambda';
import {Policy, PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {UserPool, UserPoolClient} from 'aws-cdk-lib/aws-cognito';
import {Duration} from 'aws-cdk-lib';
import * as path from 'path';

import {
    getBasicLambdaPolicy,
    getGroupLambdaPolicy,
    getIdpLambdaPolicy,
    getUserLambdaPolicy
} from './lambdaIAMPolicy';

import {Construct} from 'constructs';

const defaultCorsPreflightOptions = {
    allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization'],
    allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowCredentials: true,
    allowOrigins: ['*']
};

// create APIGateway
export const createApiGateway = (scope: Construct, stageName: string) => {
    return new RestApi(scope, 'multitenants', {
        description: 'api gateway for multitenants',
        deployOptions: {
            stageName
        },
        // 👇 enable CORS
        defaultCorsPreflightOptions
    });
};

// Generic CRUD api creation function
const addCRUDApiServices = (
    scope: Construct,
    api: RestApi,
    userpool: UserPool,
    userpoolclient: UserPoolClient,
    authorizer: CognitoUserPoolsAuthorizer,
    type: string,
    policyStatement: PolicyStatement[]
) => {
    const crudapilambda = new Function(scope, `tenants-${type}`, {
        runtime: Runtime.NODEJS_14_X,
        handler: `${type}.main`,
        code: Code.fromAsset(path.join(__dirname, `/../lambda/${type}`)),
        environment: {
            USERPOOL_ID: userpool.userPoolId,
            APPCLIENT_ID: userpoolclient.userPoolClientId
        },
        timeout: Duration.minutes(5)
    });

    crudapilambda.role?.attachInlinePolicy(
        new Policy(scope, `mt-${type}-lambdaapi-policy`, {
            statements: policyStatement
        })
    );

    // 👇 add a /tenants/{id} resource
    const rootpathApi = api.root.addResource(`${type}`, {
        // 👇 enable CORS
        defaultCorsPreflightOptions
    });
    const subpathApi = rootpathApi.addResource('{id}', {
        // 👇 enable CORS
        defaultCorsPreflightOptions
    });

    rootpathApi.addMethod(
        'GET',
        new LambdaIntegration(crudapilambda, {proxy: true}),
        {authorizer}
    );

    // 👇 integrate POST / GET / DELETE tenants with tenants lambda
    ['GET', 'POST', 'DELETE'].map((method) =>
        subpathApi.addMethod(
            method,
            new LambdaIntegration(crudapilambda, {proxy: true}),
            {authorizer}
        )
    );

    return subpathApi;
};

export const addUsersService = (
    scope: Construct,
    api: RestApi,
    userpool: UserPool,
    userpoolclient: UserPoolClient,
    authorizer: CognitoUserPoolsAuthorizer
) => {
    return addCRUDApiServices(
        scope,
        api,
        userpool,
        userpoolclient,
        authorizer,
        'users',
        [getBasicLambdaPolicy(), getUserLambdaPolicy(userpool.userPoolArn)]
    );
};

export const addIdpsService = (
    scope: Construct,
    api: RestApi,
    userpool: UserPool,
    userpoolclient: UserPoolClient,
    authorizer: CognitoUserPoolsAuthorizer
) => {
    return addCRUDApiServices(
        scope,
        api,
        userpool,
        userpoolclient,
        authorizer,
        'idps',
        [getBasicLambdaPolicy(), getIdpLambdaPolicy(userpool.userPoolArn)]
    );
};

export const addTenantsService = (
    scope: Construct,
    api: RestApi,
    userpool: UserPool,
    userpoolclient: UserPoolClient,
    authorizer: CognitoUserPoolsAuthorizer
) => {
    return addCRUDApiServices(
        scope,
        api,
        userpool,
        userpoolclient,
        authorizer,
        'tenants',
        [getBasicLambdaPolicy(), getGroupLambdaPolicy(userpool.userPoolArn)]
    );
};
