const aws = require('aws-sdk');

const region = process.env.AWS_REGION;
const UserPoolId = process.env.USERPOOL_ID;
const Username = process.env.ADMIN_EMAIL;

const CognitoIdentityServiceProvider = aws.CognitoIdentityServiceProvider;
const client = new CognitoIdentityServiceProvider({
    apiVersion: '2016-04-19',
    region
});

const BENEFITADMIN = 'benefitflowAdmin';
const TENANTADMIN = 'clientAdmin';
const TRIAL = 'trial';
const GROUPS = [BENEFITADMIN, TENANTADMIN, TRIAL];

const createUser = async () => {

    let message = '';

    try {
        await Promise.all(GROUPS.map(async GroupName =>{
            const createGroupParams = {
                UserPoolId,
                GroupName
            };
        
            const createGroupResult = await client
            .createGroup(createGroupParams)
            .promise();
            
            message += `Group ${GroupName} created. `
        }));
    } catch (err) {
        console.error('create group-' + GroupName + ' failed with:', err);
        console.error('RequestId: ' + err.requestId);
        return {
            statusCode: err.statusCode,
            body: JSON.stringify({message: err.code})
        }; 
    }

    const createUserParams = {
        UserPoolId,
        Username,
        UserAttributes: [
            {
                Name: 'email',
                Value: Username
            }
        ]
    };

    try {
        await client.adminCreateUser(createUserParams).promise();
        console.log(`adminCreateUser ${Username} success`);
        message += `User ${Username} created. `;
    } catch (err) {
        console.log('adminCreateUser error:', err);
        console.log('RequestId: ' + this.requestId);
        return {
            statusCode: err.statusCode,
            body: JSON.stringify({message: err.code})
        };
    }

    try {
        const adminAddUerToGroupParams = {
            GroupName: BENEFITADMIN,
            UserPoolId,
            Username
        };

        await client.adminAddUserToGroup(adminAddUerToGroupParams).promise();

        console.log(
            'Add user ${Username} to BENEFIT FLOW ADMIN success'
        );
        message += 'Assign user Benefitflow admin successed. ';
    } catch (err) {
        console.log('Assign user Benefitflow admin error:', err);
        console.log('RequestId: ' + this.requestId);
        return {
            statusCode: err.statusCode,
            body: JSON.stringify({
                message: `${message} but got ${err.code} on assign user Benefitflow admin`
            })
        };
    }
};

exports.main = async (event) => {
    aws.config.logger = console;
    return createUser();
};
