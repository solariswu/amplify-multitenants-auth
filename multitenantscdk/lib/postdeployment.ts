import {Construct} from 'constructs';
import {TriggerFunction} from 'aws-cdk-lib/triggers';

import {Code, Runtime} from 'aws-cdk-lib/aws-lambda';
import {Policy} from 'aws-cdk-lib/aws-iam';
import {UserPool, UserPoolClient} from 'aws-cdk-lib/aws-cognito';
import {Duration} from 'aws-cdk-lib';

import {getBasicLambdaPolicy, getInitLambdaPolicy} from './lambdaIAMPolicy';

import * as path from 'path';

export const createPostDeploymentLambda = (
    scope: Construct,
    userpool: UserPool,
    adminEmail: string
) => {
    const initLambda = new TriggerFunction(scope, 'mtCDKinitLambda', {
        runtime: Runtime.NODEJS_14_X,
        handler: 'init.main',
        code: Code.fromAsset(path.join(__dirname + '/../lambda/init')),
        environment: {
            USERPOOL_ID: userpool.userPoolId,
            ADMIN_EMAIL: adminEmail
        },
        timeout: Duration.minutes(5)
    });

    initLambda.role?.attachInlinePolicy(
        new Policy(scope, `mt-init-lambda-policy`, {
            statements: [
                getBasicLambdaPolicy(),
                getInitLambdaPolicy(userpool.userPoolArn)
            ]
        })
    );
};
