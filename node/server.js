// Import required packages
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const constants = require('./src/config/constants');
const fileUpload = require('express-fileupload');
const mongoVideo = require('./src/mongo/video');
const mongoUser = require('./src/mongo/user');

/*
const mySqlVideo = require('./src/mysql/video');
const Joi = require('joi');
const user = require('./src/user');
const login = require('./src/login');
*/

app.use(
    express.static(__dirname + '/public'),
    fileUpload({
        createParentPath: true,
        limits: {fileSize: 50 * 1024 * 1024},
    }),
    bodyParser.urlencoded({extended: true}),
    bodyParser.json(),
    cors(),
    (req, res, next) => {
        // req.body.title = 'I changed it here in mw';
        // console.log('Inside middleware request body is : ', req);
        next();
    }
);

/*
app.get('/api/v1/logins', login.get);
app.delete('/api/v1/users/:id', user.delete);
app.put('/api/v1/users/:id', user.put); */

app.get('/api/v1/logins/:id', mongoUser.get);
app.get('/api/v1/login-with-id/:id', mongoUser.loginWithId);
app.get('/api/v1/logins', mongoUser.get);
app.post('/api/v1/logins', mongoUser.post);
app.delete('/api/v1/logins/:id', mongoUser.delete);
app.put('/api/v1/logins/:id', mongoUser.update);

app.get('/api/v1/generate', mongoVideo.generate);
app.get('/api/v1/remove', mongoVideo.remove);

app.get('/api/v1/shows',  mongoVideo.get);
app.post('/api/v1/shows', mongoVideo.post);
app.delete('/api/v1/shows/:id', mongoVideo.delete);
app.put('/api/v1/shows/:id', mongoVideo.update);

app.post('/api/v1/episodes', mongoVideo.postEpisode);
app.put('/api/v1/episodes/:id', mongoVideo.updateEpisode);
app.get('/api/v1/episodes', mongoVideo.getEpisode);
app.delete('/api/v1/episodes/:id', mongoVideo.deleteEpisode);

app.put('/api/v1/popularize/:id', mongoVideo.popularize);


app.listen(constants.port, () => console.log('Server started on port ' + constants.port));

// INSTALL on SERVER
// pm2 start server.js


