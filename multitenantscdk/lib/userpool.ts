import {Construct} from 'constructs';
import {
    UserPool,
    UserPoolClient,
    OAuthScope,
    AccountRecovery,
    Mfa,
    UserPoolOperation
} from 'aws-cdk-lib/aws-cognito';
import {Policy, PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {Duration} from 'aws-cdk-lib';
import { createPostConfirmLambda } from './lambdas';
import { getBasicLambdaPolicy } from './lambdaIAMPolicy';

export const addHostedUIAppClient = (scope: Construct, userpool: UserPool) => {
    return new UserPoolClient(scope, 'hostedUIClient', {
        userPool: userpool,
        generateSecret: false,
        authFlows: {
            userSrp: true
        },
        oAuth: {
            flows: {
                authorizationCodeGrant: true
            },
            scopes: [
                OAuthScope.OPENID,
                OAuthScope.PROFILE,
                OAuthScope.COGNITO_ADMIN
            ],
            callbackUrls: [
                'https://multitenants.aws-amplify.dev',
                'http://localhost:3000'
            ],
            logoutUrls: [
                'https://multitenants.aws-amplify.dev',
                'http://localhost:3000'
            ]
        },
        userPoolClientName: 'hostedUIClient'
    });
};

export const addAdminAppClient = (scope: Construct, userpool: UserPool) => {
    return new UserPoolClient(scope, 'adminClient', {
        userPool: userpool,
        generateSecret: true,
        authFlows: {
            userSrp: true
        },
        userPoolClientName: 'adminClient'
    });
};

export const createUserPool = (scope: Construct, stageName: string) => {

    const postconfirmLambda = createPostConfirmLambda(scope);

    const userpool = new UserPool(scope, `multitenant-${stageName}`, {
        userPoolName: `multitenant-${stageName}`,
        // other option would be { email: true, phone: false }
        signInAliases: {
            // email as username
            email: true
        },
        // user attributes
        standardAttributes: {
            email: {
                required: true,
                mutable: true
            }
        },
        // temporary password lives for 30 days
        passwordPolicy: {
            tempPasswordValidity: Duration.days(30),
            requireSymbols: true,
            requireDigits: true,
            requireLowercase: true,
            requireUppercase: true
        },
        // no customer attribute
        // MFA optional
        mfa: Mfa.OPTIONAL,
        // forgotPassword recovery method, phone by default
        accountRecovery: AccountRecovery.EMAIL_ONLY,
        lambdaTriggers: {
            postConfirmation: postconfirmLambda
        }
    });


    postconfirmLambda.role?.attachInlinePolicy(
        new Policy(scope, `mt-postconfirm-lambda-policy`, {
            statements: [
                new PolicyStatement({
                    actions: [
                        'cognito-idp:AdminListGroupsForUser',
                        'cognito-idp:AdminGetUser',
                        'cognito-idp:AdminRemoveUserFromGroup',
                        'cognito-idp:AdminAddUserToGroup'
                    ],
                    resources: [userpool.userPoolArn]
                }),
                getBasicLambdaPolicy()                
            ]
        })
    );

    return userpool;
};

export const addUserpoolDomain = (
    userpool: UserPool,
    stage: string,
    domainName: string
) => {
    if (stage === 'dev') {
        userpool.addDomain('multiTenantsDomain', {
            cognitoDomain: {
                domainPrefix: domainName
            }
        });
    }

    // custom domain - production stage use this
    // const certificateArn =
    //     'arn:aws:acm:us-east-1:123456789012:certificate/11-3336f1-44483d-adc7-9cd375c5169d';

    // const domainCert = certificatemanager.Certificate.fromCertificateArn(
    //     this,
    //     'domainCert',
    //     certificateArn
    // );
    // userpool.addDomain('CustomDomain', {
    //     customDomain: {
    //         domainName: 'user.myapp.com',
    //         certificate: domainCert
    //     }
    // });
};
