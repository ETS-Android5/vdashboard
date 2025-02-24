const appName = 'MY CHOICE';
// const serverIp = '10.42.0.1';
const serverIp = process.env.REACT_APP_serverIp ? process.env.REACT_APP_serverIp : 'mobile-server.softhem.se';

const apiServer = 'http://' + serverIp + ':8090';
const login = {
    NOT_LOGGED_IN: 0,
    LOGIN_STARTED: 1,
    LOGIN_SUCCESS: 2,
};

export {
    appName,
    apiServer,
    login
}


// BUILDS - https://docs.expo.io/versions/latest/distribution/building-standalone-apps/
// expo build:ios -t simulator
// expo build:android -t simulator
