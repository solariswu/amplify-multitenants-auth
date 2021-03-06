const aws = require('aws-sdk');
const BENEFITADMIN = 'benefitflowAdmin';
const TENANTADMIN = 'clientAdmin';
const TRIAL = 'trial';
const TENANTSAPI_PATH = '/tenants';
const AUTOGENERATED_GROUP = 'Autogenerated group';

const region = process.env.AWS_REGION;
const UserPoolId = process.env.USERPOOL_ID;
const CognitoIdentityServiceProvider = aws.CognitoIdentityServiceProvider;
const client = new CognitoIdentityServiceProvider({
    apiVersion: '2016-04-19',
    region
});

const headers = {
    'Access-Control-Allow-Headers':
        'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE'
};

const PERMISSION_DENY = {
    statusCode: 403,
    headers,
    body: JSON.stringify({message: 'Permission Deny'}),
    isBase64Encoded: false
};

const INVAID_PARAMS = {
    statusCode: 400,
    headers,
    body: JSON.stringify({message: 'Invalid Input Parameters'}),
    isBase64Encoded: false
};

const retrieveRequesterGroup = (requestContext) => {
    const groups = [];
    if (
        requestContext &&
        requestContext.authorizer &&
        requestContext.authorizer.claims &&
        requestContext.authorizer.claims['cognito:groups']
    ) {
        const claims = requestContext.authorizer.claims;
        let groupsArray = claims['cognito:groups'].split(',');
        groupsArray.map((x) => groups.push(x));
    }

    console.log('requester groups:', groups);
    return groups;
};

const getAllTenants = async () => {
    const tenants = [];

    let listGroupsParams = {
        UserPoolId,
        Limit: 60
    };

    console.log(`Getting all tenants in ${UserPoolId}`);

    do {
        try {
            const listGroupsResult = await client
                .listGroups(listGroupsParams)
                .promise();
            let filteredResult = [];
            if (listGroupsResult.Groups && listGroupsResult.Groups.length > 0) {
                filteredResult = listGroupsResult.Groups.filter(
                    (group) =>
                        group.GroupName !== BENEFITADMIN &&
                        group.GroupName !== TENANTADMIN &&
                        group.GroupName !== TRIAL &&
                        (!group.Description ||
                            !group.Description.startsWith(AUTOGENERATED_GROUP))
                );
            }
            tenants.push(...filteredResult);
            listGroupsParams.NextToken = listGroupsResult.NextToken;
        } catch (err) {
            console.error('listGroups failed with:', err);
            console.error('RequestId: ' + err.requestId);
            return {
                statusCode: err.statusCode,
                headers,
                body: JSON.stringify({message: err.code}),
                isBase64Encoded: false
            };
        }
    } while (listGroupsParams.NextToken);
    const body = JSON.stringify({Tenants: tenants});

    return {
        statusCode: 200,
        headers,
        body,
        isBase64Encoded: false
    };
};

const getTenant = async (tenantId) => {
    const tenants = [];
    console.log('tenantId:', tenantId);
    let getGroupParams = {
        UserPoolId,
        GroupName: tenantId
    };
    console.log('getGroupParams:', getGroupParams);

    try {
        const getGroupResult = await client.getGroup(getGroupParams).promise();

        if (
            getGroupResult.Group &&
            getGroupResult.Group.GroupName &&
            getGroupResult.Group.GroupName !== BENEFITADMIN &&
            getGroupResult.Group.GroupName !== TENANTADMIN &&
            getGroupResult.Group.GroupName !== TRIAL &&
            (!getGroupResult.Group.Description ||
                !getGroupResult.Group.Description.startsWith(
                    'Autogenerated group'
                ))
        ) {
            tenants.push(getGroupResult.Group);
        }
    } catch (err) {
        console.error('Get Tenants failed with:', err);
        console.error('RequestId: ' + err.requestId);
        return {
            statusCode: err.statusCode,
            headers,
            body: JSON.stringify({message: err.code}),
            isBase64Encoded: false
        };
    }

    const body = JSON.stringify({Tenants: tenants});

    return {
        statusCode: 200,
        headers,
        body,
        isBase64Encoded: false
    };
};

