import React, {Component} from 'react';
import {Route, Switch, BrowserRouter} from 'react-router-dom';


import Ni from './components/Ni';
import Users from './components/Users';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Videos from "./components/Videos";
import Shows from "./components/Shows";
import ShowsView from "./components/ShowsView";
import Subscribe from "./components/Subscribe";

class App extends Component {

    render() {
        return (
            <BrowserRouter basename="/">
                <Switch>
                    <Route exact path={`/`} component={Login}/>
                    <Route exact path={`/users`} component={Users}/>
                    <Route exact path={`/videos`} component={Videos}/>
                    <Route exact path={`/shows`} component={Shows}/>
                    <Route exact path={`/shows/:id`} component={ShowsView}/>
                    <Route exact path={`/login`} component={Login}/>
                    <Route exact path={`/signup`} component={Signup}/>
                    <Route exact path={`/dashboard`} component={Dashboard}/>
                    <Route exact path={`/subscribe`} component={Subscribe}/>
                    <Route exact path={`/profile`} component={Profile}/>
                    <Route exact path={`/settings`} component={Settings}/>
                    <Route exact path={`/reports`} component={Reports}/>
                    <Route component={Ni}/>
                </Switch>
            </BrowserRouter>
        );
    }
}

export default App;

