import React, {useRef, useCallback} from 'react';
import {Auth} from 'aws-amplify';
import axios from 'axios';

function CreateTenant({url}) {
    const {current: formDatas} = useRef({});

    const handleTenantChange = useCallback((event) => {
        formDatas[event.target.name] = event.target.value;
    }, []);

    const handleTenantSubmit = (event) => {
        event.preventDefault();
    };

    const createTenant = useCallback(async () => {
        try {
            const session = await Auth.currentSession();
            const idToken = session.getIdToken().getJwtToken();
            const createtenantResponse = await axios.post(
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

            console.log(createtenantResponse.data);
        } catch (err) {
            console.error('create tenant error.', err);
        }
    }, []);

    return (
        <div>
            <form onChange={handleTenantChange} onSubmit={handleTenantSubmit}>
                <label>create new tenant</label>
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
