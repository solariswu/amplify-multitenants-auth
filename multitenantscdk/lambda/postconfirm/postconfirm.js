const aws = require('aws-sdk');
const BENEFITADMIN = 'benefitflowAdmin';
const TENANTADMIN = 'clientAdmin';
const TRIAL = 'trial';
const AUTOGENERATED_GROUP = 'Autogenerated group';

const region = process.env.AWS_REGION;
// const UserPoolId = process.env.USERPOOL_ID;
const CognitoIdentityServiceProvider = aws.CognitoIdentityServiceProvider;
const client = new CognitoIdentityServiceProvider({
    apiVersion: '2016-04-19',
    region
});

const getUserGroups = async (Username, UserPoolId) => {
    const adminListGroupsForUserParam = {
        UserPoolId,
        Username
    };
    try {
        // check whether user belongs to this tenant
        const adminListGroupsForUserResult = await client
            .adminListGroupsForUser(adminListGroupsForUserParam)
            .promise();
        return adminListGroupsForUserResult.Groups;
    } catch (err) {
        console.log('get user group error:', err);
        return [];
    }
};

exports.main = async (event, context, callback) => {
    aws.config.logger = console;

    if (
        event.request.userAttributes &&
        event.request.userAttributes.email &&
        event.request.userAttributes['cognito:user_status'] ===
            'EXTERNAL_PROVIDER'
    ) {
        console.log('event:', event);
        const Username = event.userName;
        try {
            const identities = JSON.parse(
                event.request.userAttributes.identities
            );

            let groups = await getUserGroups(
                event.request.userAttributes.email,
                event.userPoolId
            );
            console.log(
                'native user with the same email has those assigned groups:',
                groups
            );
            if (identities[0].providerName) {
                const groupIdpName = identities[0].providerName.split('-');
                const groupName = groupIdpName[0];

                if (groupName && !groups.includes(groupName)) {
                    groups.push(groupName);
                }
            }

            await Promise.all(
                groups.map(async (tenantId) => {
                    const adminAddUserToGroupParam = {
                        UserPoolId: event.userPoolId,
                        Username,
                        GroupName: tenantId
                    };
                    await client
                        .adminAddUserToGroup(adminAddUserToGroupParam)
                        .promise();
                    console.log(
                        '',
                        Username,
                        ' has granted with tenantId:',
                        tenantId
                    );
                })
            );
        } catch (err) {
            callback(err, event);
        }
    }

    callback(null, event);
};