const createTenantId = async (tenantId, Description = null) => {
    const createGroupParams = {
        UserPoolId,
        GroupName: tenantId,
        Description
    };

    try {
        const createGroupResult = await client
            .createGroup(createGroupParams)
            .promise();
        const body = JSON.stringify({message: `tenant ${tenantId} created`});
        return {
            statusCode: 200,
            headers,
            body,
            isBase64Encoded: false
        };
    } catch (err) {
        console.error('create tenant-' + tenantId + ' failed with:', err);
        console.error('RequestId: ' + err.requestId);
        return {
            statusCode: err.statusCode,
            headers,
            body: JSON.stringify({message: err.code}),
            isBase64Encoded: false
        };
    }
};

const deleteTenantId = async (tenantId) => {
    const deleteGroupParams = {
        UserPoolId,
        GroupName: tenantId
    };

    try {
        const deleteGroupResult = await client
            .deleteGroup(deleteGroupParams)
            .promise();
        const body = JSON.stringify({message: `${tenantId} deleted'`});
        return {
            statusCode: 200,
            headers,
            body,
            isBase64Encoded: false
        };
    } catch (err) {
        console.error('delete tenant-' + tenantId + ' failed with:', err);
        console.error('RequestId: ' + err.requestId);
        return {
            statusCode: err.statusCode,
            headers,
            body: JSON.stringify({message: err.code}),
            isBase64Encoded: false
        };
    }
};

exports.main = async (event) => {
    aws.config.logger = console;
    console.log('Received event:', JSON.stringify(event, null, 2));

    if (!event.path.startsWith(TENANTSAPI_PATH)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                message: `Tenants Error, invalid path - ${event.path}`
            }),
            isBase64Encoded: false
        };
    }
    const subPath = event.path.substring(TENANTSAPI_PATH.length).trim();

    const tempStr = subPath.startsWith('/') ? subPath.substring(1) : subPath;
    const tenantId = tempStr.endsWith('/')
        ? tempStr.substring(0, tempStr.length - 1)
        : tempStr;

    const requesterGroups = retrieveRequesterGroup(event.requestContext);
    const requesterTenantId = requesterGroups.filter((group) => {
        return group.trim() !== BENEFITADMIN && group.trim() !== TENANTADMIN;
    });

    const method = event.httpMethod;

    console.log('method:', method, 'subPath:', subPath);

    if (method === 'GET') {
        // GET / to get the names of tenants
        if (
            (subPath === '' || subPath === '/') &&
            requesterGroups.includes(BENEFITADMIN)
        ) {
            return getAllTenants();
        }

        if (
            (subPath === '' || subPath === '/') &&
            requesterGroups.includes(TENANTADMIN) &&
            requesterTenantId.length > 0
        ) {
            return getTenant(requesterTenantId[0]);
        }

        if (
            tenantId &&
            (requesterGroups.includes(BENEFITADMIN) ||
                (requesterGroups.includes(TENANTADMIN) &&
                    requesterTenantId.length > 0 &&
                    requesterTenantId.includes(tenantId)))
        ) {
            // GET /tenantId to get info on tenant id
            return getTenant(tenantId);
        }

        return PERMISSION_DENY;
    }

    let payload = null;
    if (event.body) {
        try {
            payload = JSON.parse(event.body);
        } catch (err) {
            return INVAID_PARAMS;
        }
    }

    if (method === 'POST' || method === 'DELETE') {
        // POST / DELETE tenantId
        // Return error if we do not have an id
        if (!tenantId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({message: 'Tenant ID is missing'}),
                isBase64Encoded: false
            };
        }

        if (!requesterGroups.includes(BENEFITADMIN)) {
            //only Benefit Admin can create / delete Tenants
            return PERMISSION_DENY;
        }

        return method === 'POST'
            ? createTenantId(tenantId, payload ? payload.description : payload)
            : deleteTenantId(tenantId);
    }
};
