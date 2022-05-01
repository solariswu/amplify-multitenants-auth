import {Construct} from 'constructs';
import {Function, Code, Runtime} from 'aws-cdk-lib/aws-lambda';
import {Duration} from 'aws-cdk-lib';
import * as path from 'path';

export const createPostConfirmLambda = (
    scope: Construct
) => {
    const postconfirmLambda = new Function(scope, 'mtPostConfirmFn', {
        runtime: Runtime.NODEJS_14_X,
        handler: 'postconfirm.main',
        code: Code.fromAsset(path.join(__dirname, '/../lambda/postconfirm')),
        timeout: Duration.minutes(5)
    });

    return postconfirmLambda;
};
