import React, { Component } from "react";
import { Auth } from "@aws-amplify/auth";

class Home extends Component {
  login = () => {
    Auth.federatedSignIn();
  };

  render() {
    return (
      <div style={{ textAlign: "center" }}>
        Home <p />
        <button onClick={() => Auth.federatedSignIn()}>HostedUI Sign In</button>
      </div>
    );
  }
}

export default Home;
