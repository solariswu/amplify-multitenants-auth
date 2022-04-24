import {PolicyStatement} from 'aws-cdk-lib/aws-iam';

// basic lambda policy
export const getBasicLambdaPolicy = () => {
    return new PolicyStatement({
        actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
        ],
        resources: ['arn:aws:logs:*:*:*']
    });
};

// group/tenant related policy
export const getGroupLambdaPolicy = (userpoolarn: string) => {
    return new PolicyStatement({
        actions: [
            'cognito-idp:GetGroup',
            'cognito-idp:ListGroups',
            'cognito-idp:CreateGroup',
            'cognito-idp:DeleteGroup'
        ],
        resources: [userpoolarn]
    });
};

// idp related policy
export const getIdpLambdaPolicy = (userpoolarn: string) => {
    return new PolicyStatement({
        actions: [
            'cognito-idp:CreateIdentityProvider',
            'cognito-idp:DescribeIdentityProvider',
            'cognito-idp:ListIdentityProviders',
            'cognito-idp:DeleteIdentityProvider',
            'cognito-idp:DescribeUserPoolClient',
            'cognito-idp:UpdateUserPoolClient'
        ],
        resources: [userpoolarn]
    });
};

// user related policy
export const getUserLambdaPolicy = (userpoolarn: string) => {
    return new PolicyStatement({
        actions: [
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminAddUserToGroup',
            'cognito-idp:ListUsers',
            'cognito-idp:ListUsersInGroup',
            'cognito-idp:AdminListGroupsForUser',
            'cognito-idp:AdminDeleteUser',
            'cognito-idp:AdminDisableUser',
            'cognito-idp:AdminEnableUser'
        ],
        resources: [userpoolarn]
    });
};

export const getInitLambdaPolicy = (userpoolarn: string) => {
    return new PolicyStatement({
        actions: [
            'cognito-idp:CreateGroup',
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminAddUserToGroup'
        ],
        resources: [userpoolarn]
    });
};