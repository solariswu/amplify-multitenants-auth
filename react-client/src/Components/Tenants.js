import React from 'react';
import {Auth} from 'aws-amplify';
import axios from 'axios';

function Tenants(props) {
	const {tenants, url, updateTenants} = props;

    const deleteTenant = async (tenantId) => {
        try {
            const session = await Auth.currentSession();
            await axios.delete(
                `${url}/tenants/${tenantId}`,
                {
                    headers: {
                        Authorization: session.getIdToken().getJwtToken()
                    }
                }
            );
            updateTenants();
        }
        catch (err) {
            console.error ('delete tenant error:', err);
        }
    }

    return (
        tenants &&
        Array.isArray(tenants) && (
            <div>
                <p> Tenants</p>
                <ul>
                    {tenants.map((tenant) => (
                        <li key={tenant.GroupName}>{tenant.GroupName}
                        <button name='btnDeleteTenant' onClick={() => deleteTenant(tenant.GroupName)}>delete</button></li>
                    ))}
                </ul>
            </div>
        )
    );
}

export default Tenants;
