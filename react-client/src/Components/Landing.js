import React, { Component } from "react";
import Auth from "@aws-amplify/auth";

class Landing extends Component {
  logout = () => {
    Auth.signOut({ global: true }).then(() => {
      Auth.SignOut()
        .then(() => console.log("signedOut"))
        .catch((err) => console.log("error signOut:", err));
    });
  };
  render() {
    return (
      <div style={{ textAlign: "center" }}>
        {" "}
        Signed In <p />
        <button onClick={() => this.logout()}>Logout</button>
      </div>
    );
  }
}

export default Landing;
