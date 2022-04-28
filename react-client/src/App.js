import React, {useEffect, useState} from 'react';
import {Amplify, Auth, Hub} from 'aws-amplify';
import axios from 'axios';
import {Buffer} from 'buffer';

Amplify.configure({
    Auth: {
        region: 'us-east-1',
        userPoolId: 'us-east-1_9zjxahOUG',
        userPoolWebClientId: '736829q1p78pnj42qkm2tc9p3q',
        oauth: {
            domain: 'multitenants.auth.us-east-1.amazoncognito.com',
            scope: ['profile', 'openid', 'aws.cognito.signin.user.admin'],
            redirectSignIn: 'https://multitenants.aws-amplify.dev',
            redirectSignOut: 'https://multitenants.aws-amplify.dev',
            responseType: 'code'
        }
    }
});

const Endpoint = 'https://d1f37qcmre.execute-api.us-east-1.amazonaws.com/dev';

function decodeToken(token) {
    const tokens = token.split('.');
    try {
        const tokenObj = JSON.parse(
            Buffer.from(tokens[1], 'base64').toString()
        );
        return tokenObj;
    } catch (err) {
        console.error('json parse error:', err);
    }
}

function App() {
    // const [idToken, setIdToken] = useState(null);
    // const [accessToken, setAccessToken] = useState(null);
    const [user, setUser] = useState(null);
    const [tenants, setTenants] = useState(null);
    const [idps, setIdps] = useState(null);

    const updateStats = async (data) => {
        // setIdToken(data.signInUserSession.idToken.jwtToken);
        // setAccessToken(data.signInUserSession.accessToken.jwtToken);
        setUser(decodeToken(data.signInUserSession.idToken.jwtToken));

        const tenantResponse = await axios.get(Endpoint + '/tenants', {
            headers: {
                Authorization: data.signInUserSession.idToken.jwtToken
            }
        });
        
        setTenants(tenantResponse.data);

        const idpResponse = await axios.get(Endpoint + '/idps', {
            headers: {
                Authorization: data.signInUserSession.idToken.jwtToken
            }
        });

        setIdps(idpResponse.data.Providers);
    };

    useEffect(() => {
        const unsubscribe = Hub.listen('auth', ({payload: {event, data}}) => {
            switch (event) {
                case 'signIn':
                    updateStats(data);
                    break;
                case 'signOut':
                    setUser(null);
                    break;
                default:
                    break;
            }
        });

        Auth.currentAuthenticatedUser()
            .then((data) => {
                updateStats(data);
            })
            .catch(() => Auth.federatedSignIn());

        return unsubscribe;
    }, []);

    return (
        <div className='App'>
            {user ? (
                <div>
                    <p>Email: {user.email}</p>
                    <p>Tenants: {user['cognito:groups']}</p>
                    {user &&
                        user['cognito:groups'].includes('benefitflowAdmin') && (
                            <p>Super User</p>
                        )}
                    <button onClick={() => Auth.signOut()}>Sign Out </button>
                    <p>MFA management</p>
                    <pre>Auth.getPreferredMFA, Auth.setPreferredMFA</pre>
                </div>
            ) : (
                <div>Not signed in </div>
            )}
            {user && (!user.phone_number || !user.phone_number_verified) && (
                <div>
                    <p>The user's phone number has not been provided.</p>
                    <pre>Auth.updateUserAttribute()</pre>
                </div>
            )}
            {user && tenants && tenants.length && (
                <div>
                    <p> Tenants</p>
                    <ol>
                        {tenants.map((tenant) => (
                            <li key={tenant.GroupName}>{tenant.GroupName}</li>
                        ))}
                    </ol>
                </div>
            )}
            {user && idps && idps.length && (
                <div>
                    <p> Idps</p>
                    <ol>
                        {idps.map((idp) => (
                            <li key={idp.ProviderName}>{idp.ProviderName}</li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}

export default App;
