import React from 'react';
import {Auth} from 'aws-amplify';
import axios from 'axios';

function Users(props) {
    const {users, url, removeUser} = props;

    const deleteUser = async (username) => {
        try {
            const session = await Auth.currentSession();
            await axios.delete(`${url}/users/${username}`, {
                headers: {
                    Authorization: session.getIdToken().getJwtToken()
                }
            });
            removeUser(username);
        } catch (err) {
            console.error('delete user error:', err);
        }
    };

    if (users) {
        users.map((user) => {
            user.Attributes.map(
                (attribute) => {
					if (attribute.Name === 'email') {
						user.Email = attribute.Value;
					}
				}
            );
            console.log('filtered user:', user);
        });
    }

    return (
        users &&
        Array.isArray(users) && (
            <div>
                <p> Users</p>
                <ul>
                    {users.map((user) => (
                        <li key={user.Username}>
                            {
                                user.Email
                            }
                            <button
                                name='btnDeleteUser'
                                onClick={() => deleteUser(user.Username)}
                            >
                                delete
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )
    );
}

export default Users;
