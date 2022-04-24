import React, { Component } from "react";
import Amplify from "@aws-amplify/core";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./Components/Home";
import Landing from "./Components/Landing";
import Logout from "./Components/Logout";


Amplify.configure({
  Auth: {
    region: "us-east-1",
    userPoolId: "us-east-1_9zjxahOUG",
    userPoolWebClientId: "5ltso2mop94g85ggv8djotd1i4",
    oauth: {
      domain: "multitenants.auth.us-east-1.amazoncognito.com",
      scope: ['profile', 'openid', 'aws.cognito.signin.user.admin'],
      redirectSignIn: "https://multitenants.aws-amplify.dev/landing",
      redirectSignOut: "https://multitenants.aws-amplify.dev/logout",
      responseType: "code", // or 'token', note that REFRESH token will only be generated when the responseType is code
    },
  },
});

class App extends Component {
  render() {
    Amplify.Logger.LOG_LEVEL = "VERBOSE";

    // console.log("Your process.env.PUBLIC_URL", process.env.PUBLIC_URL);

    return (
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <Routes>
          <Route path="/home" element={<Home/>} />
          <Route path="/landing" element={<Landing/>} />
          <Route path="/logout" element={<Logout/>} />
          <Route path="/" element={<Home/>} />
        </Routes>
      </BrowserRouter>
    );
  }
}

export default App;
