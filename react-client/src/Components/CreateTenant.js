import React, {useRef, useCallback} from 'react';
import {Auth} from 'aws-amplify';
import axios from 'axios';

function CreateTenant({url, updateTenants}) {
    const {current: formDatas} = useRef({});

    const handleTenantChange = useCallback((event) => {
        formDatas[event.target.name] = event.target.value;
    }, [formDatas]);

    const handleTenantSubmit = (event) => {
        event.preventDefault();
    };

    const createTenant = useCallback(async () => {
        try {
            const session = await Auth.currentSession();
            const idToken = session.getIdToken().getJwtToken();
            await axios.post(
                `${url}/tenants/${formDatas['tenantid']}`,
                {
                    description: formDatas['description']
                },
                {
                    headers: {
                        Authorization: idToken
                    }
                }
            );

            updateTenants();
            
        } catch (err) {
            console.error('create tenant error.', err);
        }
    }, [url, formDatas, updateTenants]);

    return (
        <div>
            <div>Create New Tenant</div>
            <form onChange={handleTenantChange} onSubmit={handleTenantSubmit}>
                <label>
                    tenant id:
                    <input name='tenantid' type='text' />
                </label>
                <label>
                    tenant description:
                    <input name='description' type='text' />
                </label>

                <input type='submit' value='submit' onClick={createTenant} />
            </form>
        </div>
    );
}

export default CreateTenant;
