import React from 'react';

function Tenants(props) {
	const {data} = props;
	console.log ('tenants in:', data);
    return (
        data &&
        Array.isArray(data) && (
            <div>
                <p> Tenants</p>
                <ul>
                    {data.map((tenant) => (
                        <li key={tenant.GroupName}>{tenant.GroupName}</li>
                    ))}
                </ul>
            </div>
        )
    );
}

export default Tenants;
