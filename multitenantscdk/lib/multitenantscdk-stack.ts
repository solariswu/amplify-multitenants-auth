import {CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
    createUserPool,
    addUserpoolDomain,
    addHostedUIAppClient,
    addAdminAppClient
} from './userpool';
import {
    createApiGateway,
    addUsersService,
    addIdpsService,
    addTenantsService
} from './apigateway';
import {CognitoUserPoolsAuthorizer} from 'aws-cdk-lib/aws-apigateway';
import {createPostDeploymentLambda} from './postdeployment';
import { config } from './config';
// import {createIdentityPool} from './identitypool';

export class MultitenantscdkStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const stageName = config.stage;
        // The code that defines your stack goes here
        const userPool = createUserPool(this, stageName);
        // addLambdaTriggers (this, userpool);
        addUserpoolDomain(userPool, stageName, config.domain);
        const hostedUIClient = addHostedUIAppClient(this, userPool);
        const adminClient = addAdminAppClient(this, userPool);

        const apigateway = createApiGateway(this, stageName);
        // 👇 create the Authorizer
        const authorizer = new CognitoUserPoolsAuthorizer(
            this,
            'MultitenantsAuthorizer',
            {
                cognitoUserPools: [userPool]
            }
        );
        // 👇 create backend services
        const createUserService = addUsersService(
            this,
            apigateway,
            userPool,
            hostedUIClient,
            authorizer
        );
        const createIdpService = addIdpsService(
            this,
            apigateway,
            userPool,
            hostedUIClient,
            authorizer
        );
        const tenantsService = addTenantsService(
            this,
            apigateway,
            userPool,
            hostedUIClient,
            authorizer
        );
        
        createPostDeploymentLambda (this, userPool, config.adminEmail);

        new CfnOutput(this, 'userPoolId', { value: userPool.userPoolId });
        new CfnOutput(this, 'userPoolWebClientId', { value: hostedUIClient.userPoolClientId });
        // const identityPool = createIdentityPool(this, userPool, hostedUIClient);
    }
}
