import React, {useEffect, useState} from 'react';
import {Amplify, Auth, Hub} from 'aws-amplify';
import axios from 'axios';
import {Buffer} from 'buffer';

import CreateTenant from './Components/CreateTenant';
import Tenants from './Components/Tenants';
import Users from './Components/Users';

Amplify.configure({
    Auth: {
        region: 'us-east-1',
        userPoolId: 'us-east-1_fvZgQKdYX',
        userPoolWebClientId: '1cadat45u0c65mrlc053rded0h',
        oauth: {
            domain: 'multitenants.auth.us-east-1.amazoncognito.com',
            scope: ['profile', 'openid', 'aws.cognito.signin.user.admin'],
            redirectSignIn: 'https://multitenants.aws-amplify.dev',
            redirectSignOut: 'https://multitenants.aws-amplify.dev',
            responseType: 'code'
        }
    }
});

const Endpoint = 'https://gkcjj74wj8.execute-api.us-east-1.amazonaws.com/dev';

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
    // current user
    const [user, setUser] = useState(null);
    // all users in the pool
    const [users, setUsers] = useState(null);
    // tenants
    const [tenants, setTenants] = useState(null);
    // idps
    const [idps, setIdps] = useState(null);

    const updateTenants = async () => {
        const session = await Auth.currentSession();
        const tenantResponse = await axios.get(Endpoint + '/tenants', {
            headers: {
                Authorization: session.idToken.jwtToken
            }
        });
        setTenants(tenantResponse.data.Tenants);
    };

    const removeUser = (username) => {
        if (users && users.length > 0) {
            setUsers(users.filter((user) => user.Attributes['email'] !== username));
        }
    };

    useEffect(() => {
        const updateStats = async (data) => {
            setUser(decodeToken(data.signInUserSession.idToken.jwtToken));

            updateTenants();

            const idpResponse = await axios.get(Endpoint + '/idps', {
                headers: {
                    Authorization: data.signInUserSession.idToken.jwtToken
                }
            });

            setIdps(idpResponse.data.Idps);

            const usersResponse = await axios.get(Endpoint + '/users', {
                headers: {
                    Authorization: data.signInUserSession.idToken.jwtToken
                }
            });

            setUsers(usersResponse.data.Users);
        };

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
            {user && (
                <Tenants
                    tenants={tenants}
                    url={Endpoint}
                    updateTenants={updateTenants}
                />
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
            {user && (
                <CreateTenant url={Endpoint} updateTenants={updateTenants} />
            )}
            {user && (
                <Users users={users} url={Endpoint} removeUser={removeUser} />
            )}
        </div>
    );
}

export default App;
