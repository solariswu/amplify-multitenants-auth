import {Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
    UserPool,
    UserPoolClient,
    CfnIdentityPool,
    CfnIdentityPoolRoleAttachment
} from 'aws-cdk-lib/aws-cognito';
import {Role, FederatedPrincipal, ManagedPolicy} from 'aws-cdk-lib/aws-iam';

export const createIdentityPool = (
    scope: Construct,
    userPool: UserPool,
    userPoolClient: UserPoolClient
) => {
    const identityPool = new CfnIdentityPool(scope, 'multitenantidentitypool', {
        allowUnauthenticatedIdentities: true,
        cognitoIdentityProviders: [
            {
                clientId: userPoolClient.userPoolClientId,
                providerName: userPool.userPoolProviderName
            }
        ]
    });

    const isAnonymousCognitoGroupRole = new Role(
        scope,
        'anonymous-group-role',
        {
            description: 'Default role for anonymous users',
            assumedBy: new FederatedPrincipal(
                'cognito-identity.amazonaws.com',
                {
                    StringEquals: {
                        'cognito-identity.amazonaws.com:aud': identityPool.ref
                    },
                    'ForAnyValue:StringLike': {
                        'cognito-identity.amazonaws.com:amr': 'unauthenticated'
                    }
                },
                'sts:AssumeRoleWithWebIdentity'
            ),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AWSLambdaBasicExecutionRole'
                )
            ]
        }
    );

    const isUserCognitoGroupRole = new Role(scope, 'users-group-role', {
        description: 'Default role for authenticated users',
        assumedBy: new FederatedPrincipal(
            'cognito-identity.amazonaws.com',
            {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': identityPool.ref
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated'
                }
            },
            'sts:AssumeRoleWithWebIdentity'
        ),
        managedPolicies: [
            ManagedPolicy.fromAwsManagedPolicyName(
                'service-role/AWSLambdaBasicExecutionRole'
            )
        ]
    });

    new CfnIdentityPoolRoleAttachment(scope, 'identity-pool-role-attachment', {
        identityPoolId: identityPool.ref,
        roles: {
            authenticated: isUserCognitoGroupRole.roleArn,
            unauthenticated: isAnonymousCognitoGroupRole.roleArn
        },
        roleMappings: {
            mapping: {
                type: 'Token',
                ambiguousRoleResolution: 'AuthenticatedRole',
                identityProvider: `cognito-idp.${
                    Stack.of(scope).region
                }.amazonaws.com/${userPool.userPoolId}:${
                    userPoolClient.userPoolClientId
                }`
            }
        }
    });
};
