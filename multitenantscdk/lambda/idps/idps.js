const aws = require('aws-sdk');
const BENEFITADMIN = 'benefitflowAdmin';
const TENANTADMIN = 'clientAdmin';
const IDPSAPI_PATH = '/idps';

const MetadataFilePart1 =
    '<?xml version="1.0" encoding="UTF-8"?><md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="';
const MetadataFilePart2 =
    '" validUntil="2027-03-30T02:19:18.000Z"><md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"><md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>';
const MetadataFilePart3 =
    '</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="';
const MetadataFilePart4 =
    '"/><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="';
const MetadataFilePart5 = '"/></md:IDPSSODescriptor></md:EntityDescriptor>';

const region = process.env.AWS_REGION;
const UserPoolId = process.env.USERPOOL_ID;
const ClientId = process.env.APPCLIENT_ID;

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
    body: JSON.stringify({message: 'Permission Deny'})
};

const INVAID_PARAMS = {
    statusCode: 400,
    headers,
    body: JSON.stringify({message: 'Invalid Input Parameters'})
};

const response = (statusCode = 200, body = '') => {
    return {
        statusCode,
        headers,
        body
    };
};

const isInputValid = (payload) => {
    console.log('API idps received payload:', payload);

    if (payload) {
        if (payload.type.trim() === 'SAML') {
            return (
                payload &&
                payload.domains &&
                payload.domains.length > 0 &&
                (payload.metadataurl ||
                    (payload.entityid && payload.logonurl && payload.cert))
            );
        }
    }

    return false;
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

    console.log('requester roles:', groups);
    return groups;
};

const buildMetaData = (entityid, cert, logonurl) => {
    return `${MetadataFilePart1}${decodeURIComponent(
        entityid
    )}${MetadataFilePart2}${decodeURIComponent(
        cert
    )}${MetadataFilePart3}${decodeURIComponent(
        logonurl
    )}${MetadataFilePart4}${decodeURIComponent(logonurl)}${MetadataFilePart5}`;
};

const createIdp = async (tenantId, idpname, input) => {
    if (!isInputValid(input)) {
        return INVAID_PARAMS;
    }

    const IdpIdentifiers = [];
    const ProviderType = input.type ? input.type : 'SAML';
    const ProviderName = `${tenantId}-${idpname}`;
    Array.isArray(input.domains)
        ? IdpIdentifiers.push(...input.domains)
        : IdpIdentifiers.push(input.domains);

    let params = {
        ProviderName,
        ProviderType,
        UserPoolId,
        IdpIdentifiers,
        ProviderDetails: {},
        AttributeMapping: {}
    };

    input.metadataurl
        ? (params.ProviderDetails.MetadataURL = decodeURIComponent(
              input.metadataurl
          ))
        : (params.ProviderDetails.MetadataFile = buildMetaData(
              input.entityid,
              input.cert,
              input.logonurl
          ));

    input.isazure
        ? (params.AttributeMapping.email =
              'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress')
        : (params.AttributeMapping.email = 'email');

    console.log('create idp params:', params);

    let body = '';

    try {
        const createIdentityProviderResult = await client
            .createIdentityProvider(params)
            .promise();

        console.log('Create new IdP success:', createIdentityProviderResult);
        let appClientParams = {
            ClientId,
            UserPoolId
        };

        const describeUserPoolClientResult = await client
            .describeUserPoolClient(appClientParams)
            .promise();

        appClientParams = {
            ClientId,
            UserPoolId,
            AllowedOAuthFlows:
                describeUserPoolClientResult.UserPoolClient.AllowedOAuthFlows,
            AllowedOAuthFlowsUserPoolClient: true,
            AllowedOAuthScopes:
                describeUserPoolClientResult.UserPoolClient.AllowedOAuthScopes,
            CallbackURLs:
                describeUserPoolClientResult.UserPoolClient.CallbackURLs,
            ClientName: describeUserPoolClientResult.UserPoolClient.ClientName,
            ExplicitAuthFlows:
                describeUserPoolClientResult.UserPoolClient.ExplicitAuthFlows,
            LogoutURLs: describeUserPoolClientResult.UserPoolClient.LogoutURLs,
            SupportedIdentityProviders: [
                ...describeUserPoolClientResult.UserPoolClient
                    .SupportedIdentityProviders,
                `${tenantId}-${idpname}`
            ]
        };

        const updateUserPoolClientResult = await client
            .updateUserPoolClient(appClientParams)
            .promise();
        console.log(
            'New IdP enabled on appclient:',
            updateUserPoolClientResult
        );

        body = JSON.stringify({
            message: `IdP ${tenantId}-${idpname} created and idp enalbed on appclient - appClientParams.ClientName (${ClientId})`
        });
        return response(200, body);
    } catch (err) {
        console.log('Create new IdP error:', err);
        console.log('RequestId: ' + this.requestId);
        return response(err.statusCode, JSON.stringify({message: err.code}));
    }
};

const deleteIdp = async (tenantId, idpName) => {
    let deleteIdentityProviderParams = {
        UserPoolId,
        ProviderName: `${tenantId}-${idpName}`
    };
    console.log('deleteIdentityProviderParams:', deleteIdentityProviderParams);

    try {
        const deleteIdentityProviderResult = await client
            .deleteIdentityProvider(deleteIdentityProviderParams)
            .promise();

        return response(200, `IDP: ${tenantId}-${idpName} deleted`);
    } catch (err) {
        console.error('Delete identity provider failed with:', err);
        console.error('RequestId: ' + err.requestId);
        return response(err.statusCode, JSON.stringify({message: err.code}));
    }
};

