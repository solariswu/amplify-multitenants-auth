import React, {useRef, useCallback} from 'react';
import {Auth} from 'aws-amplify';
import axios from 'axios';

function CreateUser({url, tenants, updateUsers}) {
    const {current: formDatas} = useRef({});

    const handleUserChange = useCallback(
        (event) => {
            switch (event.target.type) {
                case 'checkbox':
                    formDatas[event.target.name] = event.target.checked;
                    break;
                default:
                    formDatas[event.target.name] = event.target.value;
                break;
            }
        },
        [formDatas]
    );

    const createUser = useCallback(async () => {
        console.log('formDatas:', formDatas);
        try {
            await axios.post(
                `${url}/users/${formDatas['username']}`,
                {
                    isadmin: formDatas['isAdmin'],
                    istrial: formDatas['isTrial'],
                    tenantid: formDatas['tenantId']
                },
                {
                    headers: {
                        Authorization: (await Auth.currentSession())
                            .getIdToken()
                            .getJwtToken()
                    }
                }
            );

            updateUsers();
        } catch (err) {
            console.error('create tenant error.', err);
        }
    }, [url, formDatas, updateUsers]);

    return (
        <section>
            {tenants && (
                <form
                    id='tenant'
                    onChange={handleUserChange}
                    onSubmit={(event) => event.preventDefault()}
                >
                    <label htmlFor='tenant'>Create User for Tenant:</label>
                    <select
                        name='tenantId'
                        defaultValue='Select tenant'
                        onChange={handleUserChange}
                    >
                        <option disabled>
                            Select tenant
                        </option>
                        {tenants.map((tenant) => (
                            <option
                                key={tenant.GroupName}
                                value={tenant.GroupName}
                            >
                                {tenant.GroupName}
                            </option>
                        ))}
                    </select>
                    <div>
                        <input type='checkbox' name='isAdmin' value='isAdmin' />
                        <label htmlFor='isAdmin'>Tenant Admin</label>
                        <input type='checkbox' name='isTrial' value='isTrial' />
                        <label htmlFor='isTrial'>Trial User</label>
                    </div>
                    <label htmlFor='username'>Username</label>
                    <input name='username' type='email' />
                    <input
                        type='button'
                        value='create user'
                        onClick={createUser}
                    />
                </form>
            )}
        </section>
    );
}

export default CreateUser;
