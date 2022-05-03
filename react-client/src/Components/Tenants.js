import React from 'react';

function Tenants(tenants) {
    return (
        tenants &&
        Array.isArray(tenants) && (
            <div>
                <p> Tenants</p>
                <ul>
                    {tenants.map((tenant) => (
                        <li key={tenant.GroupName}>{tenant.GroupName}</li>
                    ))}
                </ul>
            </div>
        )
    );
}

export default Tenants;