const getIdp = async (tenantId, idpName) => {
    const idps = [];
    console.log('tenantId:', tenantId);
    let describeIdentityProviderParams = {
        UserPoolId,
        ProviderName: `${tenantId}-${idpName}`
    };
    console.log(
        'describeIdentityProviderResultParams:',
        describeIdentityProviderParams
    );

    try {
        const describeIdentityProviderResult = await client
            .describeIdentityProvider(describeIdentityProviderParams)
            .promise();
        if (
            describeIdentityProviderResult &&
            describeIdentityProviderResult.IdentityProvider
        ) {
            idps.push(describeIdentityProviderResult.IdentityProvider);
        }
    } catch (err) {
        console.error('Get identity provider failed with:', err);
        console.error('RequestId: ' + err.requestId);
        return response(err.statusCode, JSON.stringify({message: err.code}));
    }

    return response(200, JSON.stringify(idps));
};

const getAllIdps = async () => {
    const idps = [];

    let listIdentityProvidersParams = {
        UserPoolId,
        MaxResults: 60
    };

    do {
        try {
            const listIdentityProvidersResult = await client
                .listIdentityProviders(listIdentityProvidersParams)
                .promise();

            if (
                listIdentityProvidersResult &&
                listIdentityProvidersResult.Providers
            )
                idps.push(...listIdentityProvidersResult.Providers);
            listIdentityProvidersParams.NextToken =
                listIdentityProvidersResult.NextToken;
        } catch (err) {
            console.error('listIdentityProviders failed with:', err);
            console.error('RequestId: ' + err.requestId);
            return response(err.statusCode, JSON.stringify({message: err.code}));
        }
    } while (listIdentityProvidersParams.NextToken);

    return response(200, JSON.stringify(idps));
};

const getIdpsByTenantId = async (tenantId) => {
    const idps = [];

    let listIdentityProvidersParams = {
        UserPoolId,
        MaxResults: 60
    };

    do {
        try {
            const listIdentityProvidersResult = await client
                .listIdentityProviders(listIdentityProvidersParams)
                .promise();

            idps.push(...listIdentityProvidersResult);
            listIdentityProvidersParams.NextToken =
                listIdentityProvidersResult.NextToken;
        } catch (err) {
            console.error('listIdentityProviders failed with:', err);
            console.error('RequestId: ' + err.requestId);
            return response(err.statusCode, JSON.stringify({message: err.code}));
        }
    } while (listIdentityProvidersParams.NextToken);

    const body = JSON.stringify(
        idps.filter((idp) =>
            idp.name.substring(0, idp.name.indexOf('-') === tenantId)
        )
    );
    return response(200, JSON.stringify(idps));
};

exports.main = async (event) => {
    aws.config.logger = console;

    console.log('Received event:', JSON.stringify(event, null, 2));
    if (!event.path.startsWith(IDPSAPI_PATH)) {
        return response(400, `API idps Error, invalid path - ${event.path}`);
    }

    const method = event.httpMethod;
    const subPath = event.path.substring(IDPSAPI_PATH.length).trim();
    // retrieve requester's group
    const requesterGroups = retrieveRequesterGroup(event.requestContext);

    let requesterTenantId = null;
    if (requesterGroups.includes(TENANTADMIN)) {
        const filteredGroups = requesterGroups.filter((group) => {
            return (
                group.trim() !== BENEFITADMIN && group.trim() !== TENANTADMIN
            );
        });

        if (filteredGroups.length > 0) {
            requesterTenantId = filteredGroups[0];
        }
    }

    // get all idps
    if (method === 'GET' && (subPath === '' || subPath === '/')) {
        // check permission
        if (requesterGroups.includes(BENEFITADMIN)) {
            return getAllIdps();
        }

        if (requesterGroups.includes(TENANTADMIN)) {
            if (requesterTenantId) {
                return getIdpsByTenantId(requesterTenantId);
            }
            return response(400, "Didn't find tenantId on an tenant admin.");
        }
        return PERMISSION_DENY;
    }

    // extract sub path content FORMAT: TENANTID-IDPNAME
    const tempStr = subPath.startsWith('/') ? subPath.substring(1) : subPath;
    const fullIdpName =
        tempStr.indexOf('/') > -1
            ? tempStr.substring(0, tempStr.indexOf('/'))
            : tempStr;

    const hIdx = fullIdpName.indexOf('-');
    let tenantId = null;
    let idpName = null;

    if (hIdx > 0 && hIdx < fullIdpName.length - 1) {
        tenantId = fullIdpName.substring(0, hIdx);
        idpName = fullIdpName.substring(hIdx + 1);
    } else {
        return response(400, 'IdP Name malformat. Should be aaa-bbb.');
    }

    if (
        requesterGroups.includes(BENEFITADMIN) ||
        (requesterGroups.includes(TENANTADMIN) &&
            tenantId &&
            requesterTenantId === tenantId)
    ) {
        if (method === 'GET') {
            return getIdp(tenantId, idpName);
        }

        if (method === 'DELETE') {
            return deleteIdp(tenantId, idpName);
        }

        if (method === 'POST') {
            let payload = null;

            if (event.body) {
                try {
                    payload = JSON.parse(event.body);
                } catch (err) {
                    return INVAID_PARAMS;
                }
            }

            return createIdp(tenantId, idpName, payload);
        }
    }

    return PERMISSION_DENY;
};
